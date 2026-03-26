import db from "../db.js";

const cleanupExpiredOtps = async () => {
  await db.passwordResetOtp.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
};

const setPasswordResetOtp = async (email, otpRecord) => {
  await cleanupExpiredOtps();
  await db.passwordResetOtp.upsert({
    where: {
      email: email.toLowerCase(),
    },
    update: {
      otpHash: otpRecord.otpHash,
      expiresAt: new Date(otpRecord.expiresAt),
    },
    create: {
      email: email.toLowerCase(),
      otpHash: otpRecord.otpHash,
      expiresAt: new Date(otpRecord.expiresAt),
    },
  });
};

const getPasswordResetOtp = async (email) => {
  await cleanupExpiredOtps();
  return db.passwordResetOtp.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  });
};

const clearPasswordResetOtp = async (email) => {
  await db.passwordResetOtp.deleteMany({
    where: {
      email: email.toLowerCase(),
    },
  });
};

export {
  clearPasswordResetOtp,
  getPasswordResetOtp,
  setPasswordResetOtp,
};
