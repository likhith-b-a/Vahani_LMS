import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAnnouncement,
  getAnnouncements,
  type Announcement,
  type CreateAnnouncementPayload,
} from "@/api/announcements";
import { adminKeys } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";

export function useAdminAnnouncements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const announcementsQuery = useQuery({
    queryKey: adminKeys.announcements(),
    queryFn: async () => {
      const response = await getAnnouncements();
      return Array.isArray(response?.data?.announcements)
        ? (response.data.announcements as Announcement[])
        : [];
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to load announcements",
          description: error instanceof Error ? error.message : "Please try again shortly.",
          variant: "destructive",
        });
      },
    },
  });

  const sendAnnouncement = useMutation({
    mutationFn: (payload: CreateAnnouncementPayload) => createAnnouncement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.announcements() });
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Could not send announcement",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  return { announcementsQuery, sendAnnouncement };
}
