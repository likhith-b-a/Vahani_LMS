import db from "../db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import {
  getAdminSettings,
  updateAdminSettings,
} from "../utils/adminSettingsStore.js";
import { serializeAssignment } from "../utils/assignmentMetadata.js";
import {
  removeProgrammeMetadata,
} from "../utils/programmeMetadataStore.js";
import { createNotification } from "../utils/notifications.js";

const normalizeUser = (user) => ({
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
});

const normalizeProgramme = (programme) => {
  const totalScholars = programme.enrollments.length;

  return {
    id: programme.id,
    title: programme.title,
    description: programme.description,
    credits: programme.credits,
    createdAt: programme.createdAt,
    selfEnrollmentEnabled: !!programme.selfEnrollmentEnabled,
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

const getAdminOverview = asyncHandler(async (req, res) => {
  const [
    users,
    programmes,
    assignmentsCount,
    submissionsCount,
    gradedSubmissionsCount,
    settings,
  ] = await Promise.all([
    db.user.findMany({
      include: {
        managedProgrammes: true,
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
        submissions: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    db.programme.findMany({
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
          orderBy: {
            dueDate: "asc",
          },
        },
        resources: true,
        wishlists: true,
      },
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

  return res.status(200).json(
    new ApiResponse(
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
    ),
  );
});

const getAdminUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
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

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { users: users.map(normalizeUser) },
        "Users fetched successfully",
      ),
    );
});

const createAdminUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, batch, phoneNumber, creditsEarned } = req.body;

  if (!name || !email || !password || !role) {
    throw new ApiError(400, "Name, email, password and role are required");
  }

  if (!["scholar", "programme_manager", "admin"].includes(role)) {
    throw new ApiError(400, "Invalid role");
  }

  const existingUser = await db.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists");
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      password,
      role,
      batch: batch || null,
      phoneNumber: phoneNumber || null,
      creditsEarned:
        creditsEarned !== undefined && creditsEarned !== null
          ? Number(creditsEarned)
          : 0,
    },
  });

  return res
    .status(201)
    .json(
      new ApiResponse(201, normalizeUser(user), "User created successfully"),
    );
});

const updateAdminUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { name, email, password, role, batch, phoneNumber, creditsEarned } = req.body;

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
      ...(password ? { password } : {}),
      ...(role ? { role } : {}),
      ...(batch !== undefined ? { batch: batch || null } : {}),
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
        orderBy: {
          dueDate: "asc",
        },
      },
      resources: true,
      wishlists: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        programmes: programmes.map((programme) => normalizeProgramme(programme)),
      },
      "Programmes fetched successfully",
    ),
  );
});

const createAdminProgramme = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    credits,
    programmeManagerId,
    selfEnrollmentEnabled,
    spotlightTitle,
    spotlightMessage,
  } = req.body;

  if (!title) {
    throw new ApiError(400, "Programme title is required");
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
    spotlightTitle,
    spotlightMessage,
  } = req.body;

  if (!programmeId) {
    throw new ApiError(400, "Programme ID is required");
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
  const reportType = String(req.query.type || "enrollment");

  if (!["enrollment", "progress", "evaluations"].includes(reportType)) {
    throw new ApiError(400, "Invalid report type");
  }

  let rows = [];

  if (reportType === "enrollment") {
    const enrollments = await db.enrollment.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        programme: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        enrolledAt: "desc",
      },
    });

    rows = enrollments.map((enrollment) => ({
      scholarName: enrollment.user.name,
      scholarEmail: enrollment.user.email,
      programme: enrollment.programme.title,
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
    }));
  }

  if (reportType === "progress") {
    const programmes = await db.programme.findMany({
      include: {
        assignments: {
          include: {
            submissions: true,
          },
        },
        enrollments: true,
      },
      orderBy: {
        title: "asc",
      },
    });

    rows = programmes.map((programme) => ({
      programme: programme.title,
      scholars: programme.enrollments.length,
      assignments: programme.assignments.length,
      submissions: programme.assignments.reduce(
        (count, assignment) => count + assignment.submissions.length,
        0,
      ),
      gradedSubmissions: programme.assignments.reduce(
        (count, assignment) =>
          count +
          assignment.submissions.filter((submission) => submission.score !== null)
            .length,
        0,
      ),
    }));
  }

  if (reportType === "evaluations") {
    const submissions = await db.submission.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        assignment: {
          include: {
            programme: {
              select: {
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

    rows = submissions.map((submission) => ({
      scholarName: submission.user.name,
      scholarEmail: submission.user.email,
      programme: submission.assignment.programme.title,
      assignment: submission.assignment.title,
      submittedAt: submission.submittedAt,
      score: submission.score,
      status: submission.score === null ? "SUBMITTED" : "GRADED",
    }));
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        type: reportType,
        generatedAt: new Date().toISOString(),
        rows,
      },
      "Report generated successfully",
    ),
  );
});

const getSystemSettings = asyncHandler(async (req, res) => {
  const settings = await getAdminSettings();

  return res
    .status(200)
    .json(new ApiResponse(200, settings, "Settings fetched successfully"));
});

const updateSystemSettings = asyncHandler(async (req, res) => {
  const settings = await updateAdminSettings(req.body || {}, req.user.id);

  return res
    .status(200)
    .json(new ApiResponse(200, settings, "Settings updated successfully"));
});

export {
  assignScholarsToProgramme,
  createAdminProgramme,
  createAdminUser,
  deleteAdminAssignment,
  deleteAdminProgramme,
  deleteAdminUser,
  getAdminOverview,
  getAdminProgrammes,
  getAdminReports,
  getAdminUsers,
  getSystemSettings,
  removeScholarFromProgramme,
  updateAdminProgramme,
  updateAdminUser,
  updateSystemSettings,
};
