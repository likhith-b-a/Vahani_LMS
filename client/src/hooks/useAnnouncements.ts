import { useCallback, useMemo, useState } from "react";
import { getAnnouncements, type Announcement } from "@/api/announcements";
import { useToast } from "@/hooks/use-toast";

export interface UseAnnouncementsOptions {
  loadErrorTitle?: string;
}

export function useAnnouncementsState({
  loadErrorTitle = "Unable to load announcements",
}: UseAnnouncementsOptions = {}) {
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);

  const reloadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAnnouncements();
      const nextAnnouncements = Array.isArray(response?.data?.announcements)
        ? (response.data.announcements as Announcement[])
        : [];
      setAnnouncements(nextAnnouncements);
    } catch (error) {
      toast({
        title: loadErrorTitle,
        description: error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [loadErrorTitle, toast]);

  const announcementCount = useMemo(() => announcements.length, [announcements]);

  return {
    announcements,
    loading,
    reloadAnnouncements,
    announcementCount,
  };
}
