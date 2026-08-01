import { useEffect, useState } from "react";

export function usePinnedQueries(storageKey: string) {
  const [pinnedQueryIds, setPinnedQueryIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setPinnedQueryIds(parsed.filter((item): item is string => typeof item === "string"));
      }
    } catch {
      setPinnedQueryIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(pinnedQueryIds));
  }, [pinnedQueryIds, storageKey]);

  const togglePinnedQuery = (queryId: string) => {
    setPinnedQueryIds((current) =>
      current.includes(queryId)
        ? current.filter((id) => id !== queryId)
        : [queryId, ...current],
    );
  };

  return { pinnedQueryIds, togglePinnedQuery } as const;
}
