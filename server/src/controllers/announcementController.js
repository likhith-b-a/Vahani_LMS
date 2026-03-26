import db from "../db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { createNotification } from "../utils/notifications.js";

const resolveRecipients = async ({
  actor,
  programmeId,
  targetBatch,
  targetRoles = [],
  userIds = [],
}) => {
  if (Array.isArray(userIds) && userIds.length > 0) {
    const users = await db.user.findMany({
      where: {
        id: {
          in: userIds,
        },
        ...(actor.role === "programme_manager"
          ? {
              role: "scholar",
              enrollments: {
                some: {
                  programme: {
                    programmeManagerId: actor.id,
                  },
                  ...(programmeId ? { programmeId } : {}),
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });
    return users.map((user) => user.id);
  }

  if (actor.role === "programme_manager") {
    const where = {
      role: "scholar",
      ...(targetBatch ? { batch: targetBatch } : {}),
      enrollments: {
        some: {
          ...(programmeId ? { programmeId } : {}),
          programme: {
            programmeManagerId: actor.id,
          },
        },
      },
    };

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
      },
    });

    return users.map((user) => user.id);
  }

  const normalizedRoles =
    Array.isArray(targetRoles) && targetRoles.length > 0
      ? targetRoles.filter((role) =>
          ["scholar", "programme_manager", "admin"].includes(role),
        )
      : ["scholar"];

  const roleConditions = normalizedRoles.map((role) => {
    if (role === "scholar") {
      return {
        role,
        ...(targetBatch ? { batch: targetBatch } : {}),
        ...(programmeId
          ? {
              enrollments: {
                some: {
                  programmeId,
                },
              },
            }
          : {}),
      };
    }

    if (role === "programme_manager") {
      return {
        role,
        ...(programmeId
          ? {
              managedProgrammes: {
                some: {
                  id: programmeId,
                },
              },
            }
          : {}),
      };
    }

    return {
      role,
    };
  });

  const users = await db.user.findMany({
    where: {
      OR: roleConditions,
    },
    select: {
      id: true,
    },
  });

  return users.map((user) => user.id);
};

const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, programmeId, targetBatch, targetRoles, userIds } =
    req.body;

  if (!title || !message) {
    throw new ApiError(400, "Title and message are required");
  }

  if (req.user.role === "programme_manager") {
    if (!programmeId) {
      throw new ApiError(400, "Programme managers must choose a programme");
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
      throw new ApiError(403, "You can only announce within your managed programmes");
    }
  }

  const recipientIds = await resolveRecipients({
    actor: req.user,
    programmeId,
    targetBatch,
    targetRoles: Array.isArray(targetRoles) ? targetRoles : [],
    userIds: Array.isArray(userIds) ? userIds : [],
  });

  if (recipientIds.length === 0) {
    throw new ApiError(400, "No recipients matched the selected filters");
  }

  const announcement = await db.announcement.create({
    data: {
      title: String(title).trim(),
      message: String(message).trim(),
      programmeId: programmeId || null,
      targetBatch: targetBatch || null,
      createdById: req.user.id,
      recipients: {
        create: recipientIds.map((userId) => ({
          userId,
        })),
      },
    },
    include: {
      recipients: true,
    },
  });

  await createNotification({
    type: "announcement",
    title: announcement.title,
    message: announcement.message,
    userIds: recipientIds,
    actorId: req.user.id,
    programmeId: programmeId || null,
    announcementId: announcement.id,
    actionUrl: programmeId ? `/my-programmes/${programmeId}` : "/dashboard",
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        announcement: {
          ...announcement,
          recipientCount: recipientIds.length,
          targetRoles:
            req.user.role === "programme_manager"
              ? ["scholar"]
              : Array.isArray(targetRoles) && targetRoles.length > 0
                ? targetRoles
                : ["scholar"],
        },
      },
      "Announcement sent successfully",
    ),
  );
});

const getAnnouncements = asyncHandler(async (req, res) => {
  let announcements;

  if (req.user.role === "scholar") {
    announcements = await db.announcementRecipient.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        announcement: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
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
        announcement: {
          createdAt: "desc",
        },
      },
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          announcements: announcements.map((item) => item.announcement),
        },
        "Announcements fetched successfully",
      ),
    );
  }

  announcements = await db.announcement.findMany({
    where: {
      createdById: req.user.id,
    },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        recipients: {
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
      programme: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        announcements,
      },
      "Announcements fetched successfully",
    ),
  );
});

export { createAnnouncement, getAnnouncements };
