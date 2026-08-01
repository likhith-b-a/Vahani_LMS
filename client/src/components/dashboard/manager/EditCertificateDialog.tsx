import { useEffect, useState, type ChangeEvent } from "react";
import { type ManagedCertificate } from "@/api/programmeManager";
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

interface CertificateFormState {
  scholarName: string;
  programmeTitle: string;
  issuedAt: string;
}

export interface EditCertificatePayload extends CertificateFormState {
  certificateId: string;
}

interface EditCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificate: ManagedCertificate | null;
  onSubmit: (payload: EditCertificatePayload) => void;
}

export function EditCertificateDialog({ open, onOpenChange, certificate, onSubmit }: EditCertificateDialogProps) {
  const [certificateForm, setCertificateForm] = useState<CertificateFormState>({
    scholarName: "",
    programmeTitle: "",
    issuedAt: "",
  });

  useEffect(() => {
    if (open && certificate) {
      setCertificateForm({
        scholarName: certificate.scholarName,
        programmeTitle: certificate.programmeTitle,
        issuedAt: certificate.issuedAt.slice(0, 10),
      });
    }
  }, [open, certificate]);

  const handleSubmit = () => {
    if (!certificate) return;
    onSubmit({ certificateId: certificate.id, ...certificateForm });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit certificate</DialogTitle>
          <DialogDescription>
            Update certificate text and issue date. The certificate will be regenerated with the same credential ID.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Scholar name</Label>
            <Input
              value={certificateForm.scholarName}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setCertificateForm((current) => ({ ...current, scholarName: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Programme title</Label>
            <Input
              value={certificateForm.programmeTitle}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setCertificateForm((current) => ({ ...current, programmeTitle: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Issue date</Label>
            <Input
              type="date"
              value={certificateForm.issuedAt}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setCertificateForm((current) => ({ ...current, issuedAt: event.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
