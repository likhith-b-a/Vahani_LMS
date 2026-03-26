import { fetchWithAuth } from "./fetchWithAuth";

export interface AnnouncementRecipientUser {
  id: string;
  name: string;
  email: string;
  batch?: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  targetBatch?: string | null;
  createdAt: string;
  updatedAt?: string;
  targetRoles?: string[];
  recipientCount?: number;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  programme?: {
    id: string;
    title: string;
  } | null;
  recipients?: Array<{
    id: string;
    user: AnnouncementRecipientUser;
  }>;
}

export interface CreateAnnouncementPayload {
  title: string;
  message: string;
  programmeId?: string;
  targetBatch?: string;
  targetRoles?: string[];
  userIds?: string[];
}

export const getAnnouncements = async () => {
  return fetchWithAuth("/announcements", {
    method: "GET",
  });
};

export const createAnnouncement = async (payload: CreateAnnouncementPayload) => {
  return fetchWithAuth("/announcements", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
