import db from "../db.js";

const dedupeIds = (ids = []) => [...new Set(ids.filter(Boolean))];
const normalizeMetadata = (metadata) =>
  metadata === undefined ? undefined : JSON.parse(JSON.stringify(metadata));

const createNotification = async ({
  type,
  title,
  message,
  userIds = [],
  actorId,
  programmeId,
  assignmentId,
  announcementId,
  actionUrl,
  metadata,
}) => {
  const recipientIds = dedupeIds(userIds);

  if (recipientIds.length === 0) {
    return null;
  }

  return db.notification.create({
    data: {
      type,
      title,
      message,
      actionUrl: actionUrl || null,
      metadata: normalizeMetadata(metadata),
      actorId: actorId || null,
      programmeId: programmeId || null,
      assignmentId: assignmentId || null,
      announcementId: announcementId || null,
      recipients: {
        create: recipientIds.map((userId) => ({
          userId,
        })),
      },
    },
  });
};

const getProgrammeScholarIds = async (programmeId) => {
  const enrollments = await db.enrollment.findMany({
    where: {
      programmeId,
      status: {
        in: ["active", "completed", "uncompleted"],
      },
    },
    select: {
      userId: true,
    },
  });

  return enrollments.map((enrollment) => enrollment.userId);
};

export { createNotification, getProgrammeScholarIds };
