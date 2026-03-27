import { useState, type ChangeEvent } from "react";
import { Paperclip, Send } from "lucide-react";
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
import type { EmailRecipient } from "@/api/emails";

interface EmailComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: EmailRecipient[];
  recipientLabel: string;
  sending?: boolean;
  onSend: (payload: {
    subject: string;
    body: string;
    cc: string;
    bcc: string;
    attachments: File[];
  }) => Promise<void>;
}

export function EmailComposerDialog({
  open,
  onOpenChange,
  recipients,
  recipientLabel,
  sending = false,
  onSend,
}: EmailComposerDialogProps) {
  const [subject, setSubject] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const resetForm = () => {
    setSubject("");
    setCc("");
    setBcc("");
    setBody("");
    setAttachments([]);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSend = async () => {
    await onSend({
      subject,
      body,
      cc,
      bcc,
      attachments,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Compose email</DialogTitle>
          <DialogDescription>
            Sending to {recipientLabel}. Add CC, BCC, body text, and attachments before sending.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">
              {recipients.length} recipient{recipients.length === 1 ? "" : "s"}
            </p>
            <div className="mt-2 max-h-28 space-y-1 overflow-y-auto text-sm text-muted-foreground">
              {recipients.slice(0, 12).map((recipient) => (
                <p key={recipient.id}>
                  {recipient.name} ({recipient.email})
                </p>
              ))}
              {recipients.length > 12 && (
                <p>+ {recipients.length - 12} more recipients</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSubject(event.target.value)}
              placeholder="Enter email subject"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>CC</Label>
              <Input
                value={cc}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setCc(event.target.value)}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>BCC</Label>
              <Input
                value={bcc}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setBcc(event.target.value)}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email body</Label>
            <Textarea
              rows={10}
              value={body}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setBody(event.target.value)}
              placeholder="Write your message here..."
            />
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              <Paperclip className="h-4 w-4" />
              <span>Attach up to 5 files</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setAttachments(Array.from(event.target.files || []).slice(0, 5))
                }
              />
            </label>
            {attachments.length > 0 && (
              <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
                {attachments.map((file) => (
                  <p key={`${file.name}-${file.size}`}>{file.name}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSend()}
            disabled={sending || recipients.length === 0 || !subject.trim() || !body.trim()}
          >
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Sending..." : "Send email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
