import db from "../db.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { markNotificationsAsRead } from "../utils/notificationStore.js";

const getMyNotifications = asyncHandler(async (req, res) => {
  const recipients = await db.notificationRecipient.findMany({
    where: {
      userId: req.user.id,
    },
    include: {
      notification: true,
    },
    orderBy: {
      notification: {
        createdAt: "desc",
      },
    },
  });

  return res.status(200).json(
    new ApiResponse(
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
    ),
  );
});

const markMyNotificationsRead = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const readIds = await markNotificationsAsRead(req.user.id, ids);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        readIds,
      },
      "Notifications marked as read",
    ),
  );
});

export { getMyNotifications, markMyNotificationsRead };
