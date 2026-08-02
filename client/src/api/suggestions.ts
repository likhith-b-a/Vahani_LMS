import { fetchWithAuth } from "./fetchWithAuth";

export type SuggestionCategory = "suggestion" | "issue" | "new_feature" | "recommendation";

export interface SuggestionEntry {
  id: string;
  category: SuggestionCategory;
  subject: string;
  note?: string | null;
  createdAt: string;
}

export const getMySuggestions = async () =>
  fetchWithAuth("/suggestions/me", {
    method: "GET",
  });

export const addSuggestion = async (
  category: SuggestionCategory,
  subject: string,
  note?: string,
) =>
  fetchWithAuth("/suggestions", {
    method: "POST",
    body: JSON.stringify({ category, subject, note }),
  });

export const removeSuggestion = async (suggestionId: string) =>
  fetchWithAuth(`/suggestions/${suggestionId}`, {
    method: "DELETE",
  });

export const getAdminSuggestions = async (batch?: string) => {
  const query = new URLSearchParams();
  if (batch && batch !== "all") query.set("batch", batch);

  return fetchWithAuth(
    `/suggestions/admin/all${query.toString() ? `?${query.toString()}` : ""}`,
    {
      method: "GET",
    },
  );
};
