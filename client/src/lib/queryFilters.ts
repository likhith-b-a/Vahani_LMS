import type { QueryStatus } from "@/api/queries";

export type QueryTimeRangeFilter = "all" | "7d" | "30d" | "90d";

export const queryStatusLabels: Record<QueryStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const matchesDateRange = (
  value: string | null | undefined,
  from: string,
  to: string,
) => {
  if (!value) return !from && !to;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return false;
  if (from && target < new Date(from).getTime()) return false;
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    if (target > toDate.getTime()) return false;
  }
  return true;
};

export const isWithinTimeRange = (
  value: string | null | undefined,
  timeRange: QueryTimeRangeFilter,
) => {
  if (timeRange === "all") {
    return true;
  }
  if (!value) {
    return false;
  }

  const target = new Date(value).getTime();
  if (Number.isNaN(target)) {
    return false;
  }

  const dayMap: Record<Exclude<QueryTimeRangeFilter, "all">, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };

  return Date.now() - target <= dayMap[timeRange] * 24 * 60 * 60 * 1000;
};
