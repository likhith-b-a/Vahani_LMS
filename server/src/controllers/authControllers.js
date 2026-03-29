import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import db from "../db.js";
import { sendMail } from "../utils/sendMail.js";
import {
  clearPasswordResetOtp,
  getPasswordResetOtp,
  setPasswordResetOtp,
} from "../utils/passwordResetStore.js";

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  };
};

const isPasswordCorrect = async (password, hashedPassword) => {
  if (!hashedPassword) {
    return false;
  }

  // if (password === hashedPassword) {
  //   return true;
  // }

  return bcrypt.compare(password, hashedPassword);
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "1d" },
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};

const generateAccessAndRefreshTokens = async (userId) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
    },
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await db.user.update({
    where: { id: userId },
    data: { refreshToken },
  });

  return { accessToken, refreshToken };
};

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "No refresh token");
  }

  let decoded;

  try {
    decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await db.user.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      refreshToken: true,
      email: true,
      role: true,
      name: true,
    },
  });

  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token expired or reused");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user.id,
  );

  const options = getCookieOptions();

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, { accessToken }, "Access token refreshed"));
});

/* ---------------- LOGOUT ---------------- */

const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  await db.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });

  const options = getCookieOptions();

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

const requestPasswordResetOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await setPasswordResetOtp(normalizedEmail, {
    otpHash,
    expiresAt,
  });

  await sendMail(normalizedEmail, "Your Vahani LMS reset OTP", {
    otp,
    expiresInMinutes: 10,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "OTP sent successfully"));
});

const resetPasswordWithOtp = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    throw new ApiError(400, "Email, OTP and new password are required");
  }

  if (String(newPassword).length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const otpRecord = await getPasswordResetOtp(normalizedEmail);

  if (!otpRecord) {
    throw new ApiError(400, "OTP not found or expired");
  }

  if (new Date(otpRecord.expiresAt).getTime() < Date.now()) {
    await clearPasswordResetOtp(normalizedEmail);
    throw new ApiError(400, "OTP expired");
  }

  const isValidOtp = await bcrypt.compare(String(otp), otpRecord.otpHash);

  if (!isValidOtp) {
    throw new ApiError(400, "Invalid OTP");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: {
      email: normalizedEmail,
    },
    data: {
      password: hashedPassword,
      refreshToken: null,
    },
  });

  await clearPasswordResetOtp(normalizedEmail);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }

  if (String(newPassword).length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters");
  }

  const user = await db.user.findUnique({
    where: {
      id: req.user.id,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isValidPassword = await isPasswordCorrect(currentPassword, user.password);

  if (!isValidPassword) {
    throw new ApiError(400, "Current password is incorrect");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      password: hashedPassword,
      refreshToken: null,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUserProfile = asyncHandler(async (req, res) => {
  const user = await db.user.findUnique({
    where: {
      id: req.user.id,
    },
    include: {
      enrollments: {
        include: {
          programme: {
            include: {
              programmeManager: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  delete user.password;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...user,
        enrollments: user.enrollments.map((enrollment) => ({
          ...enrollment.programme,
          enrollmentId: enrollment.id,
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt,
        })),
      },
      "Profile fetched successfully",
    ),
  );
});

const updateCurrentUserProfile = asyncHandler(async (req, res) => {
  const { name, batch, phoneNumber } = req.body;

  if (!name || !String(name).trim()) {
    throw new ApiError(400, "Name is required");
  }

  const updatedUser = await db.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      name: String(name).trim(),
      ...(batch !== undefined ? { batch: batch || null } : {}),
      ...(phoneNumber !== undefined ? { phoneNumber: phoneNumber || null } : {}),
    },
    include: {
      enrollments: {
        include: {
          programme: {
            include: {
              programmeManager: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  delete updatedUser.password;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...updatedUser,
        enrollments: updatedUser.enrollments.map((enrollment) => ({
          ...enrollment.programme,
          enrollmentId: enrollment.id,
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt,
        })),
      },
      "Profile updated successfully",
    ),
  );
});

const signupUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await db.user.findUnique({
    where: { email: email },
  });
  if (existingUser) {
    throw new ApiError(400, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });
  const createdUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password required");
  }

  let user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      password: true,
      batch: true,
      phoneNumber: true,
      creditsEarned: true,
      enrollments: {
        include: {
          programme: {
            select: {
              id: true,
              title: true,
              description: true,
              createdAt: true,
              programmeManagerId: true,
              programmeManager: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(401, "User not found");
  }
  const isValid = await isPasswordCorrect(password, user.password);
  if (!isValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user.id,
  );
  user.enrollments = user.enrollments.map((e) => ({
    ...e.programme,
    status: e.status,
  }));
  delete user.password;
  user.accessToken = accessToken;

  const options = {
    ...getCookieOptions(),
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: user,
        },
        "User logged in successfully",
      ),
    );
});

export {
  changePassword,
  getCurrentUserProfile,
  loginUser,
  logoutUser,
  refreshAccessToken,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  signupUser,
  updateCurrentUserProfile,
};
