CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent');

CREATE TABLE "InteractiveSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER DEFAULT 60,
    "meetingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "programmeId" TEXT NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "InteractiveSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InteractiveSessionAttendance" (
    "id" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'present',
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "interactiveSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "InteractiveSessionAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InteractiveSessionAttendance_interactiveSessionId_userId_key" ON "InteractiveSessionAttendance"("interactiveSessionId", "userId");

ALTER TABLE "InteractiveSession"
ADD CONSTRAINT "InteractiveSession_programmeId_fkey"
FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InteractiveSession"
ADD CONSTRAINT "InteractiveSession_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InteractiveSessionAttendance"
ADD CONSTRAINT "InteractiveSessionAttendance_interactiveSessionId_fkey"
FOREIGN KEY ("interactiveSessionId") REFERENCES "InteractiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InteractiveSessionAttendance"
ADD CONSTRAINT "InteractiveSessionAttendance_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
