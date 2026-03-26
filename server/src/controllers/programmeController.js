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

  const resource = await db.programmeResource.create({
    data: {
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      url: String(url).trim(),
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
  getDiscoverableProgrammes,
  getManagedProgrammes,
  getMyProgrammes,
  getProgrammeDetail,
  selfEnrollInProgramme,
};
