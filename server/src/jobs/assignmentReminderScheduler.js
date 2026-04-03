import db from "../db.js";
import { sendComposedEmail } from "../utils/sendMail.js";
import { createNotification } from "../utils/notifications.js";
import { logger } from "../utils/logger.js";

const IST_OFFSET_MINUTES = 330;
const REMINDER_HOUR_IST = 7;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const REMINDER_TITLE = "Assignment due today";

let reminderTimer = null;

const getIstShiftedDate = (date = new Date()) =>
  new Date(date.getTime() + IST_OFFSET_MINUTES * MS_PER_MINUTE);

const getIstDayBounds = (date = new Date()) => {
  const istDate = getIstShiftedDate(date);
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const day = istDate.getUTCDate();

  const start = new Date(
    Date.UTC(year, month, day, 0, 0, 0, 0) - IST_OFFSET_MINUTES * MS_PER_MINUTE,
  );
  const end = new Date(start.getTime() + MS_PER_DAY);

  return {
    start,
    end,
    dayKey: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
};

const formatDateTimeForScholar = (value) =>
  new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const getDelayUntilNextReminder = (date = new Date()) => {
  const istDate = getIstShiftedDate(date);
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const day = istDate.getUTCDate();
  const nowShifted = istDate.getTime();

  let targetShifted = Date.UTC(year, month, day, REMINDER_HOUR_IST, 0, 0, 0);
  if (targetShifted <= nowShifted) {
    targetShifted += MS_PER_DAY;
  }

  return targetShifted - nowShifted;
};

const getPendingDueTodayReminders = async () => {
  const { start, end } = getIstDayBounds();

  const enrollments = await db.enrollment.findMany({
    where: {
      status: "active",
      user: {
        role: "scholar",
      },
    },
    select: {
      userId: true,
      user: {
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
          assignments: {
            where: {
              isPublished: true,
              dueDate: {
                gte: start,
                lt: end,
              },
              type: {
                not: "interactive_session",
              },
            },
            select: {
              id: true,
              title: true,
              dueDate: true,
              submissions: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const reminders = [];

  for (const enrollment of enrollments) {
    for (const assignment of enrollment.programme.assignments) {
      const alreadySubmitted = assignment.submissions.some(
        (submission) => submission.userId === enrollment.userId,
      );

      if (!alreadySubmitted) {
        reminders.push({
          userId: enrollment.user.id,
          userName: enrollment.user.name,
          email: enrollment.user.email,
          programmeId: enrollment.programme.id,
          programmeTitle: enrollment.programme.title,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          dueDate: assignment.dueDate,
        });
      }
    }
  }

  return reminders;
};

const filterAlreadySentReminders = async (reminders) => {
  if (reminders.length === 0) {
    return [];
  }

  const { start, end } = getIstDayBounds();
  const userIds = [...new Set(reminders.map((item) => item.userId))];
  const assignmentIds = [...new Set(reminders.map((item) => item.assignmentId))];

  const existingRecipients = await db.notificationRecipient.findMany({
    where: {
      userId: {
        in: userIds,
      },
      notification: {
        type: "assignment",
        title: REMINDER_TITLE,
        assignmentId: {
          in: assignmentIds,
        },
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    },
    select: {
      userId: true,
      notification: {
        select: {
          assignmentId: true,
        },
      },
    },
  });

  const sentPairs = new Set(
    existingRecipients.map(
      (item) => `${item.userId}:${item.notification.assignmentId}`,
    ),
  );

  return reminders.filter(
    (item) => !sentPairs.has(`${item.userId}:${item.assignmentId}`),
  );
};

const sendDueTodayAssignmentReminders = async () => {
  const { dayKey } = getIstDayBounds();
  const pendingReminders = await getPendingDueTodayReminders();
  const remindersToSend = await filterAlreadySentReminders(pendingReminders);

  if (remindersToSend.length === 0) {
    logger.info("Assignment reminder scheduler found no pending due-today reminders", {
      dayKey,
    });
    return;
  }

  let sentCount = 0;

  for (const reminder of remindersToSend) {
    try {
      await createNotification({
        type: "assignment",
        title: REMINDER_TITLE,
        message: `${reminder.assignmentTitle} in ${reminder.programmeTitle} is due today at ${formatDateTimeForScholar(reminder.dueDate)}.`,
        userIds: [reminder.userId],
        programmeId: reminder.programmeId,
        assignmentId: reminder.assignmentId,
        actionUrl: `/assignments?programmeId=${reminder.programmeId}`,
        metadata: {
          reminderType: "due_today",
          reminderDate: dayKey,
        },
      });

      await sendComposedEmail({
        to: [reminder.email],
        subject: `Assignment due today: ${reminder.assignmentTitle}`,
        body: `Hello ${reminder.userName},\n\nThis is a reminder that your assignment "${reminder.assignmentTitle}" for the programme "${reminder.programmeTitle}" is due today.\n\nDue time: ${formatDateTimeForScholar(reminder.dueDate)}\n\nPlease submit it on the LMS before the deadline.\n\nVahani LMS`,
      });

      sentCount += 1;
    } catch (error) {
      logger.error("Assignment reminder failed for scholar", {
        userId: reminder.userId,
        assignmentId: reminder.assignmentId,
        message: error.message,
      });
    }
  }

  logger.info("Assignment reminder scheduler sent due-today reminders", {
    dayKey,
    reminders: sentCount,
  });
};

const scheduleAssignmentReminderJob = () => {
  if (reminderTimer) {
    clearTimeout(reminderTimer);
  }

  const delay = getDelayUntilNextReminder();

  logger.info("Assignment reminder scheduler armed", {
    nextRunInMinutes: Math.round(delay / MS_PER_MINUTE),
    runHourIst: REMINDER_HOUR_IST,
  });

  reminderTimer = setTimeout(async () => {
    try {
      await sendDueTodayAssignmentReminders();
    } catch (error) {
      logger.error("Assignment reminder scheduler failed", {
        message: error.message,
      });
    } finally {
      scheduleAssignmentReminderJob();
    }
  }, delay);
};

export { scheduleAssignmentReminderJob, sendDueTodayAssignmentReminders };
