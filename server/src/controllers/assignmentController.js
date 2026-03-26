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

const getUserAssignments = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.params.userId;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const enrollments = await db.enrollment.findMany({
    where: { userId },
    select: {
      programmeId: true,
    },
  });

  if (!enrollments || enrollments.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No enrollments found"));
  }

  const programmeIds = enrollments.map((enrollment) => enrollment.programmeId);

  const assignments = await db.assignment.findMany({
    where: {
      programmeId: {
        in: programmeIds,
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

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        formattedAssignments,
        "Assignments fetched successfully",
      ),
    );
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

  const workbook = XLSX.readFile(req.file.path);
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

  const filePath = req.file.path;
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
          fileUrl: filePath,
          submittedAt,
          isLate,
        },
      })
    : await db.submission.create({
        data: {
          fileUrl: filePath,
          assignmentId,
          userId,
          submittedAt,
          isLate,
        },
      });

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
  evaluateSubmission,
  getAssignmentsByProgramme,
  getManagedSubmissions,
  getUserAssignments,
  submitAssignment,
};
