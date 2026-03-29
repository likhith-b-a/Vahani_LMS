import { fetchWithAuth } from "./fetchWithAuth";

export type QueryTargetType = "programme_manager" | "admin";
export type QueryStatus = "open" | "in_progress" | "resolved" | "closed";

export interface SupportQueryMessage {
  id: string;
  message: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

export interface SupportQuery {
  id: string;
  subject: string;
  message: string;
  status: QueryStatus;
  targetType: QueryTargetType;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  programme: {
    id: string;
    title: string;
  } | null;
  author: {
    id: string;
    name: string;
    email: string;
    batch?: string | null;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  messages?: SupportQueryMessage[];
  _count?: {
    messages: number;
  };
}

export const getMyQueries = async () => {
  return fetchWithAuth("/queries", {
    method: "GET",
    cacheTtlMs: 10_000,
    cacheKey: "queries:list",
  });
};

export const getSupportQueries = getMyQueries;

export const getSupportQueryDetail = async (queryId: string) => {
  return fetchWithAuth(`/queries/${queryId}`, {
    method: "GET",
    cacheTtlMs: 10_000,
    cacheKey: `queries:detail:${queryId}`,
  });
};

export const createSupportQuery = async (payload: {
  programmeId?: string;
  targetType: QueryTargetType;
  subject: string;
  message: string;
}) => {
  return fetchWithAuth("/queries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const replyToSupportQuery = async (queryId: string, message: string) => {
  return fetchWithAuth(`/queries/${queryId}/messages`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
};

export const updateSupportQueryStatus = async (
  queryId: string,
  status: QueryStatus,
) => {
  return fetchWithAuth(`/queries/${queryId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
};
