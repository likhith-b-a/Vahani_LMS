export const adminKeys = {
  summary: () => ["admin", "summary"] as const,
  users: (params?: object) => ["admin", "users", params ?? {}] as const,
  programmes: (params?: object) => ["admin", "programmes", params ?? {}] as const,
  announcements: () => ["admin", "announcements"] as const,
  queries: () => ["admin", "queries"] as const,
  queryDetail: (queryId: string) => ["admin", "queries", queryId] as const,
  settings: () => ["admin", "settings"] as const,
  wishlistAiOverview: (batch: string) => ["admin", "wishlist-ai-overview", batch] as const,
};

export const managerKeys = {
  programmes: () => ["manager", "programmes"] as const,
  programmeDetail: (programmeId: string) => ["manager", "programmes", programmeId] as const,
  announcements: () => ["manager", "announcements"] as const,
  queries: () => ["manager", "queries"] as const,
  queryDetail: (queryId: string) => ["manager", "queries", queryId] as const,
  submissions: (programmeId: string, assignmentId: string) =>
    ["manager", "submissions", programmeId, assignmentId] as const,
};
