import db from "../db.js";

const getReadNotificationIds = async (userId) => {
  const recipients = await db.notificationRecipient.findMany({
    where: {
      userId,
      isRead: true,
    },
    select: {
      notificationId: true,
    },
  });

  return recipients.map((recipient) => recipient.notificationId);
};

const markNotificationsAsRead = async (userId, notificationIds) => {
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return getReadNotificationIds(userId);
  }

  await db.notificationRecipient.updateMany({
    where: {
      userId,
      notificationId: {
        in: notificationIds,
      },
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return getReadNotificationIds(userId);
};

export { getReadNotificationIds, markNotificationsAsRead };
