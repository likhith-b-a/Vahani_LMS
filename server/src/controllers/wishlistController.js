import db from "../db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const getMyWishlist = asyncHandler(async (req, res) => {
  const wishlist = await db.$queryRaw`
    SELECT
      id,
      "requestedTitle",
      note,
      "createdAt"
    FROM "ProgrammeWishlist"
    WHERE "userId" = ${req.user.id}
    ORDER BY "createdAt" DESC
  `;

  return res.status(200).json(
    new ApiResponse(200, { wishlist }, "Wishlist fetched successfully"),
  );
});

const addToWishlist = asyncHandler(async (req, res) => {
  const { title, note } = req.body;
  const normalizedTitle = typeof title === "string" ? title.trim() : "";

  if (!normalizedTitle) {
    throw new ApiError(400, "Programme title is required");
  }

  const existingCount = await db.programmeWishlist.count({
    where: {
      userId: req.user.id,
    },
  });

  const existingEntries = await db.$queryRaw`
    SELECT
      id,
      "requestedTitle"
    FROM "ProgrammeWishlist"
    WHERE "userId" = ${req.user.id}
  `;

  const alreadyExists = existingEntries.find(
    (entry) =>
      typeof entry.requestedTitle === "string" &&
      entry.requestedTitle.toLowerCase() === normalizedTitle.toLowerCase(),
  );

  if (!alreadyExists && existingCount >= 5) {
    throw new ApiError(400, "You can only keep up to 5 programmes in your wishlist");
  }

  if (alreadyExists) {
    await db.$executeRaw`
      UPDATE "ProgrammeWishlist"
      SET
        "requestedTitle" = ${normalizedTitle},
        note = ${note || null}
      WHERE id = ${alreadyExists.id}
    `;
  } else {
    await db.$executeRaw`
      INSERT INTO "ProgrammeWishlist" ("id", "requestedTitle", note, "createdAt", "userId")
      VALUES (gen_random_uuid()::text, ${normalizedTitle}, ${note || null}, NOW(), ${req.user.id})
    `;
  }

  const [wishlistEntry] = await db.$queryRaw`
    SELECT
      id,
      "requestedTitle",
      note,
      "createdAt"
    FROM "ProgrammeWishlist"
    WHERE "userId" = ${req.user.id}
      AND LOWER("requestedTitle") = LOWER(${normalizedTitle})
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;

  return res.status(201).json(
    new ApiResponse(201, wishlistEntry, "Programme request added to wishlist"),
  );
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const { wishlistId } = req.params;

  const [wishlistEntry] = await db.$queryRaw`
    SELECT id
    FROM "ProgrammeWishlist"
    WHERE id = ${wishlistId}
      AND "userId" = ${req.user.id}
    LIMIT 1
  `;

  if (!wishlistEntry) {
    throw new ApiError(404, "Wishlist entry not found");
  }

  await db.$executeRaw`
    DELETE FROM "ProgrammeWishlist"
    WHERE id = ${wishlistId}
  `;

  return res.status(200).json(
    new ApiResponse(200, {}, "Programme removed from wishlist"),
  );
});

const getAdminWishlist = asyncHandler(async (_req, res) => {
  const batch = typeof _req.query.batch === "string" ? _req.query.batch : "";
  const wishlist =
    batch && batch !== "all"
      ? await db.$queryRaw`
          SELECT
            pw.id,
            pw."requestedTitle",
            pw.note,
            pw."createdAt",
            u.id AS "userId",
            u.name AS "userName",
            u.email AS "userEmail",
            u."phoneNumber" AS "userPhoneNumber",
            u.batch AS "userBatch"
          FROM "ProgrammeWishlist" pw
          INNER JOIN "User" u
            ON u.id = pw."userId"
          WHERE u.batch = ${batch}
          ORDER BY pw."createdAt" ASC
        `
      : await db.$queryRaw`
          SELECT
            pw.id,
            pw."requestedTitle",
            pw.note,
            pw."createdAt",
            u.id AS "userId",
            u.name AS "userName",
            u.email AS "userEmail",
            u."phoneNumber" AS "userPhoneNumber",
            u.batch AS "userBatch"
          FROM "ProgrammeWishlist" pw
          INNER JOIN "User" u
            ON u.id = pw."userId"
          ORDER BY pw."createdAt" ASC
        `;

  const grouped = new Map();

  for (const entry of wishlist) {
    const current = grouped.get(entry.userId) || {
      id: entry.userId,
      name: entry.userName,
      email: entry.userEmail,
      phoneNumber: entry.userPhoneNumber || "",
      batch: entry.userBatch || "",
      programmes: [],
    };
    current.programmes.push(entry.requestedTitle);
    grouped.set(entry.userId, current);
  }

  const rows = Array.from(grouped.values())
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      email: entry.email,
      phoneNumber: entry.phoneNumber,
      batch: entry.batch,
      "programme 1": entry.programmes[0] || "",
      "programme 2": entry.programmes[1] || "",
      "programme 3": entry.programmes[2] || "",
      "programme 4": entry.programmes[3] || "",
      "programme 5": entry.programmes[4] || "",
    }));

  return res.status(200).json(
    new ApiResponse(200, { wishlist, rows }, "Admin wishlist fetched successfully"),
  );
});

export { addToWishlist, getAdminWishlist, getMyWishlist, removeFromWishlist };
