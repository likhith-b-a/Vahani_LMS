export const BASE_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:3000";

const notifyAuthExpired = () => {
  window.dispatchEvent(new Event("auth:expired"));
};

export const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string,
) => {
  const resolvedAccessToken =
    accessToken || localStorage.getItem("accessToken") || "";
  const isFormData = options.body instanceof FormData;
  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (resolvedAccessToken.trim()) {
    (headers as Record<string, string>).Authorization = `Bearer ${resolvedAccessToken.trim()}`;
  }

  let res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (res.status === 401) {
    const storedRefreshToken = localStorage.getItem("refreshToken");
    if (!storedRefreshToken || !storedRefreshToken.trim()) {
      notifyAuthExpired();
      throw new Error("Session expired");
    }

    const refreshRes = await fetch(`${BASE_URL}/refresh-token`, {
      method: "POST",
      credentials: "include",
    });

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json().catch(() => null);
      const nextAccessToken = refreshData?.data?.accessToken;
      if (nextAccessToken) {
        localStorage.setItem("accessToken", nextAccessToken);
        (headers as Record<string, string>).Authorization = `Bearer ${nextAccessToken}`;
      }

      res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers,
      });
    } else {
      notifyAuthExpired();
      throw new Error("Session expired");
    }
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
};
