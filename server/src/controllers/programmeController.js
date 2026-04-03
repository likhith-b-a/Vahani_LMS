import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import XLSX from "xlsx";
import db from "../db.js";
import { serializeAssignment } from "../utils/assignmentMetadata.js";
import {
  withProgrammeMetadata,
  withProgrammeMetadataSync,
} from "../utils/programmeMetadataStore.js";
import {
  clearCachedResponse,
  getCachedResponse,
  setCachedResponse,
} from "../utils/responseCache.js";
import {
  createNotification,
  getProgrammeScholarIds,
} from "../utils/notifications.js";
import {
  getProgrammeSelfEnrollmentEligibility,
  processProgrammeEnrollmentRequests,
} from "../utils/selfEnrollment.js";
import { uploadBufferToS3 } from "../utils/s3.js";

const getMyProgrammes = asyncHandler(async (req, res) => {
  const userId = req?.user?.id;

  if (!userId) {
    throw new ApiError(400, "Session timed out");
  }

  const cacheKey = `programmes:mine:${userId}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  const enrollments = await db.enrollment.findMany({
    where: {
      userId,
    },
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
                where: {
                  userId,
                },
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
              description: true,
              scheduledAt: true,
              durationMinutes: true,
              maxScore: true,
              meetingUrl: true,
              attendances: {
                where: {
                  userId,
                },
                select: {
                  id: true,
                  status: true,
                  score: true,
                  markedAt: true,
                  userId: true,
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
  });

  const programmes = enrollments.map((enrollment) => ({
    ...withProgrammeMetadataSync(enrollment.programme),
    assignments: enrollment.programme.assignments.map((assignment) =>
      serializeAssignment(assignment),
    ),
    interactiveSessions: enrollment.programme.interactiveSessions,
    status: enrollment.status,
    enrolledAt: enrollment.enrolledAt,
  }));

  const response = new ApiResponse(
    200,
    {
      programmes,
    },
    "programmes fetched successfully",
  );

  setCachedResponse(cacheKey, response, 60_000);

  const firstProgrammeId = programmes[0]?.id;
  if (firstProgrammeId) {
    setImmediate(async () => {
      const detailCacheKey = `programme:detail:${userId}:${firstProgrammeId}`;
      if (getCachedResponse(detailCacheKey)) {
        return;
      }

      try {
        const programmeData = await db.programme.findUnique({
          where: { id: firstProgrammeId },
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
            },
            resources: {
              select: {
                id: true,
                title: true,
                description: true,
                resourceType: true,
                url: true,
                fileUrl: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            },
            interactiveSessions: {
              include: {
                attendances: {
                  where: {
                    userId,
                  },
                  select: {
                    id: true,
                    status: true,
                    score: true,
                    markedAt: true,
                    userId: true,
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
          return;
        }

        const programmeWithMetadata = withProgrammeMetadataSync({
          ...programmeData,
          assignments: programmeData.assignments.map((assignment) =>
            serializeAssignment(assignment),
          ),
        });

        setCachedResponse(
          detailCacheKey,
          new ApiResponse(
            200,
            programmeWithMetadata,
            "programmeData fetched successfully",
          ),
          60_000,
        );
      } catch {
        // Ignore background detail warm failures.
      }
    });
  }
  return res.status(200).json(response);
});

const getMyProgrammeSchedule = asyncHandler(async (req, res) => {
  const userId = req?.user?.id;

  if (!userId) {
    throw new ApiError(400, "Session timed out");
  }

  const cacheKey = `programmes:schedule:${userId}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  const enrollments = await db.enrollment.findMany({
    where: {
      userId,
    },
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
                where: {
                  userId,
                },
                select: {
                  id: true,
                  status: true,
                  score: true,
                  markedAt: true,
                  userId: true,
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
  });

  const response = new ApiResponse(
    200,
    {
      programmes: enrollments.map((enrollment) => ({
        id: enrollment.programme.id,
        title: enrollment.programme.title,
        status: enrollment.status,
        interactiveSessions: enrollment.programme.interactiveSessions,
      })),
    },
    "Programme schedule fetched successfully",
  );

  setCachedResponse(cacheKey, response, 60_000);
  return res.status(200).json(response);
});

const getProgrammeDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cacheKey = `programme:detail:${req.user.id}:${id}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

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
            select: {
              id: true,
              fileUrl: true,
              score: true,
              submittedAt: true,
            },
          },
        },
      },
      resources: {
        select: {
          id: true,
          title: true,
          description: true,
          resourceType: true,
          url: true,
          fileUrl: true,
          createdAt: true,
        },
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
            select: {
              id: true,
              status: true,
              score: true,
              markedAt: true,
              userId: true,
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

  const programmeWithMetadata = withProgrammeMetadataSync({
    ...programmeData,
    assignments: programmeData.assignments.map((assignment) =>
      serializeAssignment(assignment),
    ),
  });

  const response = new ApiResponse(
    200,
    programmeWithMetadata,
    "programmeData fetched successfully",
  );

  setCachedResponse(cacheKey, response, 60_000);
  return res.status(200).json(response);
});

const getManagedProgrammes = asyncHandler(async (req, res) => {
  const cacheKey = `programmes:managed:${req.user.id}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  const programmes = await db.programme.findMany({
    where: {
      programmeManagerId: req.user.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      resultsPublishedAt: true,
      _count: {
        select: {
          enrollments: true,
          assignments: true,
          interactiveSessions: true,
          resources: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const response = new ApiResponse(
    200,
    {
      programmes: programmes.map((programme) => ({
        id: programme.id,
        title: programme.title,
        description: programme.description,
        createdAt: programme.createdAt,
        resultsPublishedAt: programme.resultsPublishedAt,
        scholarsCount: programme._count.enrollments,
        assignmentsCount: programme._count.assignments,
        interactiveSessionsCount: programme._count.interactiveSessions,
        resourcesCount: programme._count.resources,
        meetingsCount: 0,
      })),
    },
    "Managed programmes fetched successfully",
  );

  setCachedResponse(cacheKey, response, 60_000);
  return res.status(200).json(response);
});

const getManagedProgrammeDetail = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;
  const cacheKey = `programmes:managed:detail:${req.user.id}:${programmeId}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  const programme = await db.programme.findFirst({
    where: {
      id: programmeId,
      programmeManagerId: req.user.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      resultsPublishedAt: true,
      selfEnrollmentEnabled: true,
      spotlightTitle: true,
      spotlightMessage: true,
      programmeManagerId: true,
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
          status: true,
          enrolledAt: true,
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
        select: {
          id: true,
          title: true,
          description: true,
          dueDate: true,
          maxScore: true,
          type: true,
          acceptedFileTypes: true,
          submissions: {
            select: {
              id: true,
              userId: true,
              score: true,
              submittedAt: true,
              fileUrl: true,
            },
          },
        },
        orderBy: {
          dueDate: "asc",
        },
      },
      resources: {
        select: {
          id: true,
          title: true,
          description: true,
          resourceType: true,
          url: true,
          fileUrl: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      interactiveSessions: {
        select: {
          id: true,
          title: true,
          description: true,
          scheduledAt: true,
          durationMinutes: true,
          maxScore: true,
          meetingUrl: true,
          attendances: {
            select: {
              id: true,
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

  const response = new ApiResponse(
    200,
    {
      programme: withProgrammeMetadataSync({
        ...programme,
        assignments: programme.assignments.map((assignment) =>
          serializeAssignment(assignment),
        ),
      }),
    },
    "Managed programme detail fetched successfully",
  );

  setCachedResponse(cacheKey, response, 60_000);
  return res.status(200).json(response);
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
  clearCachedResponse(`programmes:managed:${req.user.id}`);
  clearCachedResponse("programmes:managed:detail:");
  clearCachedResponse("programmes:mine:");
  clearCachedResponse("programmes:schedule:");
  clearCachedResponse("programme:detail:");
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

const updateManagedInteractiveSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { title, description, scheduledAt, durationMinutes, meetingUrl, maxScore } = req.body;

  if (!sessionId) {
    throw new ApiError(400, "Interactive session ID is required");
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
    select: {
      id: true,
      programmeId: true,
      maxScore: true,
    },
  });

  if (!session) {
    throw new ApiError(404, "Interactive session not found for this manager");
  }

  const normalizedMaxScore =
    maxScore !== undefined && maxScore !== null && maxScore !== ""
      ? Number(maxScore)
      : session.maxScore;

  if (Number.isNaN(normalizedMaxScore) || normalizedMaxScore < 0) {
    throw new ApiError(400, "Interactive session max score must be 0 or more");
  }

  const updatedSession = await db.interactiveSession.update({
    where: {
      id: sessionId,
    },
    data: {
      ...(title !== undefined ? { title: String(title).trim() } : {}),
      ...(description !== undefined
        ? { description: String(description || "").trim() || null }
        : {}),
      ...(scheduledAt !== undefined
        ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined }
        : {}),
      ...(durationMinutes !== undefined && durationMinutes !== null && durationMinutes !== ""
        ? { durationMinutes: Number(durationMinutes) }
        : {}),
      ...(maxScore !== undefined ? { maxScore: normalizedMaxScore } : {}),
      ...(meetingUrl !== undefined ? { meetingUrl: meetingUrl?.trim() || null } : {}),
    },
  });

  clearCachedResponse(`programmes:managed:${req.user.id}`);
  clearCachedResponse("programmes:managed:detail:");
  clearCachedResponse("programmes:mine:");
  clearCachedResponse("programmes:schedule:");
  clearCachedResponse("programme:detail:");

  return res.status(200).json(
    new ApiResponse(
      200,
      { session: updatedSession },
      "Interactive session updated successfully",
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

  await Promise.all(
    normalizedAttendance.map((entry) =>
      createNotification({
        type: entry.status === "absent" ? "meeting" : "grade",
        title:
          entry.status === "absent"
            ? `Attendance marked for ${session.title}`
            : `Interactive session marks updated for ${session.title}`,
        message:
          entry.status === "absent"
            ? `You were marked absent for ${session.title} in ${session.programme.title}.${session.maxScore > 0 ? ` Score recorded: ${entry.score ?? 0}/${session.maxScore}.` : ""}`
            : session.maxScore > 0
              ? `Your attendance and marks for ${session.title} have been recorded as ${entry.score ?? 0}/${session.maxScore}.`
              : `Your attendance for ${session.title} has been marked present.`,
        userIds: [entry.userId],
        actorId: req.user.id,
        programmeId: session.programmeId,
        actionUrl: `/my-programmes/${session.programmeId}`,
        metadata: {
          interactiveSessionId: sessionId,
          attendanceStatus: entry.status,
          score: entry.score ?? 0,
          maxScore: session.maxScore,
        },
      }),
    ),
  );

  clearCachedResponse(`programmes:managed:${req.user.id}`);
  clearCachedResponse("programmes:managed:detail:");
  clearCachedResponse("programmes:mine:");
  clearCachedResponse("programmes:schedule:");
  clearCachedResponse("programme:detail:");

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

const downloadInteractiveSessionBulkTemplate = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new ApiError(400, "Interactive session ID is required");
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
          title: true,
        },
      },
      attendances: {
        where: {
          status: "present",
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              batch: true,
            },
          },
        },
        orderBy: {
          markedAt: "asc",
        },
      },
    },
  });

  if (!session) {
    throw new ApiError(404, "Interactive session not found for this manager");
  }

  if (!session.attendances.length) {
    throw new ApiError(
      400,
      "Mark attendance first. The bulk marks sheet only includes present scholars.",
    );
  }

  const workbook = XLSX.utils.book_new();
  const worksheetRows = [
    ["scholarName", "userEmail", "batch", "attendanceStatus", "currentMarks", "marks"],
    ...session.attendances.map((attendance) => [
      attendance.user.name,
      attendance.user.email,
      attendance.user.batch || "",
      attendance.status,
      attendance.score ?? "",
      attendance.score ?? "",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows);

  worksheet["!cols"] = [
    { wch: 28 },
    { wch: 34 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Session marks");

  const fileBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  const safeTitle = session.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeTitle || "interactive-session"}-marks-template.xlsx"`,
  );

  return res.status(200).send(fileBuffer);
});

const bulkEvaluateInteractiveSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new ApiError(400, "Interactive session ID is required");
  }

  if (!req.file?.buffer) {
    throw new ApiError(400, "Excel file is required");
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

  const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  if (!rows.length) {
    throw new ApiError(400, "Excel file is empty");
  }

  const results = {
    updated: 0,
    skipped: 0,
    failed: [],
  };

  for (const row of rows) {
    const userEmail = String(row.useremail || row.userEmail || row.email || "")
      .trim()
      .toLowerCase();
    const marks = Number(row.marks ?? row.score ?? "");

    if (!userEmail || Number.isNaN(marks)) {
      results.skipped += 1;
      results.failed.push({
        userEmail: userEmail || "(missing email)",
        reason: "Missing useremail or invalid marks",
      });
      continue;
    }

    if (marks < 0 || marks > session.maxScore) {
      results.skipped += 1;
      results.failed.push({
        userEmail,
        reason: `Marks should be between 0 and ${session.maxScore}`,
      });
      continue;
    }

    const attendance = await db.interactiveSessionAttendance.findFirst({
      where: {
        interactiveSessionId: sessionId,
        status: "present",
        user: {
          is: {
            email: userEmail,
          },
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!attendance) {
      results.skipped += 1;
      results.failed.push({
        userEmail,
        reason: "No present attendance record found for this scholar",
      });
      continue;
    }

    await db.interactiveSessionAttendance.update({
      where: {
        id: attendance.id,
      },
      data: {
        score: marks,
        markedAt: new Date(),
      },
    });

    await createNotification({
      type: "grade",
      title: `Interactive session marks updated for ${session.title}`,
      message:
        session.maxScore > 0
          ? `Your marks for ${session.title} are now ${marks}/${session.maxScore}.`
          : `Your attendance for ${session.title} has been updated.`,
      userIds: [attendance.userId],
      actorId: req.user.id,
      programmeId: session.programmeId,
      actionUrl: `/my-programmes/${session.programmeId}`,
      metadata: {
        interactiveSessionId: sessionId,
        attendanceStatus: "present",
        score: marks,
        maxScore: session.maxScore,
      },
    });

    clearCachedResponse(`programmes:mine:${attendance.userId}`);
    clearCachedResponse(`programmes:schedule:${attendance.userId}`);
    clearCachedResponse(`programme:detail:${attendance.userId}:`);

    results.updated += 1;
  }

  clearCachedResponse(`programmes:managed:${req.user.id}`);
  clearCachedResponse("programmes:managed:detail:");
  clearCachedResponse("programmes:mine:");
  clearCachedResponse("programmes:schedule:");
  clearCachedResponse("programme:detail:");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        sessionId,
        programme: session.programme,
        ...results,
      },
      "Bulk session evaluation completed",
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

  clearCachedResponse(`programmes:managed:${req.user.id}`);
  clearCachedResponse("programmes:managed:detail:");
  clearCachedResponse("programmes:mine:");
  clearCachedResponse("programmes:schedule:");
  clearCachedResponse("programme:detail:");

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
  const cacheKey = `programmes:managed:report:${req.user.id}:${programmeId}`;

  const cachedResponse = getCachedResponse(cacheKey);
  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

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
    const totalAssignmentMarks = programme.assignments.reduce(
      (sum, assignment) => sum + (assignment.maxScore || 0),
      0,
    );
    const totalSessionMarks = programme.interactiveSessions.reduce(
      (sum, session) => sum + (session.maxScore || 0),
      0,
    );
    const totalPossibleMarks = totalAssignmentMarks + totalSessionMarks;

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
    const percentage =
      totalPossibleMarks > 0
        ? Number(((totalObtainedMarks / totalPossibleMarks) * 100).toFixed(2))
        : 0;

    const fixedColumns = {
      userId: enrollment.user.id,
      name: enrollment.user.name,
      email: enrollment.user.email,
      phoneNumber: enrollment.user.phoneNumber || "",
      batch: enrollment.user.batch || "",
      programmeStatus: enrollment.status,
      creditsEarned: enrollment.user.creditsEarned,
      totalMarks: `${totalObtainedMarks}/${totalPossibleMarks}`,
      percentage,
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

  const response = new ApiResponse(
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
  );

  setCachedResponse(cacheKey, response, 60_000);
  return res.status(200).json(response);
});

const getDiscoverableProgrammes = asyncHandler(async (req, res) => {
  const cacheKey = `programmes:discover:${req.user.id}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  const [user, enrolled, requests, programmes] = await Promise.all([
    db.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        id: true,
        batch: true,
        gender: true,
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
    db.selfEnrollmentRequest.findMany({
      where: {
        userId: req.user.id,
      },
      select: {
        programmeId: true,
        status: true,
        requestedAt: true,
        decidedAt: true,
        decisionReason: true,
      },
    }),
    db.programme.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        selfEnrollmentEnabled: true,
        selfEnrollmentSeatLimit: true,
        selfEnrollmentOpensAt: true,
        selfEnrollmentClosesAt: true,
        selfEnrollmentAllowedBatches: true,
        selfEnrollmentAllowedGenders: true,
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
            enrollments: true,
            assignments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const enrolledProgrammeIds = new Set(enrolled.map((item) => item.programmeId));
  const requestMap = new Map(requests.map((request) => [request.programmeId, request]));

  const discoverableProgrammes = programmes
    .filter((programme) => programme.selfEnrollmentEnabled)
    .map((programme) => {
      const existingRequest = requestMap.get(programme.id) || null;
      const eligibility = getProgrammeSelfEnrollmentEligibility({
        programme,
        user,
        enrolledCount: programme._count.enrollments,
      });

      return {
        id: programme.id,
        title: programme.title,
        description: programme.description,
        createdAt: programme.createdAt,
        programmeManager: programme.programmeManager,
        selfEnrollmentEnabled: programme.selfEnrollmentEnabled,
        selfEnrollmentSeatLimit: programme.selfEnrollmentSeatLimit,
        selfEnrollmentOpensAt: programme.selfEnrollmentOpensAt,
        selfEnrollmentClosesAt: programme.selfEnrollmentClosesAt,
        allowedBatches: programme.selfEnrollmentAllowedBatches || [],
        allowedGenders: programme.selfEnrollmentAllowedGenders || [],
        spotlightTitle: programme.spotlightTitle || "",
        spotlightMessage: programme.spotlightMessage || "",
        assignmentsCount: programme._count.assignments,
        scholarsCount: programme._count.enrollments,
        enrolled: enrolledProgrammeIds.has(programme.id),
        requestStatus: existingRequest?.status || null,
        requestDecisionReason: existingRequest?.decisionReason || "",
        requestRequestedAt: existingRequest?.requestedAt || null,
        requestDecidedAt: existingRequest?.decidedAt || null,
        eligibleToRequest:
          !enrolledProgrammeIds.has(programme.id) &&
          (!existingRequest ||
            existingRequest.status === "rejected" ||
            existingRequest.status === "withdrawn") &&
          eligibility.eligible,
        eligibilityMessage: enrolledProgrammeIds.has(programme.id)
          ? "You are already enrolled in this programme."
          : existingRequest?.status === "pending"
            ? "Your request has already been submitted."
            : existingRequest?.status === "accepted"
              ? "Your enrollment request has already been accepted."
              : existingRequest?.status === "withdrawn"
                ? "Your earlier seat was removed. You can submit a fresh request if this programme is still open."
              : eligibility.reason,
      };
    });

  const response = new ApiResponse(
    200,
    {
      programmes: discoverableProgrammes,
    },
    "Discoverable programmes fetched successfully",
  );

  setCachedResponse(cacheKey, response, 60_000);
  return res.status(200).json(response);
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
    include: {
      enrollments: {
        where: {
          status: {
            in: ["active", "completed", "uncompleted"],
          },
        },
        select: {
          userId: true,
        },
      },
    },
  });

  if (!programme) {
    throw new ApiError(404, "Programme not found");
  }

  if (!programme.selfEnrollmentEnabled) {
    throw new ApiError(403, "This programme is not open for self-enrollment");
  }

  const existingEnrollment = await db.enrollment.findUnique({
    where: {
      userId_programmeId: {
        userId: req.user.id,
        programmeId,
      },
    },
  });

  if (existingEnrollment) {
    throw new ApiError(409, "You are already enrolled in this programme");
  }

  const user = await db.user.findUnique({
    where: {
      id: req.user.id,
    },
    select: {
      id: true,
      batch: true,
      gender: true,
    },
  });

  const existingRequest = await db.selfEnrollmentRequest.findUnique({
    where: {
      programmeId_userId: {
        programmeId,
        userId: req.user.id,
      },
    },
  });

  if (existingRequest?.status === "pending") {
    throw new ApiError(409, "You have already submitted an enrollment request for this programme");
  }

  const eligibility = getProgrammeSelfEnrollmentEligibility({
    programme,
    user,
    enrolledCount: programme.enrollments.length,
  });

  if (!eligibility.eligible) {
    throw new ApiError(403, eligibility.reason);
  }

  const request = await db.selfEnrollmentRequest.upsert({
    where: {
      programmeId_userId: {
        programmeId,
        userId: req.user.id,
      },
    },
    update: {
      status: "pending",
      requestedAt: new Date(),
      decidedAt: null,
      decisionReason: null,
    },
    create: {
      programmeId,
      userId: req.user.id,
      status: "pending",
    },
  });

  clearCachedResponse("programmes:discover:");
  clearCachedResponse("admin:");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        request,
      },
      "Enrollment request submitted successfully",
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
  clearCachedResponse(`programmes:managed:${req.user.id}`);
  clearCachedResponse("programmes:managed:detail:");
  clearCachedResponse("programmes:mine:");
  clearCachedResponse("programmes:schedule:");
  clearCachedResponse("programme:detail:");
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
  clearCachedResponse(`programmes:managed:${req.user.id}`);
  clearCachedResponse("programmes:managed:detail:");
  clearCachedResponse("programmes:mine:");
  clearCachedResponse("programme:detail:");
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
  bulkEvaluateInteractiveSession,
  createManagedInteractiveSession,
  downloadInteractiveSessionBulkTemplate,
  getDiscoverableProgrammes,
  getManagedProgrammeDetail,
  getManagedProgrammes,
  getManagedProgrammeReport,
  getMyProgrammes,
  getMyProgrammeSchedule,
  getProgrammeDetail,
  getWishlistProgrammeCatalog,
  markInteractiveSessionAttendance,
  publishProgrammeResults,
  selfEnrollInProgramme,
  updateManagedInteractiveSession,
};
