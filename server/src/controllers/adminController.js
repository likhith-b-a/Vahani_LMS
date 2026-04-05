import db from "../db.js";
import XLSX from "xlsx";
import bcrypt from "bcrypt";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import {
  getAdminSettings,
  updateAdminSettings,
} from "../utils/adminSettingsStore.js";
import { serializeAssignment } from "../utils/assignmentMetadata.js";
import { logger } from "../utils/logger.js";
import {
  removeProgrammeMetadata,
} from "../utils/programmeMetadataStore.js";
import { createNotification } from "../utils/notifications.js";
import { processProgrammeEnrollmentRequests } from "../utils/selfEnrollment.js";
import {
  clearCachedResponse,
  getCachedResponse,
  setCachedResponse,
} from "../utils/responseCache.js";
import { sendLoginCredentialsMail } from "../utils/sendMail.js";
import {
  filterAssignmentsForEnrollment,
  filterSessionsForEnrollment,
} from "../utils/programmeGrouping.js";

const adminUserTemplateHeaders = [
  "name",
  "email",
  "password",
  "role",
  "batch",
  "gender",
  "phoneNumber",
  "creditsEarned",
];

const normalizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  batch: user.batch,
  gender: user.gender,
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
});

const normalizeAdminUserDetail = (user) => {
  const detail = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    batch: user.batch,
    gender: user.gender,
    phoneNumber: user.phoneNumber,
    creditsEarned: user.creditsEarned,
    createdAt: user.createdAt,
    programmeHistory: [],
    managedProgrammes: [],
    certificates: [],
  };

  if (user.role === "scholar") {
    detail.programmeHistory = (user.enrollments || []).map((enrollment) => {
      const applicableAssignments = filterAssignmentsForEnrollment(
        enrollment.programme.assignments || [],
        enrollment,
        enrollment.programme,
      );
      const applicableSessions = filterSessionsForEnrollment(
        enrollment.programme.interactiveSessions || [],
        enrollment,
        enrollment.programme,
      );

      const assignmentRows = applicableAssignments.map((assignment) => {
        const submission = assignment.submissions?.[0] || null;
        return {
          id: assignment.id,
          title: assignment.title,
          type: assignment.type,
          dueDate: assignment.dueDate,
          maxScore: assignment.maxScore,
          score: submission?.score ?? null,
          status: !submission
            ? "not_submitted"
            : submission.score === null
              ? "under_evaluation"
              : "graded",
          submittedAt: submission?.submittedAt || null,
        };
      });

      const interactiveSessions = applicableSessions.map((session) => {
        const attendance = session.attendances?.[0] || null;
        return {
          id: session.id,
          title: session.title,
          scheduledAt: session.scheduledAt,
          maxScore: session.maxScore,
          attendanceStatus: attendance?.status || "unmarked",
          score: attendance?.score ?? null,
        };
      });

      const totalSessions = interactiveSessions.length;
      const presentSessions = interactiveSessions.filter(
        (session) => session.attendanceStatus === "present",
      ).length;

      return {
        enrollmentId: enrollment.id,
        status: enrollment.status,
        trackGroup: enrollment.trackGroup || null,
        sessionSlot: enrollment.sessionSlot || null,
        progressPercent: enrollment.progressPercent,
        creditsAwarded: enrollment.creditsAwarded,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        programme: {
          id: enrollment.programme.id,
          title: enrollment.programme.title,
          credits: enrollment.programme.credits,
          programmeManager: enrollment.programme.programmeManager,
        },
        assignmentSummary: {
          total: assignmentRows.length,
          submitted: assignmentRows.filter((assignment) => assignment.status !== "not_submitted").length,
          graded: assignmentRows.filter((assignment) => assignment.status === "graded").length,
        },
        attendanceSummary: {
          totalSessions,
          presentSessions,
          absentSessions: interactiveSessions.filter(
            (session) => session.attendanceStatus === "absent",
          ).length,
          attendancePercent:
            totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : null,
        },
        assignments: assignmentRows,
        interactiveSessions,
        certificate:
          (user.certificates || []).find(
            (certificate) => certificate.programmeId === enrollment.programmeId,
          ) || null,
      };
    });

    detail.certificates = (user.certificates || []).map((certificate) => ({
      id: certificate.id,
      credentialId: certificate.credentialId,
      programmeTitle: certificate.programmeTitle,
      issuedAt: certificate.issuedAt,
      status: certificate.status,
      fileUrl: certificate.fileUrl,
    }));
  }

  if (user.role === "programme_manager") {
    detail.managedProgrammes = (user.managedProgrammes || []).map((programme) => ({
      id: programme.id,
      title: programme.title,
      credits: programme.credits,
      createdAt: programme.createdAt,
      resultsPublishedAt: programme.resultsPublishedAt,
      scholarCount: programme._count?.enrollments || 0,
      activeScholarCount: (programme.enrollments || []).filter(
        (enrollment) => enrollment.status === "active",
      ).length,
      completedScholarCount: (programme.enrollments || []).filter(
        (enrollment) => enrollment.status === "completed",
      ).length,
      assignmentCount: programme._count?.assignments || 0,
      interactiveSessionCount: programme._count?.interactiveSessions || 0,
      certificatesIssuedCount: programme._count?.certificates || 0,
    }));

    detail.certificates = (user.issuedCertificates || []).map((certificate) => ({
      id: certificate.id,
      credentialId: certificate.credentialId,
      scholarName: certificate.scholarName,
      programmeTitle: certificate.programmeTitle,
      issuedAt: certificate.issuedAt,
      status: certificate.status,
      fileUrl: certificate.fileUrl,
    }));
  }

  return detail;
};

const normalizeProgramme = (programme) => {
  const totalScholars = programme.enrollments.length;

  return {
    id: programme.id,
    title: programme.title,
    description: programme.description,
    credits: programme.credits,
    createdAt: programme.createdAt,
    selfEnrollmentEnabled: !!programme.selfEnrollmentEnabled,
    groupedDeliveryEnabled: !!programme.groupedDeliveryEnabled,
    groupTrackGroups: programme.groupTrackGroups || [],
    groupSessionSlots: programme.groupSessionSlots || [],
    selfEnrollmentSeatLimit: programme.selfEnrollmentSeatLimit,
    selfEnrollmentOpensAt: programme.selfEnrollmentOpensAt,
    selfEnrollmentClosesAt: programme.selfEnrollmentClosesAt,
    selfEnrollmentAllowedBatches:
      programme.selfEnrollmentAllowedBatches || [],
    selfEnrollmentAllowedGenders:
      programme.selfEnrollmentAllowedGenders || [],
    spotlightTitle: programme.spotlightTitle || "",
    spotlightMessage: programme.spotlightMessage || "",
    programmeManagerId: programme.programmeManagerId,
    programmeManager: programme.programmeManager,
    resources:
      programme.resources?.map((resource) => ({
        id: resource.id,
        title: resource.title,
        description: resource.description,
        resourceType: resource.resourceType,
        url: resource.url || resource.fileUrl,
      })) || [],
    wishlistsCount: programme.wishlists?.length || 0,
    enrollments: programme.enrollments.map((enrollment) => ({
      id: enrollment.id,
      status: enrollment.status,
      trackGroup: enrollment.trackGroup || null,
      sessionSlot: enrollment.sessionSlot || null,
      enrolledAt: enrollment.enrolledAt,
      user: enrollment.user,
    })),
    assignments: programme.assignments.map((assignment) => {
      const serializedAssignment = serializeAssignment(assignment);
      const submittedCount = assignment.submissions.length;

      return {
        ...serializedAssignment,
        submissionCount: submittedCount,
        totalScholars,
        pendingCount: totalScholars - submittedCount,
        gradedCount: assignment.submissions.filter(
          (submission) => submission.score !== null,
        ).length,
      };
    }),
  };
};

const normalizeAdminProgrammeDetail = (programme) => {
  return {
    ...normalizeProgramme(programme),
    resultsPublishedAt: programme.resultsPublishedAt,
    interactiveSessions: (programme.interactiveSessions || []).map((session) => ({
      id: session.id,
      title: session.title,
      description: session.description,
      maxScore: session.maxScore,
      occurrences: (session.occurrences || []).map((occurrence) => ({
        id: occurrence.id,
        scheduledAt: occurrence.scheduledAt,
        durationMinutes: occurrence.durationMinutes,
        meetingUrl: occurrence.meetingUrl,
        attendanceCount: (occurrence.attendances || []).length,
        absentCount: (occurrence.attendances || []).filter(
          (attendance) => attendance.status === "absent",
        ).length,
      })),
      attendanceCount: session.attendances.length,
      absentCount: session.attendances.filter((attendance) => attendance.status === "absent").length,
    })),
    selfEnrollmentRequests: (programme.selfEnrollmentRequests || []).map((request) => ({
      id: request.id,
      status: request.status,
      requestedAt: request.requestedAt,
      decidedAt: request.decidedAt,
      decisionReason: request.decisionReason,
      user: request.user,
    })),
    enrolledScholars: programme.enrollments.map((enrollment) => {
      const applicableAssignments = filterAssignmentsForEnrollment(
        programme.assignments || [],
        enrollment,
        programme,
      );
      const applicableSessions = filterSessionsForEnrollment(
        programme.interactiveSessions || [],
        enrollment,
        programme,
      );
      const totalPossibleScore =
        applicableAssignments.reduce(
          (sum, assignment) => sum + (assignment.maxScore || 0),
          0,
        ) +
        applicableSessions.reduce((sum, session) => sum + (session.maxScore || 0), 0);

      const assignmentScore = applicableAssignments.reduce((sum, assignment) => {
        const submission = assignment.submissions.find(
          (item) => item.userId === enrollment.user.id,
        );
        return sum + (submission?.score || 0);
      }, 0);

      const sessionScore = applicableSessions.reduce(
        (sum, session) => sum + (session.attendances?.[0]?.score || 0),
        0,
      );

      const totalScore = assignmentScore + sessionScore;
      const presentSessions = applicableSessions.filter(
        (session) => session.attendances?.[0]?.status === "present",
      ).length;
      const attendancePercent =
        applicableSessions.length > 0
          ? Math.round((presentSessions / applicableSessions.length) * 100)
          : null;

      return {
        id: enrollment.id,
        status: enrollment.status,
        trackGroup: enrollment.trackGroup || null,
        sessionSlot: enrollment.sessionSlot || null,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt,
        creditsAwarded: enrollment.creditsAwarded,
        progressPercent: enrollment.progressPercent,
        user: enrollment.user,
        assignmentScore,
        sessionScore,
        attendancePercent,
        totalScore,
        totalPossibleScore,
        overallPercent:
          totalPossibleScore > 0
            ? Math.round((totalScore / totalPossibleScore) * 100)
            : null,
        certificate:
          programme.certificates.find((certificate) => certificate.userId === enrollment.user.id) ||
          null,
      };
    }),
  };
};

const normalizeOverviewProgramme = (programme) => ({
  id: programme.id,
  title: programme.title,
  description: programme.description,
  createdAt: programme.createdAt,
  selfEnrollmentEnabled: !!programme.selfEnrollmentEnabled,
  programmeManagerId: programme.programmeManagerId,
  programmeManager: programme.programmeManager,
  enrollmentsCount: programme.enrollmentsCount,
  assignmentsCount: programme.assignmentsCount,
});

const adminProgrammeSelect = {
  id: true,
  title: true,
  description: true,
  credits: true,
  createdAt: true,
  selfEnrollmentEnabled: true,
  groupedDeliveryEnabled: true,
  groupTrackGroups: true,
  groupSessionSlots: true,
  selfEnrollmentSeatLimit: true,
  selfEnrollmentOpensAt: true,
  selfEnrollmentClosesAt: true,
  selfEnrollmentAllowedBatches: true,
  selfEnrollmentAllowedGenders: true,
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
      trackGroup: true,
      sessionSlot: true,
      enrolledAt: true,
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
      targetTrackGroups: true,
      submissions: {
        select: {
          id: true,
          score: true,
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
    },
  },
  wishlists: {
    select: {
      id: true,
    },
  },
};

const getAdminSummary = asyncHandler(async (req, res) => {
  const cacheKey = `admin:summary:${req.user.id}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  const [
    userRoleCounts,
    programmeCount,
    assignmentCount,
    submissionStats,
    activeEnrollments,
    programmes,
  ] =
    await Promise.all([
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

  const response = new ApiResponse(
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
      programmes: programmes.map((programme) =>
        normalizeOverviewProgramme({
          ...programme,
          enrollmentsCount: programme._count.enrollments,
          assignmentsCount: programme._count.assignments,
        }),
      ),
    },
    "Admin summary fetched successfully",
  );

  setCachedResponse(cacheKey, response, 300_000);
  return res.status(200).json(response);
});

const getAdminOverview = asyncHandler(async (req, res) => {
  const cacheKey = `admin:overview:${req.user.id}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  const [
    users,
    programmes,
    assignmentsCount,
    submissionsCount,
    gradedSubmissionsCount,
    settings,
  ] = await Promise.all([
    db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        batch: true,
        gender: true,
        phoneNumber: true,
        creditsEarned: true,
        managedProgrammes: {
          select: {
            id: true,
            title: true,
          },
        },
        enrollments: {
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
    }),
    db.programme.findMany({
      select: adminProgrammeSelect,
      orderBy: {
        createdAt: "desc",
      },
    }),
    db.assignment.count(),
    db.submission.count(),
    db.submission.count({
      where: {
        score: {
          not: null,
        },
      },
    }),
    getAdminSettings(),
  ]);

  const scholars = users.filter((user) => user.role === "scholar");
  const programmeManagers = users.filter(
    (user) => user.role === "programme_manager",
  );
  const admins = users.filter((user) => user.role === "admin");

  const response = new ApiResponse(
    200,
    {
      stats: {
        totalUsers: users.length,
        scholars: scholars.length,
        programmeManagers: programmeManagers.length,
        admins: admins.length,
        programmes: programmes.length,
        assignments: assignmentsCount,
        submissions: submissionsCount,
        gradedSubmissions: gradedSubmissionsCount,
        activeEnrollments: programmes.reduce(
          (count, programme) =>
            count +
            programme.enrollments.filter(
              (enrollment) => enrollment.status === "active",
            ).length,
          0,
        ),
      },
      users: users.map(normalizeUser),
      programmes: programmes.map((programme) => normalizeProgramme(programme)),
      settings,
    },
    "Admin overview fetched successfully",
  );

  setCachedResponse(cacheKey, response, 60_000);
  return res.status(200).json(response);
});

const getAdminUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const cacheKey = `admin:users:${req.user.id}:${role || "all"}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  const users = await db.user.findMany({
    where:
      role && role !== "all"
        ? {
            role: String(role),
          }
        : undefined,
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

  const response = new ApiResponse(
    200,
    { users: users.map(normalizeUser) },
    "Users fetched successfully",
  );

  setCachedResponse(cacheKey, response, 60_000);
  return res.status(200).json(response);
});

const getAdminUserDetail = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const cacheKey = `admin:user-detail:${req.user.id}:${userId}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      enrollments: {
        select: {
          id: true,
          userId: true,
          status: true,
          progressPercent: true,
          creditsAwarded: true,
          enrolledAt: true,
          completedAt: true,
          trackGroup: true,
          sessionSlot: true,
          programmeId: true,
          programme: {
            select: {
              id: true,
              title: true,
              credits: true,
              groupedDeliveryEnabled: true,
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
                  type: true,
                  dueDate: true,
                  maxScore: true,
                  targetTrackGroups: true,
                  submissions: {
                    where: {
                      userId,
                    },
                    select: {
                      id: true,
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
                select: {
                  id: true,
                  title: true,
                  description: true,
                  scheduledAt: true,
                  maxScore: true,
                  occurrences: {
                    select: {
                      id: true,
                      scheduledAt: true,
                      durationMinutes: true,
                      meetingUrl: true,
                      assignments: {
                        where: {
                          userId,
                        },
                        select: {
                          userId: true,
                        },
                      },
                    },
                    orderBy: {
                      scheduledAt: "asc",
                    },
                  },
                  attendances: {
                    where: {
                      userId,
                    },
                    select: {
                      userId: true,
                      status: true,
                      score: true,
                      interactiveSessionOccurrenceId: true,
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
        orderBy: {
          enrolledAt: "desc",
        },
      },
      managedProgrammes: {
        select: {
          id: true,
          title: true,
          credits: true,
          createdAt: true,
          resultsPublishedAt: true,
          enrollments: {
            select: {
              status: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              assignments: true,
              interactiveSessions: true,
              certificates: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      certificates: {
        select: {
          id: true,
          credentialId: true,
          programmeId: true,
          programmeTitle: true,
          issuedAt: true,
          status: true,
          fileUrl: true,
        },
        orderBy: {
          issuedAt: "desc",
        },
      },
      issuedCertificates: {
        select: {
          id: true,
          credentialId: true,
          scholarName: true,
          programmeTitle: true,
          issuedAt: true,
          status: true,
          fileUrl: true,
        },
        orderBy: {
          issuedAt: "desc",
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const response = new ApiResponse(
    200,
    normalizeAdminUserDetail(user),
    "Admin user detail fetched successfully",
  );

  setCachedResponse(cacheKey, response, 60_000);
  return res.status(200).json(response);
});

const createAdminUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, batch, gender, phoneNumber, creditsEarned } = req.body;

  if (!name || !email || !password || !role) {
    throw new ApiError(400, "Name, email, password and role are required");
  }

  if (!gender || !String(gender).trim()) {
    throw new ApiError(400, "Gender is required");
  }

  if (!["scholar", "programme_manager", "admin"].includes(role)) {
    throw new ApiError(400, "Invalid role");
  }

  if (role === "scholar" && !String(batch || "").trim()) {
    throw new ApiError(400, "Batch is required for scholars");
  }

  const existingUser = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
      batch: role === "scholar" ? batch || null : null,
      gender: String(gender).trim(),
      phoneNumber: phoneNumber || null,
      creditsEarned:
        creditsEarned !== undefined && creditsEarned !== null
          ? Number(creditsEarned)
          : 0,
    },
  });

  let message = "User created successfully";

  try {
    await sendLoginCredentialsMail({
      email,
      name,
      password,
    });
  } catch (error) {
    logger.warn("User created but credentials email failed", {
      userId: user.id,
      email,
      message: error.message,
    });
    message = "User created successfully, but the credentials email could not be sent";
  }

  clearCachedResponse("admin:");

  return res
    .status(201)
    .json(
      new ApiResponse(201, normalizeUser(user), message),
    );
});

const downloadAdminUserTemplate = asyncHandler(async (req, res) => {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([adminUserTemplateHeaders]);

  XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

  const fileBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="admin-user-import-template.xlsx"',
  );

  return res.status(200).send(fileBuffer);
});

const bulkCreateAdminUsers = asyncHandler(async (req, res) => {
  if (!req.file?.buffer) {
    throw new ApiError(400, "Upload an Excel file to import users");
  }

  const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new ApiError(400, "The uploaded file does not contain any sheets");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ApiError(400, "The uploaded file does not contain any user rows");
  }

  const allowedRoles = new Set(["scholar", "programme_manager", "admin"]);
  const seenEmails = new Set();
  const created = [];
  const skipped = [];
  const emailFailures = [];

  for (let index = 0; index < rows.length; index += 1) {
    const rawRow = rows[index] || {};
    const excelRowNumber = index + 2;
    const name = String(rawRow.name || "").trim();
    const email = String(rawRow.email || "").trim().toLowerCase();
    const password = String(rawRow.password || "").trim();
    const role = String(rawRow.role || "").trim();
    const batch = String(rawRow.batch || "").trim();
    const gender = String(rawRow.gender || "").trim();
    const phoneNumber = String(rawRow.phoneNumber || "").trim();
    const creditsEarnedValue = String(rawRow.creditsEarned || "").trim();
    const creditsEarned =
      creditsEarnedValue === "" ? 0 : Number(creditsEarnedValue);

    if (!name || !email || !password || !role || !gender) {
      skipped.push({
        row: excelRowNumber,
        email: email || "",
        reason: "Missing one or more required values: name, email, password, role, gender",
      });
      continue;
    }

    if (!allowedRoles.has(role)) {
      skipped.push({
        row: excelRowNumber,
        email,
        reason: "Role must be scholar, programme_manager, or admin",
      });
      continue;
    }

    if (seenEmails.has(email)) {
      skipped.push({
        row: excelRowNumber,
        email,
        reason: "Duplicate email in the uploaded file",
      });
      continue;
    }

    if (Number.isNaN(creditsEarned) || creditsEarned < 0) {
      skipped.push({
        row: excelRowNumber,
        email,
        reason: "creditsEarned must be a valid non-negative number",
      });
      continue;
    }

    if (role === "scholar" && !batch) {
      skipped.push({
        row: excelRowNumber,
        email,
        reason: "Scholar rows must include a batch",
      });
      continue;
    }

    seenEmails.add(email);

    const existingUser = await db.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      skipped.push({
        row: excelRowNumber,
        email,
        reason: "User already exists",
      });
      continue;
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role,
        batch: role === "scholar" ? batch || null : null,
        gender,
        phoneNumber: phoneNumber || null,
        creditsEarned,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    created.push(user);
    try {
      await sendLoginCredentialsMail({
        email,
        name,
        password,
      });
    } catch (error) {
      logger.warn("Bulk user created but credentials email failed", {
        userId: user.id,
        email,
        message: error.message,
      });
      emailFailures.push({
        row: excelRowNumber,
        email,
      });
    }
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        createdCount: created.length,
        skippedCount: skipped.length,
        emailFailureCount: emailFailures.length,
        created,
        skipped,
        emailFailures,
      },
      created.length > 0
        ? emailFailures.length > 0
          ? "Bulk user import completed, but some credentials emails could not be sent"
          : "Bulk user import completed"
        : "No users were imported from the uploaded file",
    ),
  );
});

const updateAdminUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { name, email, password, role, batch, gender, phoneNumber, creditsEarned } = req.body;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const existingUser = await db.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  const effectiveRole = role || existingUser.role;
  const effectiveBatch =
    batch !== undefined ? String(batch).trim() : String(existingUser.batch || "").trim();
  const effectiveGender =
    gender !== undefined ? String(gender).trim() : String(existingUser.gender || "").trim();

  if (!effectiveGender) {
    throw new ApiError(400, "Gender is required");
  }

  if (effectiveRole === "scholar" && !effectiveBatch) {
    throw new ApiError(400, "Batch is required for scholars");
  }

  if (email && email !== existingUser.email) {
    const emailInUse = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (emailInUse) {
      throw new ApiError(409, "Email is already in use");
    }
  }

  if (role && !["scholar", "programme_manager", "admin"].includes(role)) {
    throw new ApiError(400, "Invalid role");
  }

  if (existingUser.id === req.user.id && role && role !== "admin") {
    throw new ApiError(400, "You cannot remove your own admin access");
  }

  const updatedUser = await db.user.update({
    where: {
      id: userId,
    },
    data: {
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
        ...(password
          ? { password: await bcrypt.hash(password, 10) }
          : {}),
        ...(role ? { role } : {}),
        ...(batch !== undefined
          ? { batch: effectiveRole === "scholar" ? batch || null : null }
          : {}),
        ...(gender !== undefined ? { gender: String(gender).trim() || null } : {}),
      ...(phoneNumber !== undefined ? { phoneNumber: phoneNumber || null } : {}),
      ...(creditsEarned !== undefined && creditsEarned !== null
        ? { creditsEarned: Number(creditsEarned) }
        : {}),
    },
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
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        normalizeUser(updatedUser),
        "User updated successfully",
      ),
    );
});

const deleteAdminUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  if (userId === req.user.id) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.role === "programme_manager") {
    await db.programme.updateMany({
      where: {
        programmeManagerId: userId,
      },
      data: {
        programmeManagerId: null,
      },
    });
  }

  await db.user.delete({
    where: {
      id: userId,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User deleted successfully"));
});

const getAdminProgrammes = asyncHandler(async (req, res) => {
  const cacheKey = `admin:programmes:${req.user.id}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  const programmes = await db.programme.findMany({
    select: adminProgrammeSelect,
    orderBy: {
      createdAt: "desc",
    },
  });

  const response = new ApiResponse(
    200,
    {
      programmes: programmes.map((programme) => normalizeProgramme(programme)),
    },
    "Programmes fetched successfully",
  );

  setCachedResponse(cacheKey, response, 60_000);
  return res.status(200).json(response);
});

const getAdminProgrammeDetail = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;
  const cacheKey = `admin:programme-detail:${req.user.id}:${programmeId}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  const programme = await db.programme.findUnique({
    where: {
      id: programmeId,
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
              gender: true,
              phoneNumber: true,
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
              id: true,
              userId: true,
              score: true,
            },
          },
        },
        orderBy: {
          dueDate: "asc",
        },
      },
      interactiveSessions: {
        include: {
          occurrences: {
            include: {
              assignments: {
                select: {
                  userId: true,
                },
              },
              attendances: {
                select: {
                  userId: true,
                  status: true,
                  score: true,
                  interactiveSessionOccurrenceId: true,
                },
              },
            },
            orderBy: {
              scheduledAt: "asc",
            },
          },
          attendances: {
            select: {
              userId: true,
              status: true,
              score: true,
              interactiveSessionOccurrenceId: true,
            },
          },
        },
        orderBy: {
          scheduledAt: "asc",
        },
      },
      resources: true,
      wishlists: {
        select: {
          id: true,
        },
      },
      selfEnrollmentRequests: {
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
      certificates: {
        select: {
          id: true,
          userId: true,
          credentialId: true,
          issuedAt: true,
          status: true,
          fileUrl: true,
        },
      },
    },
  });

  if (!programme) {
    throw new ApiError(404, "Programme not found");
  }

  const response = new ApiResponse(
    200,
    normalizeAdminProgrammeDetail(programme),
    "Programme detail fetched successfully",
  );

  setCachedResponse(cacheKey, response, 60_000);
  return res.status(200).json(response);
});

const createAdminProgramme = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    credits,
    programmeManagerId,
    selfEnrollmentEnabled,
    selfEnrollmentSeatLimit,
    selfEnrollmentOpensAt,
    selfEnrollmentClosesAt,
    selfEnrollmentAllowedBatches,
    selfEnrollmentAllowedGenders,
    spotlightTitle,
    spotlightMessage,
  } = req.body;

  if (!title) {
    throw new ApiError(400, "Programme title is required");
  }

  if (
    selfEnrollmentSeatLimit !== undefined &&
    selfEnrollmentSeatLimit !== null &&
    selfEnrollmentSeatLimit !== "" &&
    Number(selfEnrollmentSeatLimit) <= 0
  ) {
    throw new ApiError(400, "Seat limit must be greater than 0");
  }

  if (
    selfEnrollmentOpensAt &&
    selfEnrollmentClosesAt &&
    new Date(selfEnrollmentOpensAt).getTime() >=
      new Date(selfEnrollmentClosesAt).getTime()
  ) {
    throw new ApiError(400, "Enrollment close time must be after open time");
  }

  if (programmeManagerId) {
    const manager = await db.user.findUnique({
      where: {
        id: programmeManagerId,
      },
    });

    if (!manager || manager.role !== "programme_manager") {
      throw new ApiError(400, "Assigned manager must be a programme manager");
    }
  }

  const programme = await db.programme.create({
    data: {
      title,
      description: description || null,
      credits:
        credits !== undefined && credits !== null ? Number(credits) : null,
      programmeManagerId: programmeManagerId || null,
      selfEnrollmentEnabled: !!selfEnrollmentEnabled,
      selfEnrollmentSeatLimit:
        selfEnrollmentSeatLimit !== undefined &&
        selfEnrollmentSeatLimit !== null &&
        selfEnrollmentSeatLimit !== ""
          ? Number(selfEnrollmentSeatLimit)
          : null,
      selfEnrollmentOpensAt: selfEnrollmentOpensAt
        ? new Date(selfEnrollmentOpensAt)
        : null,
      selfEnrollmentClosesAt: selfEnrollmentClosesAt
        ? new Date(selfEnrollmentClosesAt)
        : null,
      selfEnrollmentAllowedBatches: Array.isArray(selfEnrollmentAllowedBatches)
        ? selfEnrollmentAllowedBatches.filter(Boolean)
        : [],
      selfEnrollmentAllowedGenders: Array.isArray(selfEnrollmentAllowedGenders)
        ? selfEnrollmentAllowedGenders.filter(Boolean)
        : [],
      spotlightTitle: spotlightTitle || "",
      spotlightMessage: spotlightMessage || "",
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
            },
          },
        },
      },
      assignments: {
        include: {
          submissions: true,
        },
      },
      resources: true,
      wishlists: true,
    },
  });

  if (programme.selfEnrollmentEnabled) {
    const scholars = await db.user.findMany({
      where: {
        role: "scholar",
      },
      select: {
        id: true,
      },
    });

    await createNotification({
      type: "programme",
      title: `${programme.title} is now open`,
      message:
        programme.spotlightMessage ||
        `${programme.title} is available for scholar self-enrollment.`,
      userIds: scholars.map((user) => user.id),
      actorId: req.user.id,
      programmeId: programme.id,
      actionUrl: "/course-registration",
    });
  }

  clearCachedResponse("admin:");

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        normalizeProgramme(programme),
        "Programme created successfully",
      ),
    );
});

const updateAdminProgramme = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;
  const {
    title,
    description,
    credits,
    programmeManagerId,
    selfEnrollmentEnabled,
    selfEnrollmentSeatLimit,
    selfEnrollmentOpensAt,
    selfEnrollmentClosesAt,
    selfEnrollmentAllowedBatches,
    selfEnrollmentAllowedGenders,
    spotlightTitle,
    spotlightMessage,
  } = req.body;

  if (!programmeId) {
    throw new ApiError(400, "Programme ID is required");
  }

  if (
    selfEnrollmentSeatLimit !== undefined &&
    selfEnrollmentSeatLimit !== null &&
    selfEnrollmentSeatLimit !== "" &&
    Number(selfEnrollmentSeatLimit) <= 0
  ) {
    throw new ApiError(400, "Seat limit must be greater than 0");
  }

  if (
    selfEnrollmentOpensAt &&
    selfEnrollmentClosesAt &&
    new Date(selfEnrollmentOpensAt).getTime() >=
      new Date(selfEnrollmentClosesAt).getTime()
  ) {
    throw new ApiError(400, "Enrollment close time must be after open time");
  }

  const existingProgramme = await db.programme.findUnique({
    where: {
      id: programmeId,
    },
  });

  if (!existingProgramme) {
    throw new ApiError(404, "Programme not found");
  }

  if (programmeManagerId) {
    const manager = await db.user.findUnique({
      where: {
        id: programmeManagerId,
      },
    });

    if (!manager || manager.role !== "programme_manager") {
      throw new ApiError(400, "Assigned manager must be a programme manager");
    }
  }

  const updatedProgramme = await db.programme.update({
    where: {
      id: programmeId,
    },
    data: {
      ...(title ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(credits !== undefined
        ? {
            credits:
              credits !== null && credits !== ""
                ? Number(credits)
                : null,
          }
        : {}),
      ...(programmeManagerId !== undefined
        ? { programmeManagerId: programmeManagerId || null }
        : {}),
      ...(selfEnrollmentEnabled !== undefined
        ? { selfEnrollmentEnabled: !!selfEnrollmentEnabled }
        : {}),
      ...(selfEnrollmentSeatLimit !== undefined
        ? {
            selfEnrollmentSeatLimit:
              selfEnrollmentSeatLimit !== null && selfEnrollmentSeatLimit !== ""
                ? Number(selfEnrollmentSeatLimit)
                : null,
          }
        : {}),
      ...(selfEnrollmentOpensAt !== undefined
        ? {
            selfEnrollmentOpensAt: selfEnrollmentOpensAt
              ? new Date(selfEnrollmentOpensAt)
              : null,
          }
        : {}),
      ...(selfEnrollmentClosesAt !== undefined
        ? {
            selfEnrollmentClosesAt: selfEnrollmentClosesAt
              ? new Date(selfEnrollmentClosesAt)
              : null,
          }
        : {}),
      ...(selfEnrollmentAllowedBatches !== undefined
        ? {
            selfEnrollmentAllowedBatches: Array.isArray(selfEnrollmentAllowedBatches)
              ? selfEnrollmentAllowedBatches.filter(Boolean)
              : [],
          }
        : {}),
      ...(selfEnrollmentAllowedGenders !== undefined
        ? {
            selfEnrollmentAllowedGenders: Array.isArray(selfEnrollmentAllowedGenders)
              ? selfEnrollmentAllowedGenders.filter(Boolean)
              : [],
          }
        : {}),
      ...(spotlightTitle !== undefined ? { spotlightTitle: spotlightTitle || "" } : {}),
      ...(spotlightMessage !== undefined
        ? { spotlightMessage: spotlightMessage || "" }
        : {}),
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
                },
              },
            },
          },
        },
      },
      resources: true,
      wishlists: true,
    },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        normalizeProgramme(updatedProgramme),
        "Programme updated successfully",
      ),
    );
});

const processAdminProgrammeEnrollmentRequests = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;

  if (!programmeId) {
    throw new ApiError(400, "Programme ID is required");
  }

  const result = await processProgrammeEnrollmentRequests({
    programmeId,
    actorId: req.user.id,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      "Enrollment requests processed successfully",
    ),
  );
});

const deleteAdminProgramme = asyncHandler(async (req, res) => {
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

  await db.programme.delete({
    where: {
      id: programmeId,
    },
  });
  await removeProgrammeMetadata(programmeId);
  clearCachedResponse("admin:");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Programme deleted successfully"));
});

const assignScholarsToProgramme = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;
  const { scholarIds = [] } = req.body;

  if (!programmeId) {
    throw new ApiError(400, "Programme ID is required");
  }

  if (!Array.isArray(scholarIds) || scholarIds.length === 0) {
    throw new ApiError(400, "At least one scholar must be selected");
  }

  const programme = await db.programme.findUnique({
    where: {
      id: programmeId,
    },
  });

  if (!programme) {
    throw new ApiError(404, "Programme not found");
  }

  const scholars = await db.user.findMany({
    where: {
      id: {
        in: scholarIds,
      },
      role: "scholar",
    },
    select: {
      id: true,
    },
  });

  if (scholars.length !== scholarIds.length) {
    throw new ApiError(400, "One or more selected users are not scholars");
  }

  await Promise.all(
    scholarIds.map((scholarId) =>
      db.enrollment.upsert({
        where: {
          userId_programmeId: {
            userId: scholarId,
            programmeId,
          },
        },
        update: {
          status: "active",
        },
        create: {
          userId: scholarId,
          programmeId,
          status: "active",
        },
      }),
    ),
  );

  await createNotification({
    type: "programme",
    title: `Added to ${programme.title}`,
    message: `You have been enrolled in ${programme.title}. Check your programme workspace for assignments, resources, and updates.`,
    userIds: scholarIds,
    actorId: req.user.id,
    programmeId,
    actionUrl: `/my-programmes/${programmeId}`,
  });

  clearCachedResponse("admin:");
  clearCachedResponse("programmes:mine:");
  clearCachedResponse("programmes:schedule:");
  clearCachedResponse("programme:detail:");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        programmeId,
        scholarIds,
      },
      "Scholars assigned successfully",
    ),
  );
});

const removeScholarFromProgramme = asyncHandler(async (req, res) => {
  const { programmeId, scholarId } = req.params;

  const programme = await db.programme.findUnique({
    where: {
      id: programmeId,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!programme) {
    throw new ApiError(404, "Programme not found");
  }

  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_programmeId: {
        userId: scholarId,
        programmeId,
      },
    },
  });

  if (!enrollment) {
    throw new ApiError(404, "Enrollment not found");
  }

  await db.enrollment.delete({
    where: {
      userId_programmeId: {
        userId: scholarId,
        programmeId,
      },
    },
  });

  await db.selfEnrollmentRequest.updateMany({
    where: {
      programmeId,
      userId: scholarId,
      status: "accepted",
    },
    data: {
      status: "withdrawn",
      decidedAt: new Date(),
      decisionReason:
        "Your confirmed seat was removed by admin. You may submit a fresh enrollment request if the programme is still open.",
    },
  });

  clearCachedResponse("admin:");
  clearCachedResponse("programmes:discover:");
  clearCachedResponse("programmes:mine:");
  clearCachedResponse("programmes:schedule:");
  clearCachedResponse("programme:detail:");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Scholar removed successfully"));
});

const deleteAdminAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;

  if (!assignmentId) {
    throw new ApiError(400, "Assignment ID is required");
  }

  const assignment = await db.assignment.findUnique({
    where: {
      id: assignmentId,
    },
  });

  if (!assignment) {
    throw new ApiError(404, "Assignment not found");
  }

  await db.assignment.delete({
    where: {
      id: assignmentId,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Assignment deleted successfully"));
});

const getAdminReports = asyncHandler(async (req, res) => {
  const reportType = String(req.query.type || "scholar");
  const batch = typeof req.query.batch === "string" ? req.query.batch : "";
  const from = typeof req.query.from === "string" ? req.query.from : "";
  const to = typeof req.query.to === "string" ? req.query.to : "";
  const managerId =
    typeof req.query.managerId === "string" ? req.query.managerId : "";
  const cacheKey = `admin:reports:${req.user.id}:${reportType}:${batch}:${from}:${to}:${managerId}`;

  const cachedResponse = getCachedResponse(cacheKey);
  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  if (!["scholar", "programme"].includes(reportType)) {
    throw new ApiError(400, "Invalid report type");
  }

  let rows = [];

  if (reportType === "scholar") {
    const scholars = await db.user.findMany({
      where: {
        role: "scholar",
        ...(batch && batch !== "all" ? { batch } : {}),
      },
      include: {
        enrollments: {
          include: {
            programme: {
              include: {
                assignments: {
                  select: {
                    maxScore: true,
                    targetTrackGroups: true,
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
                    maxScore: true,
                    occurrences: {
                      select: {
                        id: true,
                        scheduledAt: true,
                        assignments: {
                          select: {
                            userId: true,
                          },
                        },
                      },
                      orderBy: {
                        scheduledAt: "asc",
                      },
                    },
                    attendances: {
                      select: {
                        userId: true,
                        score: true,
                        status: true,
                        interactiveSessionOccurrenceId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const maxProgrammes = Math.max(
      1,
      ...scholars.map((scholar) => scholar.enrollments.length),
    );

    rows = scholars.flatMap((scholar) => {
      const programmeColumnsTop = {};
      const programmeColumnsBottom = {};

      for (let index = 0; index < maxProgrammes; index += 1) {
        const enrollment = scholar.enrollments[index];
        const columnLabel = `Programme ${index + 1}`;

        if (!enrollment) {
          programmeColumnsTop[columnLabel] = "";
          programmeColumnsBottom[columnLabel] = "";
          continue;
        }

        const applicableAssignments = filterAssignmentsForEnrollment(
          enrollment.programme.assignments,
          enrollment,
          enrollment.programme,
        );
        const applicableSessions = filterSessionsForEnrollment(
          enrollment.programme.interactiveSessions,
          enrollment,
          enrollment.programme,
        );

        const assignmentTotal = applicableAssignments.reduce(
          (sum, assignment) => sum + (assignment.maxScore || 0),
          0,
        );
        const assignmentScored = applicableAssignments.reduce(
          (sum, assignment) =>
            sum +
            (assignment.submissions.find((entry) => entry.userId === scholar.id)?.score || 0),
          0,
        );
        const sessionTotal = applicableSessions.reduce(
          (sum, session) => sum + (session.maxScore || 0),
          0,
        );
        const sessionScored = applicableSessions.reduce(
          (sum, session) => sum + (session.attendances?.[0]?.score || 0),
          0,
        );
        const totalPossible = assignmentTotal + sessionTotal;
        const totalScored = assignmentScored + sessionScored;
        const percentage =
          totalPossible > 0
            ? Number(((totalScored / totalPossible) * 100).toFixed(2))
            : 0;

        programmeColumnsTop[columnLabel] =
          `${enrollment.programme.title} [${enrollment.status}]`;
        programmeColumnsBottom[columnLabel] =
          enrollment.status === "completed" || enrollment.status === "uncompleted"
            ? `${totalScored}/${totalPossible || 0} (${percentage}%)`
            : "";
      }

      return [
        {
          id: scholar.id,
          name: scholar.name,
          email: scholar.email,
          phoneNumber: scholar.phoneNumber || "",
          batch: scholar.batch || "",
          gender: scholar.gender || "",
          creditsEarned: scholar.creditsEarned,
          ...programmeColumnsTop,
        },
        {
          id: "",
          name: "",
          email: "",
          phoneNumber: "",
          batch: "",
          gender: "",
          creditsEarned: "",
          ...programmeColumnsBottom,
        },
      ];
    });
  }

  if (reportType === "programme") {
    const createdAtFilter = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to
        ? (() => {
            const end = new Date(to);
            end.setHours(23, 59, 59, 999);
            return { lte: end };
          })()
        : {}),
    };

    const programmes = await db.programme.findMany({
      where: {
        ...(Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {}),
        ...(managerId && managerId !== "all" ? { programmeManagerId: managerId } : {}),
      },
      include: {
        enrollments: true,
        programmeManager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: { select: { id: true } },
        interactiveSessions: { select: { id: true } },
      },
      orderBy: { title: "asc" },
    });

    rows = programmes.map((programme) => ({
      id: programme.id,
      title: programme.title,
      description: programme.description || "",
      credits: programme.credits ?? "",
      enrollmentType: programme.selfEnrollmentEnabled ? "Self-enrollable" : "Compulsory",
      managerId: programme.programmeManager?.id || "",
      managerName: programme.programmeManager?.name || "Unassigned",
      managerEmail: programme.programmeManager?.email || "",
      totalScholarsEnrolled: programme.enrollments.length,
      completedScholars: programme.enrollments.filter((entry) => entry.status === "completed").length,
      uncompletedScholars: programme.enrollments.filter((entry) => entry.status === "uncompleted").length,
      activeScholars: programme.enrollments.filter((entry) => entry.status === "active").length,
      assignmentCount: programme.assignments.length,
      interactiveSessionCount: programme.interactiveSessions.length,
      createdAt: programme.createdAt.toISOString(),
      resultsPublishedAt: programme.resultsPublishedAt?.toISOString() || "",
    }));
  }

  const response = new ApiResponse(
    200,
    {
      type: reportType,
      generatedAt: new Date().toISOString(),
      rows,
    },
    "Report generated successfully",
  );

  setCachedResponse(cacheKey, response, 300_000);
  return res.status(200).json(response);
});

const getSystemSettings = asyncHandler(async (req, res) => {
  const settings = await getAdminSettings();

  return res
    .status(200)
    .json(new ApiResponse(200, settings, "Settings fetched successfully"));
});

const updateSystemSettings = asyncHandler(async (req, res) => {
  const settings = await updateAdminSettings(req.body || {}, req.user.id);
  clearCachedResponse("admin:");

  return res
    .status(200)
    .json(new ApiResponse(200, settings, "Settings updated successfully"));
});

export {
  assignScholarsToProgramme,
  bulkCreateAdminUsers,
  createAdminProgramme,
  createAdminUser,
  deleteAdminAssignment,
  deleteAdminProgramme,
  deleteAdminUser,
  downloadAdminUserTemplate,
  getAdminSummary,
  getAdminOverview,
  getAdminProgrammes,
  getAdminProgrammeDetail,
  getAdminReports,
  getAdminUserDetail,
  getAdminUsers,
  getSystemSettings,
  processAdminProgrammeEnrollmentRequests,
  removeScholarFromProgramme,
  updateAdminProgramme,
  updateAdminUser,
  updateSystemSettings,
};
