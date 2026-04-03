import { fetchWithAuth } from "./fetchWithAuth";

export interface WishlistEntry {
  id: string;
  requestedTitle: string;
  note?: string | null;
  createdAt: string;
}

export interface AdminWishlistResponse {
  wishlist: Array<{
    id: string;
    requestedTitle: string;
    note?: string | null;
    userId: string;
    userName: string;
    userEmail: string;
    userPhoneNumber?: string | null;
    userBatch?: string | null;
    createdAt: string;
  }>;
  rows: Array<Record<string, string | number | null>>;
}

export interface AdminWishlistAiOverviewResponse {
  batch: string;
  wishlistCount: number;
  model: string;
  summary: {
    totalRequests: number;
    uniqueRequestedProgrammes: number;
    topRequestedTitles: Array<{
      title: string;
      count: number;
    }>;
    batchDistribution: Array<{
      batch: string;
      count: number;
    }>;
    noteSamples: Array<{
      scholar: string;
      batch: string;
      requestedTitle: string;
      note: string;
    }>;
  };
  analysis: {
    overview: string;
    prioritySignals: Array<{
      title: string;
      reason: string;
    }>;
    recommendedActions: Array<{
      action: string;
      impact: string;
    }>;
    batchInsights: Array<{
      batch: string;
      insight: string;
    }>;
    suggestedProgrammeIdeas: Array<{
      title: string;
      why: string;
      audience: string;
    }>;
  };
  rawText: string;
}

export const getMyWishlist = async () =>
  fetchWithAuth("/wishlist/me", {
    method: "GET",
  });

export const addToWishlist = async (title: string, note?: string) =>
  fetchWithAuth("/wishlist", {
    method: "POST",
    body: JSON.stringify({ title, note }),
  });

export const removeFromWishlist = async (wishlistId: string) =>
  fetchWithAuth(`/wishlist/${wishlistId}`, {
    method: "DELETE",
  });

export const getAdminWishlist = async (batch?: string) => {
  const query = new URLSearchParams();
  if (batch && batch !== "all") query.set("batch", batch);

  return fetchWithAuth(`/wishlist/admin/all${query.toString() ? `?${query.toString()}` : ""}`, {
    method: "GET",
  });
};

export const getAdminWishlistAiOverview = async (batch?: string) => {
  const query = new URLSearchParams();
  if (batch && batch !== "all") query.set("batch", batch);

  return fetchWithAuth(
    `/wishlist/admin/ai-overview${query.toString() ? `?${query.toString()}` : ""}`,
    {
      method: "GET",
    },
  ) as Promise<{ data: AdminWishlistAiOverviewResponse; message: string }>;
};
