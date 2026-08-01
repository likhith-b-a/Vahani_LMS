import { useMemo, useState } from "react";
import { AdminAnnouncementsSection } from "@/components/dashboard/admin/AdminAnnouncementsSection";
import { AdminAnnouncementDialog } from "@/components/dashboard/admin/AdminAnnouncementDialog";
import { useAdminAnnouncements } from "@/hooks/admin/useAdminAnnouncements";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { useAdminProgrammes } from "@/hooks/admin/useAdminProgrammes";
import { useToast } from "@/hooks/use-toast";
import { matchesDateRange } from "@/lib/queryFilters";

export default function AdminAnnouncementsPage() {
  const { toast } = useToast();
  const { announcementsQuery, sendAnnouncement } = useAdminAnnouncements();
  const { usersQuery } = useAdminUsers();
  const { programmesQuery } = useAdminProgrammes();

  const announcements = announcementsQuery.data || [];
  const users = usersQuery.data?.users || [];
  const programmes = programmesQuery.data?.programmes || [];

  const scholars = users.filter((entry) => entry.role === "scholar");
  const scholarBatches = useMemo(
    () =>
      Array.from(
        new Set(scholars.map((entry) => entry.batch).filter((entry): entry is string => Boolean(entry))),
      ).sort(),
    [scholars],
  );

  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [announcementDateFrom, setAnnouncementDateFrom] = useState("");
  const [announcementDateTo, setAnnouncementDateTo] = useState("");
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);

  const filteredAnnouncements = useMemo(
    () =>
      announcements.filter((announcement) => {
        const searchTarget =
          `${announcement.title} ${announcement.message} ${announcement.programme?.title || ""}`.toLowerCase();
        const matchesSearch =
          !announcementSearch.trim() || searchTarget.includes(announcementSearch.toLowerCase());
        const matchesTimeline = matchesDateRange(
          announcement.createdAt,
          announcementDateFrom,
          announcementDateTo,
        );
        return matchesSearch && matchesTimeline;
      }),
    [announcementDateFrom, announcementDateTo, announcementSearch, announcements],
  );

  const handleSendAnnouncement = async (payload: Parameters<typeof sendAnnouncement.mutateAsync>[0]) => {
    try {
      await sendAnnouncement.mutateAsync(payload);
      setIsAnnouncementDialogOpen(false);
      toast({ title: "Announcement sent", description: "Recipients will see it now." });
    } catch {
      // toast handled by mutation's onError
    }
  };

  return (
    <>
      <AdminAnnouncementsSection
        announcementSearch={announcementSearch}
        onAnnouncementSearchChange={setAnnouncementSearch}
        announcementDateFrom={announcementDateFrom}
        onAnnouncementDateFromChange={setAnnouncementDateFrom}
        announcementDateTo={announcementDateTo}
        onAnnouncementDateToChange={setAnnouncementDateTo}
        filteredAnnouncements={filteredAnnouncements}
        onOpenSendDialog={() => setIsAnnouncementDialogOpen(true)}
      />

      <AdminAnnouncementDialog
        open={isAnnouncementDialogOpen}
        onOpenChange={setIsAnnouncementDialogOpen}
        programmes={programmes}
        users={users}
        scholarBatches={scholarBatches}
        onSubmit={(payload) => void handleSendAnnouncement(payload)}
      />
    </>
  );
}
