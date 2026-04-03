export const BASE_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:3000";

type CachedEntry = {
  expiresAt: number;
  data: unknown;
};

export interface FetchWithAuthOptions extends RequestInit {
  cacheTtlMs?: number;
  cacheKey?: string;
  bypassCache?: boolean;
}

const MEMORY_CACHE = new Map<string, CachedEntry>();
const IN_FLIGHT_REQUESTS = new Map<string, Promise<unknown>>();
const STORAGE_PREFIX = "api-cache:";

const notifyAuthExpired = () => {
  clearApiCache();
  window.dispatchEvent(new Event("auth:expired"));
};

const getUserCacheNamespace = () => {
  try {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      return "guest";
    }

    const parsedUser = JSON.parse(storedUser) as { id?: string };
    return parsedUser?.id || "guest";
  } catch {
    return "guest";
  }
};

const getCacheStorageKey = (cacheKey: string) =>
  `${STORAGE_PREFIX}${getUserCacheNamespace()}:${cacheKey}`;

const readCachedResponse = (cacheKey: string): unknown | null => {
  return null;
};

const writeCachedResponse = (
  cacheKey: string,
  data: unknown,
  cacheTtlMs: number,
) => {
  return;
};

export const clearApiCache = () => {
  MEMORY_CACHE.clear();
  IN_FLIGHT_REQUESTS.clear();

  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore storage access issues.
  }
};

const performRequest = async (
  endpoint: string,
  options: RequestInit,
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
    (headers as Record<string, string>).Authorization =
      `Bearer ${resolvedAccessToken.trim()}`;
  }

  let res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    cache: "no-store",
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
      cache: "no-store",
      credentials: "include",
    });

    if (refreshRes.ok) {
      const refreshData = await refreshRes.json().catch(() => null);
      const nextAccessToken = refreshData?.data?.accessToken;
      if (nextAccessToken) {
        localStorage.setItem("accessToken", nextAccessToken);
        (headers as Record<string, string>).Authorization =
          `Bearer ${nextAccessToken}`;
      }

      res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        cache: "no-store",
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

export const fetchWithAuth = async <T = any>(
  endpoint: string,
  options: FetchWithAuthOptions = {},
  accessToken?: string,
): Promise<T> => {
  const {
    cacheTtlMs = 0,
    cacheKey = endpoint,
    bypassCache = false,
    ...requestOptions
  } = options;
  const method = (requestOptions.method || "GET").toUpperCase();
  const shouldCache = false;

  if (shouldCache) {
    const cachedResponse = readCachedResponse(cacheKey);
    if (cachedResponse !== null) {
      return cachedResponse as T;
    }

    const inFlight = IN_FLIGHT_REQUESTS.get(cacheKey);
    if (inFlight) {
      return inFlight as Promise<T>;
    }
  }

  const requestPromise = performRequest(endpoint, requestOptions, accessToken)
    .then((data) => {
      if (shouldCache) {
        writeCachedResponse(cacheKey, data, cacheTtlMs);
      } else if (method !== "GET") {
        clearApiCache();
      }

      return data;
    })
    .finally(() => {
      if (shouldCache) {
        IN_FLIGHT_REQUESTS.delete(cacheKey);
      }
    });

  if (shouldCache) {
    IN_FLIGHT_REQUESTS.set(cacheKey, requestPromise);
  }

  return requestPromise as Promise<T>;
};
