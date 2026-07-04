import { useState, type ChangeEvent } from "react";
import { createAnnouncement } from "@/api/announcements";
import type { ManagedProgrammeSummary } from "@/api/programmeManager";
import { AnnouncementsSectionContainer } from "@/components/dashboard/shared/AnnouncementsSectionContainer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAnnouncements } from "@/contexts/AnnouncementsContext";
import { useToast } from "@/hooks/use-toast";

const emptyAnnouncementForm = {
  title: "",
  message: "",
  programmeId: "",
};

interface ManagerAnnouncementsSectionProps {
  programmes: ManagedProgrammeSummary[];
  defaultProgrammeId?: string;
}

export function ManagerAnnouncementsSection({
  programmes,
  defaultProgrammeId = "",
}: ManagerAnnouncementsSectionProps) {
  const { toast } = useToast();
  const { reloadAnnouncements } = useAnnouncements();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncementForm);

  const handleSendAnnouncement = async () => {
    const programmeId = announcementForm.programmeId || defaultProgrammeId;
    if (!programmeId || !announcementForm.title.trim() || !announcementForm.message.trim()) {
      toast({
        title: "Announcement details required",
        description: "Choose a programme, then add a title and message.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createAnnouncement({
        programmeId,
        title: announcementForm.title.trim(),
        message: announcementForm.message.trim(),
      });
      setAnnouncementForm(emptyAnnouncementForm);
      setIsDialogOpen(false);
      await reloadAnnouncements();
      toast({
        title: "Announcement sent",
        description: "The selected programme scholars will receive it in their dashboard.",
      });
    } catch (error) {
      toast({
        title: "Unable to send announcement",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <AnnouncementsSectionContainer
        title="Announcements"
        description="Send programme updates through a dialog and review the history."
        variant="manager"
        onOpenDialog={() => setIsDialogOpen(true)}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Send announcement</DialogTitle>
            <DialogDescription>
              Choose a programme and send an update to scholars.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Programme</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={announcementForm.programmeId || defaultProgrammeId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    programmeId: event.target.value,
                  }))
                }
              >
                <option value="">Select a programme</option>
                {programmes.map((programme) => (
                  <option key={programme.id} value={programme.id}>
                    {programme.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={announcementForm.title}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={5}
                value={announcementForm.message}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSendAnnouncement()}>Send announcement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
