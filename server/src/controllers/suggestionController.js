import db from "../db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const VALID_CATEGORIES = ["suggestion", "issue", "new_feature", "recommendation"];

const getMySuggestions = asyncHandler(async (req, res) => {
  const suggestions = await db.suggestion.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json(
    new ApiResponse(200, { suggestions }, "Suggestions fetched successfully"),
  );
});

const addSuggestion = asyncHandler(async (req, res) => {
  const { category, subject, note } = req.body;
  const normalizedSubject = typeof subject === "string" ? subject.trim() : "";

  if (!normalizedSubject) {
    throw new ApiError(400, "Subject is required");
  }

  if (category && !VALID_CATEGORIES.includes(category)) {
    throw new ApiError(400, "Invalid category");
  }

  const suggestion = await db.suggestion.create({
    data: {
      category: category || "suggestion",
      subject: normalizedSubject,
      note: note?.trim() || null,
      userId: req.user.id,
    },
  });

  return res.status(201).json(
    new ApiResponse(201, suggestion, "Suggestion submitted successfully"),
  );
});

const removeSuggestion = asyncHandler(async (req, res) => {
  const { suggestionId } = req.params;

  const suggestion = await db.suggestion.findFirst({
    where: { id: suggestionId, userId: req.user.id },
  });

  if (!suggestion) {
    throw new ApiError(404, "Suggestion not found");
  }

  await db.suggestion.delete({ where: { id: suggestionId } });

  return res.status(200).json(
    new ApiResponse(200, {}, "Suggestion removed"),
  );
});

const getAdminSuggestions = asyncHandler(async (req, res) => {
  const batch = typeof req.query.batch === "string" ? req.query.batch : "";

  const suggestions = await db.suggestion.findMany({
    where: batch && batch !== "all" ? { user: { batch } } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, phoneNumber: true, batch: true },
      },
    },
  });

  return res.status(200).json(
    new ApiResponse(200, { suggestions }, "Admin suggestions fetched successfully"),
  );
});

export {
  addSuggestion,
  getAdminSuggestions,
  getMySuggestions,
  removeSuggestion,
};
