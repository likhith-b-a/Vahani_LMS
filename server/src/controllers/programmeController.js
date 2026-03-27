import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import db from "../db.js";
import { serializeAssignment } from "../utils/assignmentMetadata.js";
import {
  withProgrammeMetadata,
} from "../utils/programmeMetadataStore.js";
import {
  createNotification,
  getProgrammeScholarIds,
} from "../utils/notifications.js";
import { uploadBufferToS3 } from "../utils/s3.js";

const getMyProgrammes = asyncHandler(async (req, res) => {
  const email = req?.user?.email;

  if (!email) {
    throw new ApiError(400, "Session timed out");
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const userData = await db.user.findUnique({
    where: { email },
    select: {
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
              assignments: {
                include: {
                  submissions: {
                    where: {
                      userId: user.id,
                    },
                  },
                },
              },
              interactiveSessions: {
                include: {
                  attendances: {
                    where: {
                      userId: user.id,
                    },
                  },
                },
                orderBy: {
                  scheduledAt: "asc",
                },
              },
            },
          },
        },
      },
    },
  });

  const programmes = await Promise.all(
    userData.enrollments.map(async (enrollment) => {
      const programme = await withProgrammeMetadata(enrollment.programme);
      return {
        ...programme,
        assignments: enrollment.programme.assignments.map((assignment) =>
          serializeAssignment(assignment),
        ),
        interactiveSessions: enrollment.programme.interactiveSessions,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
      };
    }),
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        programmes,
      },
      "programmes fetched successfully",
    ),
  );
});

const getProgrammeDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const programmeData = await db.programme.findUnique({
    where: { id },
    include: {
      programmeManager: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignments: {
        include: {
          submissions: {
            where: {
              userId: req.user.id,
            },
          },
        },
      },
      resources: {
        orderBy: {
          createdAt: "desc",
        },
      },
      interactiveSessions: {
        include: {
          attendances: {
            where: {
              userId: req.user.id,
            },
          },
        },
        orderBy: {
          scheduledAt: "asc",
        },
      },
    },
  });

  if (!programmeData) {
    throw new ApiError(400, "No such course found");
  }

  const programmeWithMetadata = await withProgrammeMetadata({
    ...programmeData,
    assignments: programmeData.assignments.map((assignment) =>
      serializeAssignment(assignment),
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
      programmeWithMetadata,
      "programmeData fetched successfully",
    ),
  );
});

const getManagedProgrammes = asyncHandler(async (req, res) => {
  const programmes = await db.programme.findMany({
    where: {
      programmeManagerId: req.user.id,
    },
    include: {
      programmeManager: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      enrollments: {
        include: {
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
      assignments: {
        include: {
          submissions: {
            include: {
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
        },
        orderBy: {
          dueDate: "asc",
        },
      },
      resources: {
        orderBy: {
          createdAt: "desc",
        },
      },
      interactiveSessions: {
        include: {
          attendances: {
            include: {
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
        },
        orderBy: {
          scheduledAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          programmes: await Promise.all(
            programmes.map(async (programme) =>
              withProgrammeMetadata({
                ...programme,
                assignments: programme.assignments.map((assignment) =>
                  serializeAssignment(assignment),
                ),
              }),
            ),
          ),
        },
        "Managed programmes fetched successfully",
      ),
    );
});

const createManagedInteractiveSession = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;
  const { title, description, scheduledAt, durationMinutes, meetingUrl, maxScore } = req.body;

  if (!programmeId || !title?.trim() || !scheduledAt) {
    throw new ApiError(400, "Programme, title and scheduled date are required");
  }

  const normalizedMaxScore =
    maxScore !== undefined && maxScore !== null ? Number(maxScore) : 0;

  if (Number.isNaN(normalizedMaxScore) || normalizedMaxScore < 0) {
    throw new ApiError(400, "Interactive session max score must be 0 or more");
  }

  const programme = await db.programme.findFirst({
    where: {
      id: programmeId,
      programmeManagerId: req.user.id,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!programme) {
    throw new ApiError(404, "Programme not found for this manager");
  }

  const session = await db.interactiveSession.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      scheduledAt: new Date(scheduledAt),
      durationMinutes:
        durationMinutes !== undefined && durationMinutes !== null
          ? Number(durationMinutes)
          : 60,
      maxScore: normalizedMaxScore,
      meetingUrl: meetingUrl?.trim() || null,
      programmeId,
      createdById: req.user.id,
    },
  });

  const scholarIds = await getProgrammeScholarIds(programmeId);
  await createNotification({
    type: "meeting",
    title: `Interactive session scheduled: ${session.title}`,
    message: `A live session has been scheduled on ${session.scheduledAt.toLocaleDateString("en-IN")}.`,
    userIds: scholarIds,
    actorId: req.user.id,
    programmeId,
    actionUrl: `/my-programmes/${programmeId}`,
    metadata: {
      interactiveSessionId: session.id,
      scheduledAt: session.scheduledAt,
    },
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        session,
      },
      "Interactive session created successfully",
    ),
  );
});

const markInteractiveSessionAttendance = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { attendance = [] } = req.body;

  if (!sessionId || !Array.isArray(attendance)) {
    throw new ApiError(400, "Session and attendance list are required");
  }

  const session = await db.interactiveSession.findFirst({
    where: {
      id: sessionId,
      programme: {
        is: {
          programmeManagerId: req.user.id,
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
    },
  });

  if (!session) {
    throw new ApiError(404, "Interactive session not found for this manager");
  }

  if (new Date(session.scheduledAt).getTime() > Date.now()) {
    throw new ApiError(400, "Attendance can only be marked after the session date");
  }

  const programmeEnrollments = await db.enrollment.findMany({
    where: {
      programmeId: session.programmeId,
      status: {
        in: ["active", "completed", "uncompleted"],
      },
    },
    select: {
      userId: true,
    },
  });

  const validUserIds = new Set(programmeEnrollments.map((entry) => entry.userId));

  await db.interactiveSessionAttendance.deleteMany({
    where: {
      interactiveSessionId: sessionId,
    },
  });

  const normalizedAttendance = attendance
    .filter((entry) => validUserIds.has(entry.userId))
    .map((entry) => {
      const status = entry.status === "absent" ? "absent" : "present";
      const numericScore =
        entry.score !== undefined && entry.score !== null && entry.score !== ""
          ? Number(entry.score)
          : status === "absent"
            ? 0
            : session.maxScore;

      if (Number.isNaN(numericScore) || numericScore < 0) {
        throw new ApiError(400, "Interactive session marks must be 0 or more");
      }

      if (numericScore > session.maxScore) {
        throw new ApiError(
          400,
          `Interactive session marks cannot exceed max score of ${session.maxScore}`,
        );
      }

      return {
        interactiveSessionId: sessionId,
        userId: entry.userId,
        status,
        score: numericScore,
        markedAt: new Date(),
      };
    });

  if (normalizedAttendance.length > 0) {
    await db.interactiveSessionAttendance.createMany({
      data: normalizedAttendance,
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        sessionId,
        markedCount: normalizedAttendance.length,
      },
      "Attendance updated successfully",
    ),
  );
});

const publishProgrammeResults = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;

  if (!programmeId) {
    throw new ApiError(400, "Programme ID is required");
  }

  const programme = await db.programme.findFirst({
    where: {
      id: programmeId,
      programmeManagerId: req.user.id,
    },
    include: {
      assignments: {
        select: {
          id: true,
          title: true,
          maxScore: true,
          submissions: {
            select: {
              userId: true,
              score: true,
            },
          },
        },
      },
      interactiveSessions: {
        select: {
          id: true,
          title: true,
          maxScore: true,
          attendances: {
            select: {
              userId: true,
              status: true,
              score: true,
            },
          },
        },
      },
      enrollments: {
        where: {
          status: {
            in: ["active", "completed", "uncompleted"],
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              creditsEarned: true,
            },
          },
        },
      },
    },
  });

  if (!programme) {
    throw new ApiError(404, "Programme not found for this manager");
  }

  const totalAssignmentMarks = programme.assignments.reduce(
    (sum, assignment) => sum + (assignment.maxScore || 0),
    0,
  );
  const totalSessionMarks = programme.interactiveSessions.reduce(
    (sum, session) => sum + (session.maxScore || 0),
    0,
  );
  const totalPossibleMarks = totalAssignmentMarks + totalSessionMarks;

  if (totalPossibleMarks <= 0) {
    throw new ApiError(
      400,
      "Add assignment or interactive session marks before publishing results",
    );
  }

  const publishedAt = new Date();
  const programmeCredits = programme.credits || 0;

  const results = await db.$transaction(async (tx) => {
    const publishedResults = [];

    for (const enrollment of programme.enrollments) {
      const assignmentScore = programme.assignments.reduce((sum, assignment) => {
        const submission = assignment.submissions.find(
          (entry) => entry.userId === enrollment.userId,
        );
        return sum + (submission?.score || 0);
      }, 0);

      const interactiveSessionScore = programme.interactiveSessions.reduce(
        (sum, session) => {
          const attendance = session.attendances.find(
            (entry) => entry.userId === enrollment.userId,
          );
          return sum + (attendance?.score || 0);
        },
        0,
      );

      const totalObtainedMarks = assignmentScore + interactiveSessionScore;
      const percentage = Number(
        ((totalObtainedMarks / totalPossibleMarks) * 100).toFixed(2),
      );
      const passed = percentage >= 40;
      const nextStatus = passed ? "completed" : "uncompleted";
      const nextCreditsAwarded = passed ? programmeCredits : 0;
      const creditDelta = nextCreditsAwarded - (enrollment.creditsAwarded || 0);

      await tx.enrollment.update({
        where: {
          id: enrollment.id,
        },
        data: {
          status: nextStatus,
          progressPercent: Math.max(0, Math.min(100, Math.round(percentage))),
          creditsAwarded: nextCreditsAwarded,
          completedAt: passed ? publishedAt : null,
          lastActivityAt: publishedAt,
        },
      });

      if (creditDelta !== 0) {
        await tx.user.update({
          where: {
            id: enrollment.userId,
          },
          data: {
            creditsEarned: {
              increment: creditDelta,
            },
          },
        });
      }

      publishedResults.push({
        userId: enrollment.userId,
        scholarName: enrollment.user.name,
        score: totalObtainedMarks,
        totalPossibleMarks,
        percentage,
        status: nextStatus,
        creditsAwarded: nextCreditsAwarded,
      });
    }

    await tx.programme.update({
      where: {
        id: programmeId,
      },
      data: {
        resultsPublishedAt: publishedAt,
      },
    });

    return publishedResults;
  });

  await Promise.all(
    results.map((result) =>
      createNotification({
        type: "grade",
        title: `Programme results published for ${programme.title}`,
        message:
          result.status === "completed"
            ? `You passed with ${result.percentage}%. ${result.creditsAwarded} credits have been added to your profile.`
            : `You scored ${result.percentage}%. Your programme status is now uncompleted.`,
        userIds: [result.userId],
        actorId: req.user.id,
        programmeId,
        actionUrl: `/my-programmes/${programmeId}`,
        metadata: {
          totalObtainedMarks: result.score,
          totalPossibleMarks: result.totalPossibleMarks,
          percentage: result.percentage,
          status: result.status,
          creditsAwarded: result.creditsAwarded,
        },
      }),
    ),
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        programmeId,
        publishedAt,
        results,
      },
      "Programme results published successfully",
    ),
  );
});

const getManagedProgrammeReport = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;

  if (!programmeId) {
    throw new ApiError(400, "Programme ID is required");
  }

  const programme = await db.programme.findFirst({
    where: {
      id: programmeId,
      programmeManagerId: req.user.id,
    },
    include: {
      enrollments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              batch: true,
              creditsEarned: true,
            },
          },
        },
        orderBy: {
          enrolledAt: "asc",
        },
      },
      assignments: {
        include: {
          submissions: {
            select: {
              userId: true,
              score: true,
              submittedAt: true,
            },
          },
        },
        orderBy: {
          dueDate: "asc",
        },
      },
      interactiveSessions: {
        include: {
          attendances: {
            select: {
              userId: true,
              status: true,
              score: true,
            },
          },
        },
        orderBy: {
          scheduledAt: "asc",
        },
      },
    },
  });

  if (!programme) {
    throw new ApiError(404, "Programme not found for this manager");
  }

  const rows = programme.enrollments.map((enrollment) => {
    const fixedColumns = {
      userId: enrollment.user.id,
      name: enrollment.user.name,
      email: enrollment.user.email,
      phoneNumber: enrollment.user.phoneNumber || "",
      batch: enrollment.user.batch || "",
      programmeStatus: enrollment.status,
      creditsEarned: enrollment.user.creditsEarned,
    };

    const assignmentColumns = Object.fromEntries(
      programme.assignments.map((assignment) => {
        const submission = assignment.submissions.find(
          (entry) => entry.userId === enrollment.userId,
        );
        const value =
          !submission
            ? "Not submitted"
            : submission.score === null || submission.score === undefined
              ? "Under evaluation"
              : `${submission.score}/${assignment.maxScore ?? ""}`;
        return [`Assignment: ${assignment.title}`, value];
      }),
    );

    const sessionColumns = Object.fromEntries(
      programme.interactiveSessions.map((session) => {
        const attendance = session.attendances.find(
          (entry) => entry.userId === enrollment.userId,
        );
        const value = !attendance
          ? new Date(session.scheduledAt).getTime() > Date.now()
            ? "Upcoming"
            : "Not marked"
          : `${attendance.status === "absent" ? "Absent" : "Present"} - ${attendance.score ?? 0}/${session.maxScore ?? 0}`;
        return [`Session: ${session.title}`, value];
      }),
    );

    return {
      ...fixedColumns,
      ...assignmentColumns,
      ...sessionColumns,
    };
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        type: "programme_manager",
        generatedAt: new Date().toISOString(),
        programme: {
          id: programme.id,
          title: programme.title,
        },
        rows,
      },
      "Programme report generated successfully",
    ),
  );
});

const getDiscoverableProgrammes = asyncHandler(async (req, res) => {
  const enrolled = await db.enrollment.findMany({
    where: {
      userId: req.user.id,
    },
    select: {
      programmeId: true,
    },
  });

  const enrolledProgrammeIds = new Set(enrolled.map((item) => item.programmeId));
  const programmes = await db.programme.findMany({
    include: {
      programmeManager: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      enrollments: {
        select: {
          id: true,
        },
      },
      assignments: {
        include: {
          submissions: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const discoverableProgrammes = programmes
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
      assignmentsCount: programme.assignments.length,
      scholarsCount: programme.enrollments.length,
      enrolled: enrolledProgrammeIds.has(programme.id),
    }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        programmes: discoverableProgrammes,
      },
      "Discoverable programmes fetched successfully",
    ),
  );
});

const getWishlistProgrammeCatalog = asyncHandler(async (req, res) => {
  const [programmes, wishlist, enrollments] = await Promise.all([
    db.programme.findMany({
      include: {
        programmeManager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        title: "asc",
      },
    }),
    db.programmeWishlist.findMany({
      where: {
        userId: req.user.id,
      },
      select: {
        programmeId: true,
      },
    }),
    db.enrollment.findMany({
      where: {
        userId: req.user.id,
      },
      select: {
        programmeId: true,
      },
    }),
  ]);

  const wishedIds = new Set(wishlist.map((entry) => entry.programmeId));
  const enrolledIds = new Set(enrollments.map((entry) => entry.programmeId));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        programmes: programmes.map((programme) => ({
          id: programme.id,
          title: programme.title,
          description: programme.description,
          credits: programme.credits,
          selfEnrollmentEnabled: programme.selfEnrollmentEnabled,
          spotlightTitle: programme.spotlightTitle || "",
          spotlightMessage: programme.spotlightMessage || "",
          programmeManager: programme.programmeManager,
          enrolled: enrolledIds.has(programme.id),
          wished: wishedIds.has(programme.id),
        })),
      },
      "Wishlist catalogue fetched successfully",
    ),
  );
});

const selfEnrollInProgramme = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;

  if (!programmeId) {
    throw new ApiError(400, "Programme ID is required");
  }

  const programme = await db.programme.findUnique({
    where: {
      id: programmeId,
    },
  });

  if (!programme) {
    throw new ApiError(404, "Programme not found");
  }

  if (!programme.selfEnrollmentEnabled) {
    throw new ApiError(403, "This programme is not open for self-enrollment");
  }

  const enrollment = await db.enrollment.upsert({
    where: {
      userId_programmeId: {
        userId: req.user.id,
        programmeId,
      },
    },
    update: {
      status: "active",
    },
    create: {
      userId: req.user.id,
      programmeId,
      status: "active",
    },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        enrollment,
      },
      "Programme registration completed successfully",
    ),
  );
});

const addManagedProgrammeResource = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;
  const { title, url, description, resourceType } = req.body;

  if (!programmeId || !title) {
    throw new ApiError(400, "Programme and title are required");
  }

  const programme = await db.programme.findFirst({
    where: {
      id: programmeId,
      programmeManagerId: req.user.id,
    },
  });

  if (!programme) {
    throw new ApiError(404, "Programme not found for this manager");
  }

  let normalizedUrl = typeof url === "string" ? url.trim() : "";
  let fileUrl = null;

  if (req.file) {
    const uploadedFile = await uploadBufferToS3({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      folder: `resources/${programmeId}`,
    });

    normalizedUrl = uploadedFile.url;
    fileUrl = uploadedFile.url;
  }

  if (!normalizedUrl) {
    throw new ApiError(400, "Provide either a resource URL or upload a file");
  }

  const resource = await db.programmeResource.create({
    data: {
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      url: normalizedUrl,
      fileUrl,
      resourceType: resourceType || "study_material",
      programmeId,
      createdById: req.user.id,
    },
  });

  const scholarIds = await getProgrammeScholarIds(programmeId);
  await createNotification({
    type: "resource",
    title: `New resource in ${programme.title}`,
    message: resource.title,
    userIds: scholarIds,
    actorId: req.user.id,
    programmeId,
    actionUrl: `/my-programmes/${programmeId}`,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        resource,
      },
      "Programme resource added successfully",
    ),
  );
});

const addManagedProgrammeMeetingLink = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;
  const { title, url } = req.body;

  if (!programmeId || !title || !url) {
    throw new ApiError(400, "Programme, title and url are required");
  }

  const programme = await db.programme.findFirst({
    where: {
      id: programmeId,
      programmeManagerId: req.user.id,
    },
  });

  if (!programme) {
    throw new ApiError(404, "Programme not found for this manager");
  }

  const meetingLink = await db.programmeResource.create({
    data: {
      title: String(title).trim(),
      url: String(url).trim(),
      resourceType: "meeting_link",
      programmeId,
      createdById: req.user.id,
    },
  });

  const scholarIds = await getProgrammeScholarIds(programmeId);
  await createNotification({
    type: "meeting",
    title: `New meeting link in ${programme.title}`,
    message: meetingLink.title,
    userIds: scholarIds,
    actorId: req.user.id,
    programmeId,
    actionUrl: `/my-programmes/${programmeId}`,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        meetingLink,
      },
      "Programme meeting link added successfully",
    ),
  );
});

export {
  addManagedProgrammeMeetingLink,
  addManagedProgrammeResource,
  createManagedInteractiveSession,
  getDiscoverableProgrammes,
  getManagedProgrammes,
  getManagedProgrammeReport,
  getMyProgrammes,
  getProgrammeDetail,
  getWishlistProgrammeCatalog,
  markInteractiveSessionAttendance,
  publishProgrammeResults,
  selfEnrollInProgramme,
};
