import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, ShieldCheck } from "lucide-react";
import { AppSidebar } from "../components/dashboard/AppSidebar";
import { TopNavbar } from "../components/dashboard/TopNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import {
  getCertificateDownloadUrl,
  getMyCertificates,
  type CertificateRecord,
} from "../api/certificates";

export default function Certificates() {
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCertificateId, setActiveCertificateId] = useState<string | null>(null);

  useEffect(() => {
    const loadCertificates = async () => {
      try {
        setLoading(true);
        const response = await getMyCertificates();
        setCertificates(
          Array.isArray(response?.data?.certificates)
            ? (response.data.certificates as CertificateRecord[])
            : [],
        );
      } catch (error) {
        toast({
          title: "Unable to load certificates",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadCertificates();
  }, [toast]);

  const stats = useMemo(
    () => ({
      total: certificates.length,
      available: certificates.filter((certificate) => certificate.status === "available").length,
      claimed: certificates.filter((certificate) => certificate.status === "claimed").length,
    }),
    [certificates],
  );

  const activeCertificate =
    certificates.find((certificate) => certificate.id === activeCertificateId) || null;

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activePage="Certificates" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
            <section>
              <h1 className="text-2xl font-bold tracking-tight">Certificates</h1>
              <p className="text-sm text-muted-foreground">
                View your programme completion certificates and verify their authenticity with the credential ID.
              </p>
            </section>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Total</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{stats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Available</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{stats.available}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Claimed</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{stats.claimed}</p>
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <Card>
                <CardContent className="py-10 text-sm text-muted-foreground">
                  Loading certificates...
                </CardContent>
              </Card>
            ) : certificates.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-sm text-muted-foreground">
                  No certificates available yet. Certificates appear here after your programme manager generates them for completed programmes.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Your certificates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {certificates.map((certificate) => (
                      <button
                        key={certificate.id}
                        type="button"
                        onClick={() => setActiveCertificateId(certificate.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          activeCertificateId === certificate.id
                            ? "border-vahani-blue bg-vahani-blue/5"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{certificate.programmeTitle}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{certificate.credentialId}</p>
                          </div>
                          <Badge variant={certificate.status === "claimed" ? "default" : "outline"}>
                            {certificate.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Issued {new Date(certificate.issuedAt).toLocaleDateString("en-IN")}
                        </p>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Certificate preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!activeCertificate ? (
                      <p className="text-sm text-muted-foreground">
                        Select a certificate to view details and open the generated file.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold text-foreground">
                              {activeCertificate.programmeTitle}
                            </p>
                            <Badge variant="outline">{activeCertificate.status}</Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Issued to {activeCertificate.scholarName} on{" "}
                            {new Date(activeCertificate.issuedAt).toLocaleDateString("en-IN")}
                          </p>
                          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                            <p>Credential ID: {activeCertificate.credentialId}</p>
                            <p>Issued by: {activeCertificate.issuedBy?.name || "Vahani LMS"}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button asChild variant="outline">
                            <a href={activeCertificate.fileUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Open certificate
                            </a>
                          </Button>
                          <Button asChild variant="outline">
                            <a
                              href={getCertificateDownloadUrl(activeCertificate.id)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </a>
                          </Button>
                          <Button asChild variant="outline">
                            <a href={activeCertificate.verificationUrl} target="_blank" rel="noreferrer">
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              Verify authenticity
                            </a>
                          </Button>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-border bg-white">
                          <iframe
                            title={activeCertificate.credentialId}
                            src={activeCertificate.fileUrl}
                            className="h-[540px] w-full"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
