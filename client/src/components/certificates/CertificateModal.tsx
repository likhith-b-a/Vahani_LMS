import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Download, Award } from "lucide-react";
import { type Certificate } from "../../data/certificates";
import { format } from "date-fns";
import vahaniLogo from "@/assets/vahani-logo.png";

interface Props {
  certificate: Certificate | null;
  open: boolean;
  onClose: () => void;
}

export function CertificateModal({ certificate, open, onClose }: Props) {
  if (!certificate) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Certificate Preview</DialogTitle>
        </DialogHeader>

        {/* Certificate Design */}
        <div className="border-4 border-double border-accent/40 rounded-lg p-8 bg-gradient-to-br from-background to-secondary/30 text-center space-y-4">
          <div className="flex justify-center">
            <img src={vahaniLogo} alt="Vahani" className="w-12 h-12 rounded-lg" />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-semibold">
            Vahani Scholarship Programme
          </p>
          <h2 className="text-2xl font-bold text-primary tracking-tight">Certificate of Completion</h2>
          <p className="text-sm text-muted-foreground">This is to certify that</p>
          <p className="text-xl font-bold text-foreground">{certificate.scholarName}</p>
          <p className="text-sm text-muted-foreground">has successfully completed the course</p>
          <p className="text-lg font-semibold text-accent">{certificate.courseName}</p>
          <p className="text-sm text-muted-foreground">
            with grade <span className="font-semibold text-foreground">{certificate.grade}</span> on{" "}
            {format(new Date(certificate.completionDate), "MMMM dd, yyyy")}
          </p>
          <div className="flex justify-between items-end pt-6 px-4">
            <div className="text-center">
              <div className="w-24 border-t border-muted-foreground/30 mb-1" />
              <p className="text-[10px] text-muted-foreground">{certificate.trainerName}</p>
              <p className="text-[10px] text-muted-foreground">Trainer</p>
            </div>
            <Award size={32} className="text-accent/50" />
            <div className="text-center">
              <div className="w-24 border-t border-muted-foreground/30 mb-1" />
              <p className="text-[10px] text-muted-foreground">Programme Director</p>
              <p className="text-[10px] text-muted-foreground">Vahani Scholarship</p>
            </div>
          </div>
          {certificate.certificateId && (
            <p className="text-[10px] text-muted-foreground font-mono pt-2">
              Certificate ID: {certificate.certificateId}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Download size={14} className="mr-2" /> Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
