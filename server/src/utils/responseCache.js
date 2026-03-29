const RESPONSE_CACHE = global.__responseCache__ ?? new Map();

if (!global.__responseCache__) {
  global.__responseCache__ = RESPONSE_CACHE;
}

const getCachedResponse = (key) => {
  const entry = RESPONSE_CACHE.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    RESPONSE_CACHE.delete(key);
    return null;
  }

  return entry.value;
};

const setCachedResponse = (key, value, ttlMs = 10_000) => {
  RESPONSE_CACHE.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
};

const clearCachedResponse = (matcher) => {
  if (!matcher) {
    RESPONSE_CACHE.clear();
    return;
  }

  for (const key of RESPONSE_CACHE.keys()) {
    if (
      (typeof matcher === "string" && key.startsWith(matcher)) ||
      (matcher instanceof RegExp && matcher.test(key))
    ) {
      RESPONSE_CACHE.delete(key);
    }
  }
};

export { clearCachedResponse, getCachedResponse, setCachedResponse };
