import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldCheck, ShieldX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { verifyCertificate, type CertificateRecord } from "../api/certificates";

export default function VerifyCertificate() {
  const { credentialId } = useParams();
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCertificate = async () => {
      if (!credentialId) {
        setError("Certificate credential ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await verifyCertificate(credentialId);
        setCertificate((response?.data as CertificateRecord) || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to verify certificate.");
      } finally {
        setLoading(false);
      }
    };

    void loadCertificate();
  }, [credentialId]);

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-vahani-blue">
            Certificate Verification
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
            Vahani LMS certificate authenticity check
          </h1>
        </section>

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Verifying certificate...
            </CardContent>
          </Card>
        ) : error || !certificate ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-3 py-10 text-destructive">
              <ShieldX className="h-5 w-5" />
              <p>{error || "Certificate could not be verified."}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="flex items-center gap-3 py-6">
                <ShieldCheck className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-semibold text-foreground">Certificate verified</p>
                  <p className="text-sm text-muted-foreground">
                    This credential is valid and issued through Vahani LMS.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle>{certificate.programmeTitle}</CardTitle>
                  <Badge variant="outline">{certificate.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Credential ID:</span> {certificate.credentialId}</p>
                <p><span className="font-medium text-foreground">Scholar:</span> {certificate.scholarName}</p>
                <p><span className="font-medium text-foreground">Issued on:</span> {new Date(certificate.issuedAt).toLocaleDateString("en-IN")}</p>
                <p><span className="font-medium text-foreground">Issued by:</span> {certificate.issuedBy?.name || "Vahani LMS"}</p>
                <p><span className="font-medium text-foreground">Programme:</span> {certificate.programme?.title || certificate.programmeTitle}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="overflow-hidden rounded-2xl bg-white p-0">
                <iframe title={certificate.credentialId} src={certificate.fileUrl} className="h-[640px] w-full" />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
