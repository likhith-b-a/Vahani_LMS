import { db } from "../src/db.js";

const programmeId = process.argv[2];
const shouldExecute = process.argv.includes("--execute");
const shouldReplaceExistingSessions = process.argv.includes("--replace-existing");

const sessionLabels = [
  "1st Session",
  "2nd Session",
  "3rd Session",
  "4th Session",
  "5th Session",
  "6th Session",
  "7th Session",
  "8th Session",
  "9th Session",
  "10th Session",
];

const sessionDates = [
  "2026-02-02T10:00:00+05:30",
  "2026-02-05T10:00:00+05:30",
  "2026-02-08T10:00:00+05:30",
  "2026-02-11T10:00:00+05:30",
  "2026-02-14T10:00:00+05:30",
  "2026-02-17T10:00:00+05:30",
  "2026-02-20T10:00:00+05:30",
  "2026-02-23T10:00:00+05:30",
  "2026-02-26T10:00:00+05:30",
  "2026-02-28T10:00:00+05:30",
];

// Row order must match the currently enrolled scholars order shown in the programme detail UI.
const attendanceMatrix = [
  ["present", "absent", "present", "present", "present", "present", "present", "present", "present"],
  ["present", "present", "absent", "present", "present", "present", "present", "present", "present"],
  ["present", "absent", "present", "present", "present", "present", "present", "present", "absent"],
  ["present", "present", "absent", "present", "present", "present", "present", "present", "present"],
  ["present", "present", "present", "absent", "present", "present", "present", "absent", "absent"],
  ["present", "present", "present", "present", "present", "absent", "present", "present", "absent"],
  ["present", "present", "present", "present", "present", "present", "present", "present", "absent"],
  ["present", "present", "present", "absent", "present", "present", "present", "present", "present"],
  ["present", "present", "present", "present", "present", "present", "present", "present", "present"],
  ["present", "present", "present", "present", "absent", "present", "present", "absent", "absent"],
  ["present", "present", "present", "present", "present", "absent", "present", "present", "present"],
  ["present", "present", "present", "present", "present", "present", "present", "present", "present"],
  ["present", "present", "present", "present", "present", "present", "present", "present", "present"],
  ["present", "present", "present", "present", "present", "absent", "present", "absent", "present"],
  ["consideration", "present", "present", "present", "present", "present", "present", "present", "present"],
  ["present", "present", "present", "present", "present", "absent", "present", "present", "absent"],
  ["present", "present", "present", "present", "present", "present", "present", "present", "present"],
  ["present", "present", "absent", "present", "present", "present", "absent", "present", "present"],
  ["present", "present", "absent", "present", "present", "absent", "present", "present", "absent"],
  ["present", "absent", "absent", "present", "present", "present", "present", "absent", "absent"],
  ["present", "present", "absent", "present", "present", "absent", "present", "present", "present"],
  ["present", "absent", "present", "present", "absent", "present", "present", "present", "present"],
  ["present", "present", "absent", "present", "absent", "present", "absent", "present", "absent"],
  ["present", "present", "absent", "present", "absent", "present", "absent", "present", "absent"],
];

async function main() {
  if (!programmeId) {
    throw new Error(
      "Programme ID is required. Use: node scripts/backfill-excel-programme-sessions.js <programmeId> [--execute] [--replace-existing]",
    );
  }

  const programme = await db.programme.findUnique({
    where: { id: programmeId },
    include: {
      interactiveSessions: {
        select: {
          id: true,
          title: true,
        },
      },
      enrollments: {
        where: {
          status: {
            in: ["active", "completed", "uncompleted"],
          },
        },
        orderBy: {
          enrolledAt: "asc",
        },
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
  });

  if (!programme) {
    throw new Error("Programme not found");
  }

  if (programme.enrollments.length !== attendanceMatrix.length) {
    throw new Error(
      `Enrollment count mismatch. Programme has ${programme.enrollments.length} scholars, but the provided matrix has ${attendanceMatrix.length} rows.`,
    );
  }

  if (programme.interactiveSessions.length > 0 && !shouldReplaceExistingSessions) {
    throw new Error(
      `Programme already has ${programme.interactiveSessions.length} interactive session(s). Re-run with --replace-existing if you want to replace them.`,
    );
  }

  console.log(`\nProgramme: ${programme.title}`);
  console.log(`Programme ID: ${programme.id}`);
  console.log(`Scholars: ${programme.enrollments.length}`);
  console.log(`Existing interactive sessions: ${programme.interactiveSessions.length}`);
  console.log("\nRow order that will be used:\n");
  console.table(
    programme.enrollments.map((enrollment, index) => ({
      row: index + 1,
      scholar: enrollment.user.name,
      email: enrollment.user.email,
      batch: enrollment.user.batch || "",
    })),
  );

  if (!shouldExecute) {
    console.log(
      "\nPreview only. No sessions were created.\nRun with --execute to write interactive sessions and attendance.\nAdd --replace-existing to delete current interactive sessions first.\n",
    );
    return;
  }

  await db.$transaction(async (tx) => {
    if (shouldReplaceExistingSessions && programme.interactiveSessions.length > 0) {
      await tx.interactiveSession.deleteMany({
        where: {
          programmeId,
        },
      });
    }

    for (let sessionIndex = 0; sessionIndex < sessionLabels.length; sessionIndex += 1) {
      const scheduledAt = new Date(sessionDates[sessionIndex]);

      const interactiveSession = await tx.interactiveSession.create({
        data: {
          title: sessionLabels[sessionIndex],
          description: `${sessionLabels[sessionIndex]} backfilled from the ongoing Excel programme sheet.`,
          scheduledAt,
          durationMinutes: 60,
          maxScore: 0,
          programmeId,
          occurrences: {
            create: {
              scheduledAt,
              durationMinutes: 60,
              assignments: {
                create: programme.enrollments.map((enrollment) => ({
                  userId: enrollment.userId,
                })),
              },
            },
          },
        },
        include: {
          occurrences: true,
        },
      });

      const occurrenceId = interactiveSession.occurrences[0]?.id;

      if (!occurrenceId) {
        throw new Error(`Failed to create occurrence for ${sessionLabels[sessionIndex]}`);
      }

      if (sessionIndex < 9) {
        const attendanceRows = programme.enrollments.map((enrollment, rowIndex) => {
          const sourceStatus = attendanceMatrix[rowIndex][sessionIndex];
          const normalizedStatus =
            sourceStatus && sourceStatus.toLowerCase() === "absent" ? "absent" : "present";

          return {
            interactiveSessionId: interactiveSession.id,
            interactiveSessionOccurrenceId: occurrenceId,
            userId: enrollment.userId,
            status: normalizedStatus,
            score: 0,
            markedAt: new Date(),
          };
        });

        await tx.interactiveSessionAttendance.createMany({
          data: attendanceRows,
        });
      }
    }
  });

  console.log(
    "\nBackfill complete. 10 interactive sessions were created, all scholars were assigned to each session date, and attendance was marked for the first 9 sessions.\n",
  );
}

main()
  .catch((error) => {
    console.error("\nBackfill failed:", error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
