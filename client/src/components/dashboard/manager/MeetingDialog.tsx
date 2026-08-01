import { useEffect, useState, type ChangeEvent } from "react";
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
import { useToast } from "@/hooks/use-toast";

interface MeetingFormState {
  title: string;
  url: string;
}

const emptyMeetingForm: MeetingFormState = { title: "", url: "" };

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MeetingFormState) => void;
}

export function MeetingDialog({ open, onOpenChange, onSubmit }: MeetingDialogProps) {
  const { toast } = useToast();
  const [meetingForm, setMeetingForm] = useState<MeetingFormState>(emptyMeetingForm);

  useEffect(() => {
    if (open) setMeetingForm(emptyMeetingForm);
  }, [open]);

  const handleSubmit = () => {
    if (!meetingForm.title.trim() || !meetingForm.url.trim()) {
      toast({
        title: "Meeting details required",
        description: "Add both a title and a link for the online meeting.",
        variant: "destructive",
      });
      return;
    }
    onSubmit({ title: meetingForm.title.trim(), url: meetingForm.url.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add online meeting</DialogTitle>
          <DialogDescription>Publish a meeting link for this programme.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={meetingForm.title}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setMeetingForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Meeting URL</Label>
            <Input
              value={meetingForm.url}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setMeetingForm((current) => ({ ...current, url: event.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Add meeting</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
