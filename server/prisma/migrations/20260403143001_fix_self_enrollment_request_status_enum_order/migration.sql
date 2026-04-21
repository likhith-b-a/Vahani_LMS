DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'SelfEnrollmentRequestStatus'
  ) THEN
    CREATE TYPE "SelfEnrollmentRequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'SelfEnrollmentRequest'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'SelfEnrollmentRequest'
        AND column_name = 'status'
        AND udt_name <> 'SelfEnrollmentRequestStatus'
    ) THEN
      ALTER TABLE "SelfEnrollmentRequest"
        ALTER COLUMN "status" DROP DEFAULT;

      ALTER TABLE "SelfEnrollmentRequest"
        ALTER COLUMN "status" TYPE "SelfEnrollmentRequestStatus"
        USING "status"::"SelfEnrollmentRequestStatus";

      ALTER TABLE "SelfEnrollmentRequest"
        ALTER COLUMN "status" SET DEFAULT 'pending';
    END IF;

    CREATE INDEX IF NOT EXISTS "SelfEnrollmentRequest_programmeId_status_requestedAt_idx"
      ON "SelfEnrollmentRequest"("programmeId", "status", "requestedAt");

    CREATE INDEX IF NOT EXISTS "SelfEnrollmentRequest_userId_status_requestedAt_idx"
      ON "SelfEnrollmentRequest"("userId", "status", "requestedAt");
  END IF;
END $$;
