-- Add occurrences to model multi-date delivery for one logical interactive session.
CREATE TABLE "InteractiveSessionOccurrence" (
    "id" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER DEFAULT 60,
    "meetingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interactiveSessionId" TEXT NOT NULL,
    CONSTRAINT "InteractiveSessionOccurrence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InteractiveSessionOccurrenceAssignment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interactiveSessionOccurrenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "InteractiveSessionOccurrenceAssignment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InteractiveSessionAttendance"
ADD COLUMN "interactiveSessionOccurrenceId" TEXT;

CREATE INDEX "InteractiveSessionOccurrence_interactiveSessionId_scheduledAt_idx"
ON "InteractiveSessionOccurrence"("interactiveSessionId", "scheduledAt");

CREATE UNIQUE INDEX "InteractiveSessionOccurrenceAssignment_interactiveSessionOccurrenceId_userId_key"
ON "InteractiveSessionOccurrenceAssignment"("interactiveSessionOccurrenceId", "userId");

CREATE INDEX "InteractiveSessionOccurrenceAssignment_userId_idx"
ON "InteractiveSessionOccurrenceAssignment"("userId");

CREATE INDEX "InteractiveSessionAttendance_interactiveSessionOccurrenceId_idx"
ON "InteractiveSessionAttendance"("interactiveSessionOccurrenceId");

ALTER TABLE "InteractiveSessionOccurrence"
ADD CONSTRAINT "InteractiveSessionOccurrence_interactiveSessionId_fkey"
FOREIGN KEY ("interactiveSessionId") REFERENCES "InteractiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InteractiveSessionOccurrenceAssignment"
ADD CONSTRAINT "InteractiveSessionOccurrenceAssignment_interactiveSessionOccurrenceId_fkey"
FOREIGN KEY ("interactiveSessionOccurrenceId") REFERENCES "InteractiveSessionOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InteractiveSessionOccurrenceAssignment"
ADD CONSTRAINT "InteractiveSessionOccurrenceAssignment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InteractiveSessionAttendance"
ADD CONSTRAINT "InteractiveSessionAttendance_interactiveSessionOccurrenceId_fkey"
FOREIGN KEY ("interactiveSessionOccurrenceId") REFERENCES "InteractiveSessionOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill one occurrence per existing interactive session so old data remains visible.
INSERT INTO "InteractiveSessionOccurrence" (
    "id",
    "scheduledAt",
    "durationMinutes",
    "meetingUrl",
    "createdAt",
    "updatedAt",
    "interactiveSessionId"
)
SELECT
    gen_random_uuid()::text,
    "scheduledAt",
    "durationMinutes",
    "meetingUrl",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    "id"
FROM "InteractiveSession";

UPDATE "InteractiveSessionAttendance" AS attendance
SET "interactiveSessionOccurrenceId" = occurrence."id"
FROM "InteractiveSessionOccurrence" AS occurrence
WHERE occurrence."interactiveSessionId" = attendance."interactiveSessionId";

INSERT INTO "InteractiveSessionOccurrenceAssignment" (
    "id",
    "interactiveSessionOccurrenceId",
    "userId"
)
SELECT
    gen_random_uuid()::text,
    occurrence."id",
    enrollment."userId"
FROM "InteractiveSessionOccurrence" AS occurrence
INNER JOIN "InteractiveSession" AS session
    ON session."id" = occurrence."interactiveSessionId"
INNER JOIN "Enrollment" AS enrollment
    ON enrollment."programmeId" = session."programmeId"
WHERE enrollment."status" IN ('active', 'completed', 'uncompleted')
ON CONFLICT ("interactiveSessionOccurrenceId", "userId") DO NOTHING;
