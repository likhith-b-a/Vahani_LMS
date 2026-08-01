import { useEffect, useState, type ChangeEvent } from "react";
import { type ManagedProgrammeSummary } from "@/api/programmeManager";
import type { CreateAnnouncementPayload } from "@/api/announcements";
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
import { useToast } from "@/hooks/use-toast";

interface ManagerAnnouncementFormState {
  title: string;
  message: string;
  programmeId: string;
}

const emptyAnnouncementForm: ManagerAnnouncementFormState = {
  title: "",
  message: "",
  programmeId: "",
};

interface ManagerAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProgrammeId?: string;
  programmes: ManagedProgrammeSummary[];
  onSubmit: (payload: CreateAnnouncementPayload) => void;
}

export function ManagerAnnouncementDialog({
  open,
  onOpenChange,
  defaultProgrammeId,
  programmes,
  onSubmit,
}: ManagerAnnouncementDialogProps) {
  const { toast } = useToast();
  const [announcementForm, setAnnouncementForm] =
    useState<ManagerAnnouncementFormState>(emptyAnnouncementForm);

  useEffect(() => {
    if (open) {
      setAnnouncementForm({ ...emptyAnnouncementForm, programmeId: defaultProgrammeId || "" });
    }
  }, [open, defaultProgrammeId]);

  const handleSubmit = () => {
    if (!announcementForm.programmeId || !announcementForm.title.trim() || !announcementForm.message.trim()) {
      toast({
        title: "Announcement details required",
        description: "Choose a programme, then add a title and message.",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      programmeId: announcementForm.programmeId,
      title: announcementForm.title.trim(),
      message: announcementForm.message.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
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
              value={announcementForm.programmeId}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Send announcement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
