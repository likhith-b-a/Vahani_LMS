import db from "../db.js";
import { createNotification } from "./notifications.js";
import { clearCachedResponse } from "./responseCache.js";

const activeEnrollmentStatuses = ["active", "completed", "uncompleted"];

const normalizeText = (value) => String(value || "").trim().toLowerCase();

export const normalizeRuleList = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => normalizeText(entry))
        .filter(Boolean),
    ),
  );
};

export const getProgrammeSelfEnrollmentEligibility = ({
  programme,
  user,
  enrolledCount = 0,
  now = new Date(),
}) => {
  if (!programme?.selfEnrollmentEnabled) {
    return { eligible: false, reason: "This programme is not open for self-enrollment." };
  }

  if (programme.selfEnrollmentOpensAt && now < new Date(programme.selfEnrollmentOpensAt)) {
    return {
      eligible: false,
      reason: `Enrollment requests open on ${new Date(programme.selfEnrollmentOpensAt).toLocaleString("en-IN")}.`,
    };
  }

  if (programme.selfEnrollmentClosesAt && now > new Date(programme.selfEnrollmentClosesAt)) {
    return {
      eligible: false,
      reason: "The enrollment request window for this programme has already closed.",
    };
  }

  const allowedBatches = normalizeRuleList(programme.selfEnrollmentAllowedBatches);
  if (allowedBatches.length > 0) {
    const userBatch = normalizeText(user?.batch);
    if (!userBatch || !allowedBatches.includes(userBatch)) {
      return {
        eligible: false,
        reason: "Your batch is not eligible for this programme.",
      };
    }
  }

  const allowedGenders = normalizeRuleList(programme.selfEnrollmentAllowedGenders);
  if (allowedGenders.length > 0) {
    const userGender = normalizeText(user?.gender);
    if (!userGender || !allowedGenders.includes(userGender)) {
      return {
        eligible: false,
        reason: "You do not meet this programme's gender eligibility criteria.",
      };
    }
  }

  if (
    programme.selfEnrollmentSeatLimit !== null &&
    programme.selfEnrollmentSeatLimit !== undefined &&
    enrolledCount >= programme.selfEnrollmentSeatLimit
  ) {
    return {
      eligible: false,
      reason: "All available seats have already been filled for this programme.",
    };
  }

  return { eligible: true, reason: "" };
};

export const processProgrammeEnrollmentRequests = async ({
  programmeId,
  actorId = null,
}) => {
  const programme = await db.programme.findUnique({
    where: {
      id: programmeId,
    },
    include: {
      enrollments: {
        where: {
          status: {
            in: activeEnrollmentStatuses,
          },
        },
        select: {
          userId: true,
        },
      },
      selfEnrollmentRequests: {
        where: {
          status: "pending",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              batch: true,
              gender: true,
            },
          },
        },
        orderBy: {
          requestedAt: "asc",
        },
      },
    },
  });

  if (!programme) {
    throw new Error("Programme not found");
  }

  let filledSeats = programme.enrollments.length;
  const seatLimit =
    programme.selfEnrollmentSeatLimit !== null &&
    programme.selfEnrollmentSeatLimit !== undefined
      ? programme.selfEnrollmentSeatLimit
      : null;

  const accepted = [];
  const rejected = [];

  for (const request of programme.selfEnrollmentRequests) {
    const eligibility = getProgrammeSelfEnrollmentEligibility({
      programme,
      user: request.user,
      enrolledCount: filledSeats,
    });

    if (!eligibility.eligible) {
      const decisionReason =
        eligibility.reason || "This request no longer meets the programme criteria.";

      await db.selfEnrollmentRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: "rejected",
          decidedAt: new Date(),
          decisionReason,
        },
      });

      await createNotification({
        type: "programme",
        title: `Enrollment request declined for ${programme.title}`,
        message: decisionReason,
        userIds: [request.userId],
        actorId,
        programmeId: programme.id,
        actionUrl: "/course-registration",
      });

      rejected.push({
        requestId: request.id,
        userId: request.userId,
        reason: decisionReason,
      });
      continue;
    }

    if (seatLimit !== null && filledSeats >= seatLimit) {
      const decisionReason =
        "Your request was received after all available seats had been filled.";

      await db.selfEnrollmentRequest.update({
        where: {
          id: request.id,
        },
        data: {
          status: "rejected",
          decidedAt: new Date(),
          decisionReason,
        },
      });

      await createNotification({
        type: "programme",
        title: `Enrollment request waitlisted out for ${programme.title}`,
        message: decisionReason,
        userIds: [request.userId],
        actorId,
        programmeId: programme.id,
        actionUrl: "/course-registration",
      });

      rejected.push({
        requestId: request.id,
        userId: request.userId,
        reason: decisionReason,
      });
      continue;
    }

    await db.enrollment.upsert({
      where: {
        userId_programmeId: {
          userId: request.userId,
          programmeId: programme.id,
        },
      },
      update: {
        status: "active",
      },
      create: {
        userId: request.userId,
        programmeId: programme.id,
        status: "active",
      },
    });

    await db.selfEnrollmentRequest.update({
      where: {
        id: request.id,
      },
      data: {
        status: "accepted",
        decidedAt: new Date(),
        decisionReason: "Seat allotted on first-come-first-served basis.",
      },
    });

    await createNotification({
      type: "programme",
      title: `Enrollment confirmed for ${programme.title}`,
      message: "Your request has been accepted and your seat is now confirmed.",
      userIds: [request.userId],
      actorId,
      programmeId: programme.id,
      actionUrl: `/my-programmes/${programme.id}`,
    });

    clearCachedResponse(`programmes:mine:${request.userId}`);
    clearCachedResponse(`programmes:schedule:${request.userId}`);
    clearCachedResponse(`programme:detail:${request.userId}:`);
    filledSeats += 1;
    accepted.push({
      requestId: request.id,
      userId: request.userId,
    });
  }

  clearCachedResponse("programmes:discover:");
  clearCachedResponse("programmes:mine:");
  clearCachedResponse("programmes:schedule:");
  clearCachedResponse("programme:detail:");
  clearCachedResponse("admin:");

  return {
    programmeId: programme.id,
    title: programme.title,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    accepted,
    rejected,
  };
};
