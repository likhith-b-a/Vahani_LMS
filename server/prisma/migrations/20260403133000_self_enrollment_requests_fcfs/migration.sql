-- AlterTable
ALTER TABLE "Programme"
ADD COLUMN "selfEnrollmentSeatLimit" INTEGER,
ADD COLUMN "selfEnrollmentOpensAt" TIMESTAMP(3),
ADD COLUMN "selfEnrollmentClosesAt" TIMESTAMP(3),
ADD COLUMN "selfEnrollmentAllowedBatches" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "selfEnrollmentAllowedGenders" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "gender" TEXT;

-- CreateTable
CREATE TABLE "SelfEnrollmentRequest" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "programmeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SelfEnrollmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SelfEnrollmentRequest_programmeId_userId_key" ON "SelfEnrollmentRequest"("programmeId", "userId");

-- CreateIndex
CREATE INDEX "SelfEnrollmentRequest_programmeId_status_requestedAt_idx" ON "SelfEnrollmentRequest"("programmeId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "SelfEnrollmentRequest_userId_status_requestedAt_idx" ON "SelfEnrollmentRequest"("userId", "status", "requestedAt");

-- AddForeignKey
ALTER TABLE "SelfEnrollmentRequest" ADD CONSTRAINT "SelfEnrollmentRequest_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelfEnrollmentRequest" ADD CONSTRAINT "SelfEnrollmentRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
