import db from "../db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { createNotification } from "../utils/notifications.js";
import {
  clearCachedResponse,
  getCachedResponse,
  setCachedResponse,
} from "../utils/responseCache.js";

const createQuery = asyncHandler(async (req, res) => {
  const { programmeId, targetType, subject, message } = req.body;

  if (!targetType || !subject || !message) {
    throw new ApiError(400, "Target type, subject and message are required");
  }

  let assignedToId = null;

  if (targetType === "programme_manager") {
    if (!programmeId) {
      throw new ApiError(400, "Programme is required for programme manager queries");
    }

    const enrollment = await db.enrollment.findUnique({
      where: {
        userId_programmeId: {
          userId: req.user.id,
          programmeId,
        },
      },
      include: {
        programme: {
          select: {
            title: true,
            programmeManagerId: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new ApiError(403, "You can only raise queries for your enrolled programmes");
    }

    if (!enrollment.programme.programmeManagerId) {
      throw new ApiError(400, "This programme does not have a programme manager yet");
    }

    assignedToId = enrollment.programme.programmeManagerId;
  }

  const supportQuery = await db.supportQuery.create({
    data: {
      programmeId: programmeId || null,
      targetType,
      subject: String(subject).trim(),
      message: String(message).trim(),
      authorId: req.user.id,
      assignedToId,
      messages: {
        create: {
          authorId: req.user.id,
          message: String(message).trim(),
        },
      },
    },
    include: {
      messages: true,
    },
  });

  if (assignedToId) {
    await createNotification({
      type: "query",
      title: "New scholar query",
      message: supportQuery.subject,
      userIds: [assignedToId],
      actorId: req.user.id,
      programmeId: programmeId || null,
      actionUrl: "/dashboard",
    });
  }

  clearCachedResponse("queries:");

  return res.status(201).json(
    new ApiResponse(201, supportQuery, "Query created successfully"),
  );
});

const getQueryAccessWhere = (user) =>
  user.role === "scholar"
    ? { authorId: user.id }
    : user.role === "programme_manager"
      ? { assignedToId: user.id }
      : {
          OR: [{ targetType: "admin" }, { assignedToId: user.id }],
        };

const getQueries = asyncHandler(async (req, res) => {
  const cacheKey = `queries:${req.user.role}:${req.user.id}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  const where = getQueryAccessWhere(req.user);

  const queries = await db.supportQuery.findMany({
    where,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          batch: true,
        },
      },
      assignedTo: {
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
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const response = new ApiResponse(
    200,
    { queries },
    "Queries fetched successfully",
  );

  setCachedResponse(cacheKey, response, 10_000);
  return res.status(200).json(response);
});

const getQueryDetail = asyncHandler(async (req, res) => {
  const { queryId } = req.params;
  const cacheKey = `queries:detail:${req.user.role}:${req.user.id}:${queryId}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  const query = await db.supportQuery.findFirst({
    where: {
      id: queryId,
      ...getQueryAccessWhere(req.user),
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          batch: true,
        },
      },
      assignedTo: {
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
      messages: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!query) {
    throw new ApiError(404, "Query not found");
  }

  const response = new ApiResponse(
    200,
    { query },
    "Query fetched successfully",
  );

  setCachedResponse(cacheKey, response, 10_000);
  return res.status(200).json(response);
});

const replyToQuery = asyncHandler(async (req, res) => {
  const { queryId } = req.params;
  const { message } = req.body;

  if (!message) {
    throw new ApiError(400, "Message is required");
  }

  const supportQuery = await db.supportQuery.findUnique({
    where: {
      id: queryId,
    },
  });

  if (!supportQuery) {
    throw new ApiError(404, "Query not found");
  }

  if (
    req.user.role === "scholar" &&
    supportQuery.authorId !== req.user.id
  ) {
    throw new ApiError(403, "You can only reply to your own queries");
  }

  if (
    req.user.role === "programme_manager" &&
    supportQuery.assignedToId !== req.user.id
  ) {
    throw new ApiError(403, "This query is not assigned to you");
  }

  const reply = await db.supportQueryMessage.create({
    data: {
      queryId,
      authorId: req.user.id,
      message: String(message).trim(),
    },
  });

  await db.supportQuery.update({
    where: {
      id: queryId,
    },
    data: {
      status: req.user.role === "scholar" ? "open" : "in_progress",
    },
  });

  const notifyUserId =
    req.user.role === "scholar"
      ? supportQuery.assignedToId
      : supportQuery.authorId;

  if (notifyUserId) {
    await createNotification({
      type: "query",
      title: "Query updated",
      message: supportQuery.subject,
      userIds: [notifyUserId],
      actorId: req.user.id,
      programmeId: supportQuery.programmeId,
      actionUrl: "/dashboard",
    });
  }

  clearCachedResponse("queries:");

  return res.status(201).json(
    new ApiResponse(201, reply, "Query reply added successfully"),
  );
});

const updateQueryStatus = asyncHandler(async (req, res) => {
  const { queryId } = req.params;
  const { status } = req.body;

  if (!status) {
    throw new ApiError(400, "Status is required");
  }

  const supportQuery = await db.supportQuery.findUnique({
    where: {
      id: queryId,
    },
  });

  if (!supportQuery) {
    throw new ApiError(404, "Query not found");
  }

  if (
    req.user.role === "programme_manager" &&
    supportQuery.assignedToId !== req.user.id
  ) {
    throw new ApiError(403, "This query is not assigned to you");
  }

  if (req.user.role === "scholar") {
    throw new ApiError(403, "Scholars cannot update query status");
  }

  const updatedQuery = await db.supportQuery.update({
    where: {
      id: queryId,
    },
    data: {
      status,
      resolvedAt:
        status === "resolved" || status === "closed" ? new Date() : null,
    },
  });

  await createNotification({
    type: "query",
    title: "Query status updated",
    message: `${updatedQuery.subject} is now ${updatedQuery.status.replace("_", " ")}.`,
    userIds: [updatedQuery.authorId],
    actorId: req.user.id,
    programmeId: updatedQuery.programmeId,
    actionUrl: "/dashboard",
  });

  clearCachedResponse("queries:");

  return res.status(200).json(
    new ApiResponse(200, updatedQuery, "Query status updated successfully"),
  );
});

export { createQuery, getQueries, getQueryDetail, replyToQuery, updateQueryStatus };
