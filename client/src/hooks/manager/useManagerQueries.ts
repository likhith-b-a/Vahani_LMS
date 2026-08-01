import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSupportQueries,
  getSupportQueryDetail,
  replyToSupportQuery,
  updateSupportQueryStatus,
  type QueryStatus,
  type SupportQuery,
} from "@/api/queries";
import { managerKeys } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";

export function useManagerQueries() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queriesQuery = useQuery({
    queryKey: managerKeys.queries(),
    queryFn: async () => {
      const response = await getSupportQueries();
      return Array.isArray(response?.data?.queries) ? (response.data.queries as SupportQuery[]) : [];
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to load scholar queries",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const invalidate = (queryId: string) => {
    queryClient.invalidateQueries({ queryKey: managerKeys.queries() });
    queryClient.invalidateQueries({ queryKey: managerKeys.queryDetail(queryId) });
  };

  const replyToQuery = useMutation({
    mutationFn: ({ queryId, message }: { queryId: string; message: string }) =>
      replyToSupportQuery(queryId, message),
    onSuccess: (_data, variables) => invalidate(variables.queryId),
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to send reply",
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

export function useManagerQueryDetail(queryId: string) {
  return useQuery({
    queryKey: managerKeys.queryDetail(queryId),
    queryFn: async () => {
      const response = await getSupportQueryDetail(queryId);
      return (response?.data?.query as SupportQuery) || null;
    },
    enabled: !!queryId,
  });
}
