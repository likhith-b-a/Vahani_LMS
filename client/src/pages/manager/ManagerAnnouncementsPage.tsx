import { useMemo, useState } from "react";
import { ManagerAnnouncementsSection } from "@/components/dashboard/manager/ManagerAnnouncementsSection";
import { ManagerAnnouncementDialog } from "@/components/dashboard/manager/ManagerAnnouncementDialog";
import { useManagerAnnouncements } from "@/hooks/manager/useManagerAnnouncements";
import { useManagerProgrammes } from "@/hooks/manager/useManagerProgrammes";
import { useToast } from "@/hooks/use-toast";
import { matchesDateRange } from "@/lib/queryFilters";

export default function ManagerAnnouncementsPage() {
  const { toast } = useToast();
  const { announcementsQuery, sendAnnouncement } = useManagerAnnouncements();
  const { programmesQuery } = useManagerProgrammes();

  const announcements = announcementsQuery.data || [];
  const programmes = programmesQuery.data || [];

  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [announcementDateFrom, setAnnouncementDateFrom] = useState("");
  const [announcementDateTo, setAnnouncementDateTo] = useState("");
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);

  const filteredAnnouncements = useMemo(
    () =>
      announcements.filter((announcement) => {
        const matchesSearch = `${announcement.title} ${announcement.message} ${announcement.programme?.title || ""}`
          .toLowerCase()
          .includes(announcementSearch.toLowerCase());
        return (
          matchesSearch &&
          matchesDateRange(announcement.createdAt, announcementDateFrom, announcementDateTo)
        );
      }),
    [announcementDateFrom, announcementDateTo, announcementSearch, announcements],
  );

  const handleSendAnnouncement = async (payload: Parameters<typeof sendAnnouncement.mutateAsync>[0]) => {
    try {
      await sendAnnouncement.mutateAsync(payload);
      setShowAnnouncementDialog(false);
      toast({
        title: "Announcement sent",
        description: "The selected programme scholars will receive it in their dashboard.",
      });
    } catch {
      // toast handled by mutation's onError
    }
  };

  return (
    <>
      <ManagerAnnouncementsSection
        announcementSearch={announcementSearch}
        onAnnouncementSearchChange={setAnnouncementSearch}
        announcementDateFrom={announcementDateFrom}
        onAnnouncementDateFromChange={setAnnouncementDateFrom}
        announcementDateTo={announcementDateTo}
        onAnnouncementDateToChange={setAnnouncementDateTo}
        filteredAnnouncements={filteredAnnouncements}
        onOpenSendDialog={() => setShowAnnouncementDialog(true)}
      />

      <ManagerAnnouncementDialog
        open={showAnnouncementDialog}
        onOpenChange={setShowAnnouncementDialog}
        programmes={programmes}
        onSubmit={(payload) => void handleSendAnnouncement(payload)}
      />
    </>
  );
}
