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
