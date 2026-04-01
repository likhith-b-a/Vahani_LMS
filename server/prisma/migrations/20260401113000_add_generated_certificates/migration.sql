ALTER TABLE "Certificate"
ADD COLUMN "credentialId" TEXT,
ADD COLUMN "scholarName" TEXT,
ADD COLUMN "programmeTitle" TEXT;

WITH certificate_defaults AS (
  SELECT
    c.id,
    u.name AS scholar_name,
    p.title AS programme_title,
    ROW_NUMBER() OVER (ORDER BY c."createdAt", c.id) AS serial_number
  FROM "Certificate" c
  JOIN "User" u ON u.id = c."userId"
  JOIN "Programme" p ON p.id = c."programmeId"
)
UPDATE "Certificate" c
SET
  "scholarName" = cd.scholar_name,
  "programmeTitle" = cd.programme_title,
  "credentialId" = CONCAT(
    'VAH',
    'LM',
    RIGHT(EXTRACT(YEAR FROM COALESCE(c."issuedAt", c."createdAt"))::TEXT, 2),
    LPAD(cd.serial_number::TEXT, 3, '0')
  )
FROM certificate_defaults cd
WHERE c.id = cd.id;

ALTER TABLE "Certificate"
ALTER COLUMN "credentialId" SET NOT NULL,
ALTER COLUMN "scholarName" SET NOT NULL,
ALTER COLUMN "programmeTitle" SET NOT NULL;

CREATE UNIQUE INDEX "Certificate_credentialId_key" ON "Certificate"("credentialId");
