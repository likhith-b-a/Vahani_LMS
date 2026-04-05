import { fetchWithAuth } from "./fetchWithAuth";

export interface MyProfileProgramme {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  status: string;
  enrolledAt: string;
  programmeManagerId: string | null;
  programmeManager: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface MyProfileResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  batch?: string | null;
  gender?: string | null;
  phoneNumber?: string | null;
  creditsEarned?: number;
  enrollments: MyProfileProgramme[];
}

export const getMyProfile = async () => {
  return fetchWithAuth("/me", {
    method: "GET",
    cacheTtlMs: 45_000,
    cacheKey: "scholar:profile",
  });
};

export const updateMyProfile = async (payload: {
  name: string;
  batch?: string;
  gender?: string;
  phoneNumber?: string;
}) => {
  return fetchWithAuth("/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};
