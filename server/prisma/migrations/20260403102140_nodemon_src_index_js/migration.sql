/*
  Warnings:

  - The `status` column on the `SelfEnrollmentRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SelfEnrollmentRequestStatus" AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

-- AlterTable
ALTER TABLE "SelfEnrollmentRequest" DROP COLUMN "status",
ADD COLUMN     "status" "SelfEnrollmentRequestStatus" NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "SelfEnrollmentRequest_programmeId_status_requestedAt_idx" ON "SelfEnrollmentRequest"("programmeId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "SelfEnrollmentRequest_userId_status_requestedAt_idx" ON "SelfEnrollmentRequest"("userId", "status", "requestedAt");
