import { AnnouncementsSectionContainer } from "@/components/dashboard/shared/AnnouncementsSectionContainer";

interface ManagerAnnouncementsSectionProps {
  onOpenDialog: () => void;
}

export function ManagerAnnouncementsSection({ onOpenDialog }: ManagerAnnouncementsSectionProps) {
  return (
    <AnnouncementsSectionContainer
      title="Announcements"
      description="Send programme updates through a dialog and review the history."
      variant="manager"
      onOpenDialog={onOpenDialog}
    />
  );
}
