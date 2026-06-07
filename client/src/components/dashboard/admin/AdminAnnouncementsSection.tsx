import { AnnouncementsSectionContainer } from "@/components/dashboard/shared/AnnouncementsSectionContainer";

interface AdminAnnouncementsSectionProps {
  onOpenDialog: () => void;
}

export function AdminAnnouncementsSection({ onOpenDialog }: AdminAnnouncementsSectionProps) {
  return (
    <AnnouncementsSectionContainer
      title="Announcements"
      description="Send filtered announcements and review sent messages by time range."
      variant="admin"
      onOpenDialog={onOpenDialog}
    />
  );
}
