import db from "../db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const getMyWishlist = asyncHandler(async (req, res) => {
  const wishlist = await db.programmeWishlist.findMany({
    where: {
      userId: req.user.id,
    },
    include: {
      programme: {
        include: {
          programmeManager: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.status(200).json(
    new ApiResponse(200, { wishlist }, "Wishlist fetched successfully"),
  );
});

const addToWishlist = asyncHandler(async (req, res) => {
  const { programmeId, note } = req.body;

  if (!programmeId) {
    throw new ApiError(400, "Programme is required");
  }

  const programme = await db.programme.findUnique({
    where: {
      id: programmeId,
    },
  });

  if (!programme) {
    throw new ApiError(404, "Programme not found");
  }

  const wishlistEntry = await db.programmeWishlist.upsert({
    where: {
      programmeId_userId: {
        programmeId,
        userId: req.user.id,
      },
    },
    update: {
      note: note || null,
    },
    create: {
      programmeId,
      userId: req.user.id,
      note: note || null,
    },
  });

  return res.status(201).json(
    new ApiResponse(201, wishlistEntry, "Programme added to wishlist"),
  );
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;

  await db.programmeWishlist.delete({
    where: {
      programmeId_userId: {
        programmeId,
        userId: req.user.id,
      },
    },
  });

  return res.status(200).json(
    new ApiResponse(200, {}, "Programme removed from wishlist"),
  );
});

const getAdminWishlist = asyncHandler(async (_req, res) => {
  const wishlist = await db.programmeWishlist.findMany({
    include: {
      programme: {
        select: {
          id: true,
          title: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          batch: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.status(200).json(
    new ApiResponse(200, { wishlist }, "Admin wishlist fetched successfully"),
  );
});

export { addToWishlist, getAdminWishlist, getMyWishlist, removeFromWishlist };
