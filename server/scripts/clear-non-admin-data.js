import { db } from "../src/db.js";

const shouldExecute = process.argv.includes("--execute");

const counters = [
  ["Admin users", () => db.user.count({ where: { role: "admin" } })],
  ["Non-admin users", () => db.user.count({ where: { role: { not: "admin" } } })],
  ["Programmes", () => db.programme.count()],
  ["Enrollments", () => db.enrollment.count()],
  ["Assignments", () => db.assignment.count()],
  ["Submissions", () => db.submission.count()],
  ["Programme resources", () => db.programmeResource.count()],
  ["Interactive sessions", () => db.interactiveSession.count()],
  ["Interactive session occurrences", () => db.interactiveSessionOccurrence.count()],
  [
    "Interactive session occurrence assignments",
    () => db.interactiveSessionOccurrenceAssignment.count(),
  ],
  ["Interactive session attendances", () => db.interactiveSessionAttendance.count()],
  ["Announcements", () => db.announcement.count()],
  ["Announcement recipients", () => db.announcementRecipient.count()],
  ["Notifications", () => db.notification.count()],
  ["Notification recipients", () => db.notificationRecipient.count()],
  ["Certificates", () => db.certificate.count()],
  ["Wishlist entries", () => db.programmeWishlist.count()],
  ["Support queries", () => db.supportQuery.count()],
  ["Support query messages", () => db.supportQueryMessage.count()],
  ["Self-enrollment requests", () => db.selfEnrollmentRequest.count()],
  ["Password reset OTPs", () => db.passwordResetOtp.count()],
  ["System settings", () => db.systemSetting.count()],
];

const deletionSteps = [
  () => db.supportQueryMessage.deleteMany(),
  () => db.notificationRecipient.deleteMany(),
  () => db.announcementRecipient.deleteMany(),
  () => db.interactiveSessionAttendance.deleteMany(),
  () => db.interactiveSessionOccurrenceAssignment.deleteMany(),
  () => db.interactiveSessionOccurrence.deleteMany(),
  () => db.submission.deleteMany(),
  () => db.certificate.deleteMany(),
  () => db.programmeWishlist.deleteMany(),
  () => db.supportQuery.deleteMany(),
  () => db.notification.deleteMany(),
  () => db.announcement.deleteMany(),
  () => db.programmeResource.deleteMany(),
  () => db.assignment.deleteMany(),
  () => db.interactiveSession.deleteMany(),
  () => db.selfEnrollmentRequest.deleteMany(),
  () => db.enrollment.deleteMany(),
  () => db.programme.deleteMany(),
  () => db.passwordResetOtp.deleteMany(),
  () => db.systemSetting.deleteMany(),
  () => db.user.deleteMany({ where: { role: { not: "admin" } } }),
];

async function collectCounts() {
  const results = [];

  for (const [label, fn] of counters) {
    results.push([label, await fn()]);
  }

  return results;
}

async function main() {
  const beforeCounts = await collectCounts();

  console.log("\nCurrent data snapshot:\n");
  console.table(
    beforeCounts.map(([table, count]) => ({
      table,
      count,
    })),
  );

  if (!shouldExecute) {
    console.log(
      "\nPreview only. No data was deleted.\nRun `node scripts/clear-non-admin-data.js --execute` to delete all app data except admin users.\n",
    );
    return;
  }

  for (const step of deletionSteps) {
    await step();
  }

  const afterCounts = await collectCounts();

  console.log("\nData cleared. Remaining counts:\n");
  console.table(
    afterCounts.map(([table, count]) => ({
      table,
      count,
    })),
  );
}

main()
  .catch((error) => {
    console.error("\nFailed to clear data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
