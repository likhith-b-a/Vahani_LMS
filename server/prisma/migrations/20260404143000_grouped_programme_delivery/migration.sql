-- AlterTable
ALTER TABLE "Programme"
ADD COLUMN "groupedDeliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "groupTrackGroups" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "groupSessionSlots" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Enrollment"
ADD COLUMN "trackGroup" TEXT,
ADD COLUMN "sessionSlot" TEXT;

-- AlterTable
ALTER TABLE "Assignment"
ADD COLUMN "targetTrackGroups" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "InteractiveSession"
ADD COLUMN "targetSessionSlots" TEXT[] DEFAULT ARRAY[]::TEXT[];
