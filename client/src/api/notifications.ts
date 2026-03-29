import { fetchWithAuth } from "./fetchWithAuth";

export interface AppNotification {
  id: string;
  type:
    | "ANNOUNCEMENT"
    | "PROGRAMME"
    | "ASSIGNMENT"
    | "GRADE"
    | "RESOURCE"
    | "MEETING"
    | "QUERY"
    | "CERTIFICATE"
    | "SYSTEM";
  title: string;
  message: string;
  createdAt: string;
  programmeId?: string;
  assignmentId?: string;
  actionLabel?: string;
  isRead: boolean;
}

export const getMyNotifications = async () => {
  return fetchWithAuth("/notifications/me", {
    method: "GET",
    cacheTtlMs: 15_000,
    cacheKey: "scholar:notifications",
  });
};

export const markNotificationsRead = async (ids: string[]) => {
  return fetchWithAuth("/notifications/read", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
};
