import { useCallback, useMemo, useState } from "react";
import { getSupportQueries, type SupportQuery } from "@/api/queries";
import { useToast } from "@/hooks/use-toast";

export interface UseSupportQueriesOptions {
  loadErrorTitle?: string;
}

export function useSupportQueriesState({
  loadErrorTitle = "Unable to load queries",
}: UseSupportQueriesOptions = {}) {
  const { toast } = useToast();
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [loading, setLoading] = useState(false);

  const reloadQueries = useCallback(
    async (_preferredQueryId?: string) => {
      try {
        setLoading(true);
        const response = await getSupportQueries();
        const nextQueries = Array.isArray(response?.data?.queries)
          ? (response.data.queries as SupportQuery[])
          : [];
        setQueries(nextQueries);
      } catch (error) {
        toast({
          title: loadErrorTitle,
          description: error instanceof Error ? error.message : "Please try again shortly.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [loadErrorTitle, toast],
  );

  const openQueryCount = useMemo(
    () => queries.filter((query) => query.status === "open").length,
    [queries],
  );

  const activeQueryCount = useMemo(
    () =>
      queries.filter(
        (query) => query.status !== "closed" && query.status !== "resolved",
      ).length,
    [queries],
  );

  return {
    queries,
    loading,
    reloadQueries,
    openQueryCount,
    activeQueryCount,
  };
}
