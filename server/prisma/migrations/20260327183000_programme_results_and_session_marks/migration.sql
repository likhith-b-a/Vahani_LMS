ALTER TYPE "EnrollmentStatus" ADD VALUE IF NOT EXISTS 'uncompleted';

ALTER TABLE "Programme"
ADD COLUMN IF NOT EXISTS "resultsPublishedAt" TIMESTAMP(3);

ALTER TABLE "InteractiveSession"
ADD COLUMN IF NOT EXISTS "maxScore" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "InteractiveSessionAttendance"
ADD COLUMN IF NOT EXISTS "score" INTEGER;
