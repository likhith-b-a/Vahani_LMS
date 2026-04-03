import db from "../db.js";
import { logger } from "../utils/logger.js";
import { processProgrammeEnrollmentRequests } from "../utils/selfEnrollment.js";

let selfEnrollmentTimer = null;

const runSelfEnrollmentProcessing = async () => {
  const now = new Date();

  const programmes = await db.programme.findMany({
    where: {
      selfEnrollmentEnabled: true,
      selfEnrollmentClosesAt: {
        lte: now,
      },
      selfEnrollmentRequests: {
        some: {
          status: "pending",
        },
      },
    },
    select: {
      id: true,
      title: true,
    },
  });

  for (const programme of programmes) {
    try {
      const result = await processProgrammeEnrollmentRequests({
        programmeId: programme.id,
      });

      logger.info("Processed self-enrollment requests", {
        programmeId: programme.id,
        acceptedCount: result.acceptedCount,
        rejectedCount: result.rejectedCount,
      });
    } catch (error) {
      logger.error("Failed to process self-enrollment requests", {
        programmeId: programme.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
};

export const scheduleSelfEnrollmentProcessing = () => {
  if (selfEnrollmentTimer) {
    return;
  }

  const run = async () => {
    try {
      await runSelfEnrollmentProcessing();
    } finally {
      selfEnrollmentTimer = setTimeout(run, 15 * 60 * 1000);
    }
  };

  selfEnrollmentTimer = setTimeout(run, 15 * 1000);
};
