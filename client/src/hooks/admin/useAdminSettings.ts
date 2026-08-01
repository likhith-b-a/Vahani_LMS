import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminSettings, updateAdminSettings, type AdminSettings } from "@/api/admin";
import { adminKeys } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";

export function useAdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: adminKeys.settings(),
    queryFn: async () => {
      const response = await getAdminSettings();
      return response.data as AdminSettings;
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to load settings",
          description: error instanceof Error ? error.message : "Please try again shortly.",
          variant: "destructive",
        });
      },
    },
  });

  const saveSettings = useMutation({
    mutationFn: (payload: Partial<AdminSettings>) => updateAdminSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.settings() });
      queryClient.invalidateQueries({ queryKey: adminKeys.summary() });
      toast({ title: "Settings saved", description: "Admin settings were updated." });
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to save settings",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  return { settingsQuery, saveSettings };
}
