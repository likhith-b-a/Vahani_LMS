import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSupportQueries,
  getSupportQueryDetail,
  replyToSupportQuery,
  updateSupportQueryStatus,
  type QueryStatus,
  type SupportQuery,
} from "@/api/queries";
import { adminKeys } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";

export function useAdminQueries() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queriesQuery = useQuery({
    queryKey: adminKeys.queries(),
    queryFn: async () => {
      const response = await getSupportQueries();
      return Array.isArray(response?.data?.queries) ? (response.data.queries as SupportQuery[]) : [];
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to load support queries",
          description: error instanceof Error ? error.message : "Please try again shortly.",
          variant: "destructive",
        });
      },
    },
  });

  const invalidate = (queryId: string) => {
    queryClient.invalidateQueries({ queryKey: adminKeys.queries() });
    queryClient.invalidateQueries({ queryKey: adminKeys.queryDetail(queryId) });
  };

  const replyToQuery = useMutation({
    mutationFn: ({ queryId, message }: { queryId: string; message: string }) =>
      replyToSupportQuery(queryId, message),
    onSuccess: (_data, variables) => invalidate(variables.queryId),
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to reply",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const updateQueryStatus = useMutation({
    mutationFn: ({ queryId, status }: { queryId: string; status: QueryStatus }) =>
      updateSupportQueryStatus(queryId, status),
    onSuccess: (_data, variables) => invalidate(variables.queryId),
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to update query",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  return { queriesQuery, replyToQuery, updateQueryStatus };
}

export function useAdminQueryDetail(queryId: string) {
  return useQuery({
    queryKey: adminKeys.queryDetail(queryId),
    queryFn: async () => {
      const response = await getSupportQueryDetail(queryId);
      return (response?.data?.query as SupportQuery) || null;
    },
    enabled: !!queryId,
  });
}
