import db from "../db.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { markNotificationsAsRead } from "../utils/notificationStore.js";
import {
  clearCachedResponse,
  getCachedResponse,
  setCachedResponse,
} from "../utils/responseCache.js";

const getMyNotifications = asyncHandler(async (req, res) => {
  const cacheKey = `notifications:${req.user.id}`;
  const cachedResponse = getCachedResponse(cacheKey);

  if (cachedResponse) {
    return res.status(200).json(cachedResponse);
  }

  const recipients = await db.notificationRecipient.findMany({
    where: {
      userId: req.user.id,
    },
    select: {
      isRead: true,
      notificationId: true,
      notification: {
        select: {
          type: true,
          title: true,
          message: true,
          createdAt: true,
          programmeId: true,
          assignmentId: true,
          actionUrl: true,
          metadata: true,
        },
      },
    },
    orderBy: {
      notification: {
        createdAt: "desc",
      },
    },
    take: 50,
  });

  const response = new ApiResponse(
    200,
    {
      notifications: recipients.map((recipient) => ({
        id: recipient.notificationId,
        type: recipient.notification.type.toUpperCase(),
        title: recipient.notification.title,
        message: recipient.notification.message,
        createdAt: recipient.notification.createdAt,
        programmeId: recipient.notification.programmeId,
        assignmentId: recipient.notification.assignmentId,
        actionLabel: recipient.notification.actionUrl ? "Open" : "",
        actionUrl: recipient.notification.actionUrl,
        metadata: recipient.notification.metadata,
        isRead: recipient.isRead,
      })),
    },
    "Notifications fetched successfully",
  );

  setCachedResponse(cacheKey, response, 10_000);
  return res.status(200).json(response);
});

const markMyNotificationsRead = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  await markNotificationsAsRead(req.user.id, ids);
  clearCachedResponse(`notifications:${req.user.id}`);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        readIds: ids,
      },
      "Notifications marked as read",
    ),
  );
});

export { getMyNotifications, markMyNotificationsRead };
