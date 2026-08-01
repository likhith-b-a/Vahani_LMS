import { useQuery } from "@tanstack/react-query";
import { getAdminSummary, type AdminSummary } from "@/api/admin";
import { adminKeys } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";

export function useAdminSummary() {
  const { toast } = useToast();

  return useQuery({
    queryKey: adminKeys.summary(),
    queryFn: async () => {
      const response = await getAdminSummary();
      return response.data as AdminSummary;
    },
    meta: {
      onError: (error: unknown) => {
        toast({
          title: "Failed to load admin dashboard",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });
}
