import { useMutation } from "@tanstack/react-query";
import { getAdminReport, type AdminReportResponse } from "@/api/admin";
import { getAdminWishlist, getAdminWishlistAiOverview } from "@/api/wishlist";
import { useToast } from "@/hooks/use-toast";

export function useAdminReports() {
  const { toast } = useToast();

  const generateReport = useMutation({
    mutationFn: async (params: {
      type: "scholar" | "programme";
      filters?: { batch?: string; from?: string; to?: string; managerId?: string };
    }) => {
      const response = await getAdminReport(params.type, params.filters);
      return response.data as AdminReportResponse;
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to generate report",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const generateWishlistReport = useMutation({
    mutationFn: async (batch: string) => {
      const response = await getAdminWishlist(batch !== "all" ? batch : undefined);
      const rows = Array.isArray(response?.data?.rows) ? response.data.rows : [];
      return {
        type: "wishlist",
        generatedAt: new Date().toISOString(),
        rows,
      } as AdminReportResponse;
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to generate wishlist report",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const generateWishlistAiOverview = useMutation({
    mutationFn: async (batch: string) => {
      const response = await getAdminWishlistAiOverview(batch !== "all" ? batch : undefined);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "AI wishlist overview ready",
        description: "Gemini generated programme suggestions from scholar wishlist demand.",
      });
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to generate AI wishlist overview",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  return { generateReport, generateWishlistReport, generateWishlistAiOverview };
}
