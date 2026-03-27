ALTER TABLE "ProgrammeWishlist"
ADD COLUMN IF NOT EXISTS "requestedTitle" TEXT;

UPDATE "ProgrammeWishlist" pw
SET "requestedTitle" = p."title"
FROM "Programme" p
WHERE pw."programmeId" = p."id"
  AND (pw."requestedTitle" IS NULL OR pw."requestedTitle" = '');

UPDATE "ProgrammeWishlist"
SET "requestedTitle" = 'Requested programme'
WHERE "requestedTitle" IS NULL OR "requestedTitle" = '';

ALTER TABLE "ProgrammeWishlist"
ALTER COLUMN "requestedTitle" SET NOT NULL;

ALTER TABLE "ProgrammeWishlist"
ALTER COLUMN "programmeId" DROP NOT NULL;

DROP INDEX IF EXISTS "ProgrammeWishlist_programmeId_userId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ProgrammeWishlist_userId_requestedTitle_key"
ON "ProgrammeWishlist"("userId", "requestedTitle");
