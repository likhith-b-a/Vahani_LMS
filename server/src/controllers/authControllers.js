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
import {
  clearCachedResponse,
  getCachedResponse,
  setCachedResponse,
} from "../utils/responseCache.js";
import { serializeAssignment } from "../utils/assignmentMetadata.js";
import { withProgrammeMetadataSync } from "../utils/programmeMetadataStore.js";

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

const generateAccessAndRefreshTokens = async (userOrId) => {
  const user =
    typeof userOrId === "string"
      ? await db.user.findUnique({
          where: { id: userOrId },
          select: {
            id: true,
            email: true,
            role: true,
            name: true,
          },
        })
      : userOrId;

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await db.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return { accessToken, refreshToken };
};

const warmAdminSummaryCache = async (userId) => {
  const cacheKey = `admin:summary:${userId}`;
  if (getCachedResponse(cacheKey)) {
    return;
  }

  const [
    userRoleCounts,
    programmeCount,
    assignmentCount,
    submissionStats,
    activeEnrollments,
    programmes,
  ] = await Promise.all([
    db.user.groupBy({
      by: ["role"],
      _count: {
        _all: true,
      },
    }),
    db.programme.count(),
    db.assignment.count(),
    db.submission.aggregate({
      _count: {
        _all: true,
        score: true,
      },
    }),
    db.enrollment.count({
      where: {
        status: "active",
      },
    }),
    db.programme.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        selfEnrollmentEnabled: true,
        programmeManagerId: true,
        programmeManager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            assignments: true,
            enrollments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
  ]);

  const roleCountMap = Object.fromEntries(
    userRoleCounts.map((entry) => [entry.role, entry._count._all]),
  );

  setCachedResponse(
    cacheKey,
    new ApiResponse(
      200,
      {
        stats: {
          totalUsers: Object.values(roleCountMap).reduce((sum, count) => sum + count, 0),
          scholars: roleCountMap.scholar || 0,
          programmeManagers: roleCountMap.programme_manager || 0,
          admins: roleCountMap.admin || 0,
          programmes: programmeCount,
          assignments: assignmentCount,
          submissions: submissionStats._count._all || 0,
          gradedSubmissions: submissionStats._count.score || 0,
          activeEnrollments,
        },
        programmes: programmes.map((programme) => ({
          id: programme.id,
          title: programme.title,
          description: programme.description,
          createdAt: programme.createdAt,
          selfEnrollmentEnabled: !!programme.selfEnrollmentEnabled,
          programmeManagerId: programme.programmeManagerId,
          programmeManager: programme.programmeManager,
          enrollmentsCount: programme._count.enrollments,
          assignmentsCount: programme._count.assignments,
        })),
      },
      "Admin summary fetched successfully",
    ),
    300_000,
  );
};

const warmAdminUsersCache = async (userId) => {
  const cacheKey = `admin:users:${userId}:all`;
  if (getCachedResponse(cacheKey)) {
    return;
  }

  const users = await db.user.findMany({
    include: {
      managedProgrammes: {
        select: {
          id: true,
          title: true,
        },
      },
      enrollments: {
        include: {
          programme: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      submissions: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  setCachedResponse(
    cacheKey,
    new ApiResponse(
      200,
      {
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          batch: user.batch,
          phoneNumber: user.phoneNumber,
          creditsEarned: user.creditsEarned,
          managedProgrammesCount: user.managedProgrammes?.length || 0,
          enrolledProgrammesCount: user.enrollments?.length || 0,
          submissionCount: user.submissions?.length || 0,
          programmes:
            user.managedProgrammes?.map((programme) => ({
              id: programme.id,
              title: programme.title,
            })) || [],
          enrollments:
            user.enrollments?.map((enrollment) => ({
              id: enrollment.id,
              status: enrollment.status,
              programme: {
                id: enrollment.programme.id,
                title: enrollment.programme.title,
              },
            })) || [],
        })),
      },
      "Users fetched successfully",
    ),
    60_000,
  );
};

const warmSentAnnouncementsCache = async (userId, role) => {
  const cacheKey = `announcements:${role}:${userId}`;
  if (getCachedResponse(cacheKey)) {
    return;
  }

  const announcements = await db.announcement.findMany({
    where: {
      createdById: userId,
    },
    select: {
      id: true,
      title: true,
      message: true,
      targetBatch: true,
      createdAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      recipients: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              batch: true,
            },
          },
        },
      },
      programme: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  setCachedResponse(
    cacheKey,
    new ApiResponse(
      200,
      {
        announcements,
      },
      "Announcements fetched successfully",
    ),
    60_000,
  );
};

const warmUserNotificationsCache = async (userId) => {
  const cacheKey = `notifications:${userId}`;
  if (getCachedResponse(cacheKey)) {
    return;
  }

  const recipients = await db.notificationRecipient.findMany({
    where: {
      userId,
    },
    select: {
      isRead: true,
      notificationId: true,
      notification: {
        select: {
          type: true,
          title: true,
          message: true,
          createdAt: true,
          programmeId: true,
          assignmentId: true,
          actionUrl: true,
          metadata: true,
        },
      },
    },
    orderBy: {
      notification: {
        createdAt: "desc",
      },
    },
    take: 20,
  });

  setCachedResponse(
    cacheKey,
    new ApiResponse(
      200,
      {
        notifications: recipients.map((recipient) => ({
          id: recipient.notificationId,
          type: recipient.notification.type.toUpperCase(),
          title: recipient.notification.title,
          message: recipient.notification.message,
          createdAt: recipient.notification.createdAt,
          programmeId: recipient.notification.programmeId,
          assignmentId: recipient.notification.assignmentId,
          actionLabel: recipient.notification.actionUrl ? "Open" : "",
          actionUrl: recipient.notification.actionUrl,
          metadata: recipient.notification.metadata,
          isRead: recipient.isRead,
        })),
      },
      "Notifications fetched successfully",
    ),
    60_000,
  );
};

const warmScholarCaches = async (userId) => {
  const profileCacheKey = `profile:${userId}`;
  if (!getCachedResponse(profileCacheKey)) {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        batch: true,
        phoneNumber: true,
        creditsEarned: true,
        enrollments: {
          select: {
            id: true,
            status: true,
            enrolledAt: true,
            programme: {
              select: {
                id: true,
                title: true,
                description: true,
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

    if (user) {
      setCachedResponse(
        profileCacheKey,
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
        300_000,
      );
    }
  }

  const [scheduleEnrollments, programmeEnrollments, enrolled, discoverProgrammes] =
    await Promise.all([
      db.enrollment.findMany({
        where: { userId },
        select: {
          status: true,
          programme: {
            select: {
              id: true,
              title: true,
              interactiveSessions: {
                select: {
                  id: true,
                  title: true,
                  scheduledAt: true,
                  attendances: {
                    where: { userId },
                    select: {
                      id: true,
                      status: true,
                      score: true,
                      markedAt: true,
                      userId: true,
                    },
                  },
                },
                orderBy: { scheduledAt: "asc" },
              },
            },
          },
        },
      }),
      db.enrollment.findMany({
        where: { userId },
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
              assignments: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  dueDate: true,
                  maxScore: true,
                  type: true,
                  acceptedFileTypes: true,
                  submissions: {
                    where: { userId },
                    select: {
                      id: true,
                      fileUrl: true,
                      score: true,
                      submittedAt: true,
                      assignmentId: true,
                      userId: true,
                    },
                  },
                },
              },
              interactiveSessions: {
                select: {
                  id: true,
                  title: true,
                  scheduledAt: true,
                  attendances: {
                    where: { userId },
                    select: {
                      id: true,
                      status: true,
                      score: true,
                      markedAt: true,
                      userId: true,
                    },
                  },
                },
                orderBy: { scheduledAt: "asc" },
              },
            },
          },
        },
      }),
      db.enrollment.findMany({
        where: { userId },
        select: { programmeId: true },
      }),
      db.programme.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          createdAt: true,
          selfEnrollmentEnabled: true,
          spotlightTitle: true,
          spotlightMessage: true,
          programmeManager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              assignments: true,
              enrollments: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

  setCachedResponse(
    `programmes:schedule:${userId}`,
    new ApiResponse(
      200,
      {
        programmes: scheduleEnrollments.map((enrollment) => ({
          id: enrollment.programme.id,
          title: enrollment.programme.title,
          status: enrollment.status,
          interactiveSessions: enrollment.programme.interactiveSessions,
        })),
      },
      "Programme schedule fetched successfully",
    ),
    60_000,
  );

  const programmes = programmeEnrollments.map((enrollment) => ({
    ...withProgrammeMetadataSync(enrollment.programme),
    assignments: enrollment.programme.assignments.map((assignment) =>
      serializeAssignment(assignment),
    ),
    interactiveSessions: enrollment.programme.interactiveSessions,
    status: enrollment.status,
    enrolledAt: enrollment.enrolledAt,
  }));

  setCachedResponse(
    `programmes:mine:${userId}`,
    new ApiResponse(
      200,
      { programmes },
      "programmes fetched successfully",
    ),
    60_000,
  );

  const enrolledProgrammeIds = new Set(enrolled.map((item) => item.programmeId));
  setCachedResponse(
    `programmes:discover:${userId}`,
    new ApiResponse(
      200,
      {
        programmes: discoverProgrammes
          .filter((programme) => programme.selfEnrollmentEnabled)
          .map((programme) => ({
            id: programme.id,
            title: programme.title,
            description: programme.description,
            createdAt: programme.createdAt,
            programmeManager: programme.programmeManager,
            selfEnrollmentEnabled: programme.selfEnrollmentEnabled,
            spotlightTitle: programme.spotlightTitle || "",
            spotlightMessage: programme.spotlightMessage || "",
            assignmentsCount: programme._count.assignments,
            scholarsCount: programme._count.enrollments,
            enrolled: enrolledProgrammeIds.has(programme.id),
          })),
      },
      "Discoverable programmes fetched successfully",
    ),
    60_000,
  );

  const assignments = await db.assignment.findMany({
    where: {
      programme: {
        is: {
          enrollments: {
            some: {
              userId,
            },
          },
        },
      },
    },
    include: {
      programme: {
        select: {
          id: true,
          title: true,
        },
      },
      submissions: {
        where: {
          userId,
        },
        select: {
          id: true,
          fileUrl: true,
          score: true,
          submittedAt: true,
        },
      },
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  setCachedResponse(
    `assignments:user:${userId}`,
    new ApiResponse(
      200,
      assignments.map((assignment) => ({
        ...serializeAssignment(assignment),
        submission: assignment.submissions[0] || null,
        status:
          assignment.submissions.length === 0
            ? "PENDING"
            : assignment.submissions[0]?.score !== null &&
                assignment.submissions[0]?.score !== undefined
              ? "GRADED"
              : "SUBMITTED",
      })),
      "Assignments fetched successfully",
    ),
    60_000,
  );
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

const requestChangePasswordOtp = asyncHandler(async (req, res) => {
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
    select: {
      id: true,
      email: true,
      password: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isValidPassword = await isPasswordCorrect(currentPassword, user.password);

  if (!isValidPassword) {
    throw new ApiError(400, "Current password is incorrect");
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await setPasswordResetOtp(user.email, {
    otpHash,
    expiresAt,
  });

  await sendMail(user.email, "Your Vahani LMS change password OTP", {
    otp,
    expiresInMinutes: 10,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "OTP sent successfully"));
});

const verifyChangePasswordOtp = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, otp } = req.body;

  if (!currentPassword || !newPassword || !otp) {
    throw new ApiError(400, "Current password, new password and OTP are required");
  }

  if (String(newPassword).length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters");
  }

  const user = await db.user.findUnique({
    where: {
      id: req.user.id,
    },
    select: {
      id: true,
      email: true,
      password: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isValidPassword = await isPasswordCorrect(currentPassword, user.password);

  if (!isValidPassword) {
    throw new ApiError(400, "Current password is incorrect");
  }

  const otpRecord = await getPasswordResetOtp(user.email);

  if (!otpRecord) {
    throw new ApiError(400, "OTP not found or expired");
  }

  if (new Date(otpRecord.expiresAt).getTime() < Date.now()) {
    await clearPasswordResetOtp(user.email);
    throw new ApiError(400, "OTP expired");
  }

  const isValidOtp = await bcrypt.compare(String(otp), otpRecord.otpHash);

  if (!isValidOtp) {
    throw new ApiError(400, "Invalid OTP");
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

  await clearPasswordResetOtp(user.email);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUserProfile = asyncHandler(async (req, res) => {
  const cacheKey = `profile:${req.user.id}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  if (req.user.role !== "scholar") {
    const response = new ApiResponse(
      200,
        {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          batch: null,
          gender: null,
          phoneNumber: null,
          creditsEarned: 0,
          enrollments: [],
        },
      "Profile fetched successfully",
    );

    setCachedResponse(cacheKey, response, 300_000);
      return res.status(200).json(response);
    }
  
    const user = await db.user.findUnique({
    where: {
      id: req.user.id,
    },
    select: {
      id: true,
        name: true,
        email: true,
        role: true,
        batch: true,
        gender: true,
        phoneNumber: true,
        creditsEarned: true,
      enrollments: {
        select: {
          id: true,
          status: true,
          enrolledAt: true,
          programme: {
            select: {
              id: true,
              title: true,
              description: true,
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

  const response = new ApiResponse(
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
  );

  setCachedResponse(cacheKey, response, 300_000);
  return res.status(200).json(response);
});

const updateCurrentUserProfile = asyncHandler(async (req, res) => {
  const { name, batch, gender, phoneNumber } = req.body;

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
        ...(gender !== undefined ? { gender: gender || null } : {}),
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
  clearCachedResponse(`profile:${req.user.id}`);

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

  const account = await db.user.findUnique({
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
    },
  });

  if (!account) {
    throw new ApiError(401, "User not found");
  }

  const isValid = await isPasswordCorrect(password, account.password);
  if (!isValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const scholarEnrollments =
    account.role === "scholar"
      ? await db.enrollment.findMany({
          where: {
            userId: account.id,
          },
          select: {
            id: true,
            status: true,
            programme: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        })
      : [];

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens({
    id: account.id,
    email: account.email,
    role: account.role,
    name: account.name,
  });
  const responseUser = {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    batch: account.batch,
    phoneNumber: account.phoneNumber,
    creditsEarned: account.creditsEarned,
    enrollments:
      account.role === "scholar"
        ? scholarEnrollments.map((e) => ({
            id: e.programme.id,
            ...e.programme,
            status: e.status,
          }))
        : [],
    accessToken,
    refreshToken,
  };

  const options = {
    ...getCookieOptions(),
  };

  setImmediate(async () => {
    try {
      await warmUserNotificationsCache(account.id);

      if (account.role === "admin") {
        await Promise.all([
          warmAdminSummaryCache(account.id),
          warmAdminUsersCache(account.id),
          warmSentAnnouncementsCache(account.id, "admin"),
        ]);
      }

      if (account.role === "programme_manager") {
        await warmSentAnnouncementsCache(account.id, "programme_manager");
      }

      if (account.role === "scholar") {
        await warmScholarCaches(account.id);
      }
    } catch {
      // Ignore background warm failures to keep login stable.
    }
  });

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: responseUser,
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
  requestChangePasswordOtp,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  signupUser,
  updateCurrentUserProfile,
  verifyChangePasswordOtp,
};
