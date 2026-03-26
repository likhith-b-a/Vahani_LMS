import { fetchWithAuth } from "./fetchWithAuth";

export const getMyProfile = async () => {
  return fetchWithAuth("/me", {
    method: "GET",
  });
};

export const updateMyProfile = async (payload: { name: string }) => {
  return fetchWithAuth("/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};
