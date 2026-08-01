import { Download, ExternalLink, ShieldCheck } from "lucide-react";
import { type ManagedCertificate } from "@/api/programmeManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/dateFormat";

interface ProgrammeCertificatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resultsPublished: boolean;
  certificates: ManagedCertificate[];
  certificatesLoading: boolean;
  downloadingCertificateId: string | null;
  onGenerateCertificates: () => void;
  onDownloadCertificate: (certificate: ManagedCertificate) => void;
  onEditCertificate: (certificate: ManagedCertificate) => void;
}

export function ProgrammeCertificatesDialog({
  open,
  onOpenChange,
  resultsPublished,
  certificates,
  certificatesLoading,
  downloadingCertificateId,
  onGenerateCertificates,
  onDownloadCertificate,
  onEditCertificate,
}: ProgrammeCertificatesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Programme certificates</DialogTitle>
          <DialogDescription>
            Generate certificates for completed scholars and edit issued certificates without changing their credential IDs.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-4">
            <div>
              <p className="font-medium text-foreground">
                {resultsPublished
                  ? "Results are published. Certificates can be generated for completed scholars."
                  : "Publish results first to enable certificate generation."}
              </p>
              <p className="text-sm text-muted-foreground">
                Existing certificates will be refreshed and keep the same credential IDs.
              </p>
            </div>
            <Button onClick={onGenerateCertificates} disabled={!resultsPublished || certificatesLoading}>
              {certificatesLoading
                ? "Generating..."
                : certificates.length > 0
                  ? "Regenerate current certificates"
                  : "Generate certificates"}
            </Button>
          </div>

          {certificatesLoading ? (
            <p className="text-sm text-muted-foreground">Loading certificates...</p>
          ) : certificates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No certificates generated for this programme yet.</p>
          ) : (
            <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {certificates.map((certificate) => (
                <div key={certificate.id} className="rounded-2xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{certificate.scholarName}</p>
                        <Badge variant="outline">{certificate.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{certificate.programmeTitle}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {certificate.credentialId} • Issued {formatDate(certificate.issuedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEditCertificate(certificate)}>
                        Edit
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href={certificate.fileUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDownloadCertificate(certificate)}
                        disabled={downloadingCertificateId === certificate.id}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a href={certificate.verificationUrl} target="_blank" rel="noreferrer">
                          <ShieldCheck className="mr-2 h-4 w-4" />
                          Verify
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
