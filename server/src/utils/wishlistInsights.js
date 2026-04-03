import { ApiError } from "./ApiError.js";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const stripJsonCodeFence = (value = "") =>
  value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const parseModelJson = (value = "") => {
  const cleaned = stripJsonCodeFence(value);
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

const buildWishlistSummary = (wishlist = []) => {
  const titleCounts = new Map();
  const batchCounts = new Map();
  const noteSamples = [];

  wishlist.forEach((entry) => {
    const normalizedTitle = String(entry.requestedTitle || "").trim();
    if (normalizedTitle) {
      titleCounts.set(normalizedTitle, (titleCounts.get(normalizedTitle) || 0) + 1);
    }

    const batch = String(entry.userBatch || "").trim() || "Unknown";
    batchCounts.set(batch, (batchCounts.get(batch) || 0) + 1);

    if (entry.note && noteSamples.length < 20) {
      noteSamples.push({
        scholar: entry.userName,
        batch,
        requestedTitle: normalizedTitle,
        note: String(entry.note).trim(),
      });
    }
  });

  return {
    totalRequests: wishlist.length,
    uniqueRequestedProgrammes: titleCounts.size,
    topRequestedTitles: Array.from(titleCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 12)
      .map(([title, count]) => ({ title, count })),
    batchDistribution: Array.from(batchCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([batch, count]) => ({ batch, count })),
    noteSamples,
  };
};

const buildWishlistPrompt = (summary) => `
You are helping an education programme admin understand scholar wishlist demand.

Analyse the following wishlist summary and return only valid JSON with this exact shape:
{
  "overview": "short paragraph",
  "prioritySignals": [
    { "title": "string", "reason": "string" }
  ],
  "recommendedActions": [
    { "action": "string", "impact": "string" }
  ],
  "batchInsights": [
    { "batch": "string", "insight": "string" }
  ],
  "suggestedProgrammeIdeas": [
    { "title": "string", "why": "string", "audience": "string" }
  ]
}

Keep it concise, practical, and tailored for an admin deciding what programmes to launch or prioritize next.

Wishlist summary:
${JSON.stringify(summary, null, 2)}
`;

const getWishlistAiOverview = async (wishlist = []) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new ApiError(500, "Gemini API key is not configured");
  }

  const summary = buildWishlistSummary(wishlist);
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: buildWishlistPrompt(summary),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        responseMimeType: "application/json",
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error?.message || "Gemini request failed",
    );
  }

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || "";

  const parsed = parseModelJson(text);

  if (!parsed) {
    throw new ApiError(502, "Gemini returned an invalid analysis payload");
  }

  return {
    model,
    summary,
    analysis: parsed,
    rawText: text,
  };
};

export { getWishlistAiOverview };
