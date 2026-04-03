import path from "path";
import XLSX from "xlsx";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import db from "../db.js";
import {
  getAcceptedFileTypesForAssignmentType,
  serializeAssignment,
} from "../utils/assignmentMetadata.js";
import {
  createNotification,
  getProgrammeScholarIds,
} from "../utils/notifications.js";
import {
  clearCachedResponse,
  getCachedResponse,
  setCachedResponse,
} from "../utils/responseCache.js";
import { uploadBufferToS3 } from "../utils/s3.js";

const getUserAssignments = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.params.userId;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const cacheKey = `assignments:user:${userId}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

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

  if (!assignments.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No enrollments found"));
  }

  const formattedAssignments = assignments.map((assignment) => ({
    ...serializeAssignment(assignment),
    submission: assignment.submissions[0] || null,
    status:
      assignment.submissions.length === 0
        ? "PENDING"
        : assignment.submissions[0]?.score !== null &&
            assignment.submissions[0]?.score !== undefined
          ? "GRADED"
          : "SUBMITTED",
  }));

  const response = new ApiResponse(
    200,
    formattedAssignments,
    "Assignments fetched successfully",
  );

  setCachedResponse(cacheKey, response, 60_000);
  return res.status(200).json(response);
});

const createAssignment = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;
  const {
    title,
    description,
    dueDate,
    maxScore,
    assignmentType,
    acceptedFileTypes,
    isGraded,
    allowLateSubmission,
    allowResubmission,
    meetingUrl,
  } = req.body;

  if (!programmeId) {
    throw new ApiError(400, "Programme ID is required");
  }

  if (!title?.trim()) {
    throw new ApiError(400, "Assignment title is required");
  }

  const programme = await db.programme.findFirst({
    where: {
      id: programmeId,
      programmeManagerId: req.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!programme) {
    throw new ApiError(403, "You cannot add assignments to this programme");
  }

  const normalizedAssignmentType =
    typeof assignmentType === "string" ? assignmentType : "document";

  if (normalizedAssignmentType === "interactive_session") {
    throw new ApiError(
      400,
      "Interactive sessions should be created from the interactive session scheduler",
    );
  }

  const assignment = await db.assignment.create({
    data: {
      title: title.trim(),
      description: description?.trim() || "",
      dueDate: dueDate ? new Date(dueDate) : null,
      maxScore:
        maxScore !== undefined && maxScore !== null ? Number(maxScore) : null,
      type: normalizedAssignmentType,
      acceptedFileTypes:
        Array.isArray(acceptedFileTypes) && acceptedFileTypes.length > 0
          ? acceptedFileTypes
          : getAcceptedFileTypesForAssignmentType(normalizedAssignmentType),
      isGraded:
        isGraded !== undefined
          ? !!isGraded
          : normalizedAssignmentType !== "interactive_session",
      allowLateSubmission:
        allowLateSubmission !== undefined ? !!allowLateSubmission : true,
      allowResubmission:
        allowResubmission !== undefined ? !!allowResubmission : true,
      meetingUrl: meetingUrl || null,
      programmeId,
      createdById: req.user.id,
    },
  });

  const scholarIds = await getProgrammeScholarIds(programmeId);
  clearCachedResponse("assignments:user:");
  clearCachedResponse("programmes:mine:");
  clearCachedResponse("programme:detail:");
  clearCachedResponse(`programmes:managed:${req.user.id}`);
  await createNotification({
    type: "assignment",
    title: `New assignment: ${assignment.title}`,
    message:
      assignment.dueDate !== null
        ? `A new assignment has been published and is due on ${assignment.dueDate.toLocaleDateString("en-IN")}.`
        : "A new assignment has been published in your programme.",
    userIds: scholarIds,
    actorId: req.user.id,
    programmeId,
    assignmentId: assignment.id,
    actionUrl: `/assignments?programmeId=${programmeId}`,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        serializeAssignment(assignment),
        "Assignment created successfully",
      ),
    );
});

const updateAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const {
    title,
    description,
    dueDate,
    maxScore,
    assignmentType,
    acceptedFileTypes,
    isGraded,
    allowLateSubmission,
    allowResubmission,
    meetingUrl,
  } = req.body;

  if (!assignmentId) {
    throw new ApiError(400, "Assignment ID is required");
  }

  const assignment = await db.assignment.findFirst({
    where: {
      id: assignmentId,
      programme: {
        is: {
          programmeManagerId: req.user.id,
        },
      },
    },
    select: {
      id: true,
      programmeId: true,
      title: true,
      type: true,
    },
  });

  if (!assignment) {
    throw new ApiError(404, "Assignment not found for this programme manager");
  }

  const normalizedAssignmentType =
    typeof assignmentType === "string" && assignmentType.trim()
      ? assignmentType
      : assignment.type;

  if (normalizedAssignmentType === "interactive_session") {
    throw new ApiError(
      400,
      "Interactive sessions should be managed from the interactive session scheduler",
    );
  }

  const updatedAssignment = await db.assignment.update({
    where: {
      id: assignmentId,
    },
    data: {
      ...(title !== undefined ? { title: String(title).trim() } : {}),
      ...(description !== undefined
        ? { description: String(description || "").trim() || "" }
        : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      ...(maxScore !== undefined && maxScore !== null && maxScore !== ""
        ? { maxScore: Number(maxScore) }
        : maxScore === null || maxScore === ""
          ? { maxScore: null }
          : {}),
      ...(assignmentType !== undefined ? { type: normalizedAssignmentType } : {}),
      ...(acceptedFileTypes !== undefined
        ? {
            acceptedFileTypes:
              Array.isArray(acceptedFileTypes) && acceptedFileTypes.length > 0
                ? acceptedFileTypes
                : getAcceptedFileTypesForAssignmentType(normalizedAssignmentType),
          }
        : assignmentType !== undefined
          ? {
              acceptedFileTypes:
                getAcceptedFileTypesForAssignmentType(normalizedAssignmentType),
            }
          : {}),
      ...(isGraded !== undefined ? { isGraded: !!isGraded } : {}),
      ...(allowLateSubmission !== undefined
        ? { allowLateSubmission: !!allowLateSubmission }
        : {}),
      ...(allowResubmission !== undefined
        ? { allowResubmission: !!allowResubmission }
        : {}),
      ...(meetingUrl !== undefined ? { meetingUrl: meetingUrl?.trim() || null } : {}),
    },
  });

  clearCachedResponse("assignments:user:");
  clearCachedResponse("programmes:mine:");
  clearCachedResponse("programme:detail:");
  clearCachedResponse(`programmes:managed:${req.user.id}`);
  clearCachedResponse("programmes:managed:detail:");

  return res.status(200).json(
    new ApiResponse(
      200,
      serializeAssignment(updatedAssignment),
      "Assignment updated successfully",
    ),
  );
});

const getManagedSubmissions = asyncHandler(async (req, res) => {
  const programmeId =
    typeof req.query.programmeId === "string" ? req.query.programmeId : undefined;
  const assignmentId =
    typeof req.query.assignmentId === "string" ? req.query.assignmentId : undefined;

  const submissions = await db.submission.findMany({
    where: {
      assignment: {
        is: {
          programme: {
            is: {
              programmeManagerId: req.user.id,
              ...(programmeId ? { id: programmeId } : {}),
            },
          },
          ...(assignmentId ? { id: assignmentId } : {}),
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignment: {
        select: {
          id: true,
          title: true,
          description: true,
          maxScore: true,
          dueDate: true,
          type: true,
          acceptedFileTypes: true,
          programme: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  const formattedSubmissions = submissions.map((submission) => ({
    id: submission.id,
    fileUrl: submission.fileUrl,
    score: submission.score,
    submittedAt: submission.submittedAt,
    student: submission.user,
    assignment: serializeAssignment({
      id: submission.assignment.id,
      title: submission.assignment.title,
      description: submission.assignment.description,
      maxScore: submission.assignment.maxScore,
      dueDate: submission.assignment.dueDate,
      type: submission.assignment.type,
      acceptedFileTypes: submission.assignment.acceptedFileTypes,
    }),
    programme: submission.assignment.programme,
    status:
      submission.score !== null && submission.score !== undefined
        ? "GRADED"
        : "SUBMITTED",
  }));

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        formattedSubmissions,
        "Managed submissions fetched successfully",
      ),
    );
});

const evaluateSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;
  const { score } = req.body;

  if (!submissionId) {
    throw new ApiError(400, "Submission ID is required");
  }

  if (score === undefined || score === null || Number.isNaN(Number(score))) {
    throw new ApiError(400, "Valid score is required");
  }

  const submission = await db.submission.findFirst({
    where: {
      id: submissionId,
      assignment: {
        is: {
          programme: {
            is: {
              programmeManagerId: req.user.id,
            },
          },
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
        },
      },
      assignment: {
        select: {
          id: true,
          maxScore: true,
        },
      },
    },
  });

  if (!submission) {
    throw new ApiError(404, "Submission not found for this programme manager");
  }

  const numericScore = Number(score);

  if (
    submission.assignment.maxScore !== null &&
    submission.assignment.maxScore !== undefined &&
    numericScore > submission.assignment.maxScore
  ) {
    throw new ApiError(400, "Score cannot exceed assignment max score");
  }

  if (numericScore < 0) {
    throw new ApiError(400, "Score cannot be negative");
  }

  const updatedSubmission = await db.submission.update({
    where: {
      id: submissionId,
    },
    data: {
      score: numericScore,
      evaluatedAt: new Date(),
      evaluatedById: req.user.id,
    },
  });

  await createNotification({
    type: "grade",
    title: "Marks updated",
    message: `Your marks have been updated to ${numericScore}${submission.assignment.maxScore ? ` out of ${submission.assignment.maxScore}` : ""}.`,
    userIds: [submission.user.id],
    actorId: req.user.id,
    assignmentId: submission.assignment.id,
    actionUrl: "/assignments",
  });

  clearCachedResponse(`assignments:user:${submission.user.id}`);
  clearCachedResponse(`programmes:mine:${submission.user.id}`);
  clearCachedResponse(`programme:detail:${submission.user.id}:`);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedSubmission,
        "Submission evaluated successfully",
      ),
    );
});

const bulkEvaluateSubmissions = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  if (!assignmentId) {
    throw new ApiError(400, "Assignment ID is required");
  }

  if (!req.file) {
    throw new ApiError(400, "Excel file is required");
  }

  const managedAssignment = await db.assignment.findFirst({
    where: {
      id: assignmentId,
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

  if (!managedAssignment) {
    throw new ApiError(404, "Assignment not found for this programme manager");
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

    if (
      managedAssignment.maxScore !== null &&
      managedAssignment.maxScore !== undefined &&
      marks > managedAssignment.maxScore
    ) {
      results.skipped += 1;
      results.failed.push({
        userEmail,
        reason: `Marks exceed max score of ${managedAssignment.maxScore}`,
      });
      continue;
    }

    const submission = await db.submission.findFirst({
      where: {
        assignmentId,
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

    if (!submission) {
      results.skipped += 1;
      results.failed.push({
        userEmail,
        reason: "No submission found for this student",
      });
      continue;
    }

    const updatedSubmission = await db.submission.update({
      where: {
        id: submission.id,
      },
      data: {
        score: marks,
        evaluatedAt: new Date(),
        evaluatedById: req.user.id,
      },
    });

    await createNotification({
      type: "grade",
      title: `Marks updated for ${managedAssignment.title}`,
      message: `Your score is now ${updatedSubmission.score}${managedAssignment.maxScore ? ` out of ${managedAssignment.maxScore}` : ""}.`,
      userIds: [submission.userId],
      actorId: req.user.id,
      programmeId: managedAssignment.programme.id,
      assignmentId,
      actionUrl: `/assignments?programmeId=${managedAssignment.programme.id}`,
    });

    clearCachedResponse(`assignments:user:${submission.userId}`);
    clearCachedResponse(`programmes:mine:${submission.userId}`);
    clearCachedResponse(`programme:detail:${submission.userId}:`);

    results.updated += 1;
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        assignmentId,
        programme: managedAssignment.programme,
        ...results,
      },
      "Bulk evaluation completed",
    ),
  );
});

const downloadBulkEvaluationTemplate = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  if (!assignmentId) {
    throw new ApiError(400, "Assignment ID is required");
  }

  const managedAssignment = await db.assignment.findFirst({
    where: {
      id: assignmentId,
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
      submissions: {
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
          submittedAt: "asc",
        },
      },
    },
  });

  if (!managedAssignment) {
    throw new ApiError(404, "Assignment not found for this programme manager");
  }

  const workbook = XLSX.utils.book_new();
  const worksheetRows = [
    [
      "scholarName",
      "userEmail",
      "batch",
      "submittedAt",
      "submissionLink",
      "currentMarks",
      "marks",
    ],
    ...managedAssignment.submissions.map((submission) => [
      submission.user.name,
      submission.user.email,
      submission.user.batch || "",
      submission.submittedAt
        ? new Date(submission.submittedAt).toLocaleString("en-IN")
        : "",
      submission.fileUrl || "",
      submission.score ?? "",
      submission.score ?? "",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetRows);

  worksheet["!cols"] = [
    { wch: 28 },
    { wch: 34 },
    { wch: 12 },
    { wch: 24 },
    { wch: 60 },
    { wch: 14 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Assignment marks");

  const fileBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  const safeTitle = managedAssignment.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeTitle || "assignment"}-marks-template.xlsx"`,
  );

  return res.status(200).send(fileBuffer);
});

const getAssignmentsByProgramme = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;

  if (!programmeId) {
    throw new ApiError(400, "Programme ID is required");
  }

  const programme = await db.programme.findUnique({
    where: { id: programmeId },
    select: {
      id: true,
      title: true,
    },
  });

  if (!programme) {
    throw new ApiError(404, "Programme not found");
  }

  const assignments = await db.assignment.findMany({
    where: {
      programmeId,
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        programme,
        assignments: assignments.map((assignment) => serializeAssignment(assignment)),
      },
      "Assignments fetched successfully",
    ),
  );
});

const submitAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const userId = req.user?.id;

  if (!assignmentId) {
    throw new ApiError(400, "Assignment ID is required");
  }

  if (!req.file) {
    throw new ApiError(400, "File is required");
  }

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      programmeId: true,
      dueDate: true,
      acceptedFileTypes: true,
      allowResubmission: true,
      allowLateSubmission: true,
    },
  });

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  const assignmentRecord = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      type: true,
    },
  });

  if (assignmentRecord?.type === "interactive_session") {
    throw new ApiError(
      400,
      "Interactive sessions do not require scholar submissions. Attendance is marked by the programme manager.",
    );
  }

  const fileExtension = path.extname(req.file.originalname || "").toLowerCase();

  if (
    fileExtension &&
    Array.isArray(assignment.acceptedFileTypes) &&
    assignment.acceptedFileTypes.length > 0 &&
    !assignment.acceptedFileTypes.includes(fileExtension)
  ) {
    throw new ApiError(
      400,
      `Invalid file type. Accepted files: ${assignment.acceptedFileTypes.join(", ")}`,
    );
  }

  const enrollment = await db.enrollment.findFirst({
    where: {
      userId,
      programmeId: assignment.programmeId,
    },
  });

  if (!enrollment) {
    throw new ApiError(403, "You are not enrolled in this programme");
  }

  const existingSubmission = await db.submission.findFirst({
    where: {
      assignmentId,
      userId,
    },
  });

  if (existingSubmission && !assignment.allowResubmission) {
    throw new ApiError(400, "Resubmissions are not allowed for this assignment");
  }

  const uploadedFile = await uploadBufferToS3({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    originalName: req.file.originalname,
    folder: `submissions/${assignment.programmeId}/${assignmentId}`,
  });
  const submittedAt = new Date();
  const isLate =
    !!assignment.dueDate &&
    submittedAt.getTime() > new Date(assignment.dueDate).getTime();

  if (isLate && !assignment.allowLateSubmission) {
    throw new ApiError(400, "Late submissions are not allowed for this assignment");
  }

  const submission = existingSubmission
    ? await db.submission.update({
        where: { id: existingSubmission.id },
        data: {
          fileUrl: uploadedFile.url,
          submittedAt,
          isLate,
        },
      })
    : await db.submission.create({
        data: {
          fileUrl: uploadedFile.url,
          assignmentId,
          userId,
          submittedAt,
          isLate,
        },
      });

  clearCachedResponse(`assignments:user:${userId}`);
  clearCachedResponse(`programmes:mine:${userId}`);
  clearCachedResponse(`programme:detail:${userId}:`);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        submission,
        existingSubmission
          ? "Assignment resubmitted successfully"
          : "Assignment submitted successfully",
      ),
    );
});

export {
  bulkEvaluateSubmissions,
  createAssignment,
  downloadBulkEvaluationTemplate,
  evaluateSubmission,
  getAssignmentsByProgramme,
  getManagedSubmissions,
  getUserAssignments,
  submitAssignment,
  updateAssignment,
};
