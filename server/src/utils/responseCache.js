const RESPONSE_CACHE = global.__responseCache__ ?? new Map();

if (!global.__responseCache__) {
  global.__responseCache__ = RESPONSE_CACHE;
}

const getCachedResponse = (key) => {
  return null;
};

const setCachedResponse = (key, value, ttlMs = 10_000) => {
  return;
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
