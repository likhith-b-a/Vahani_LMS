import { useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, Download, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import { AppSidebar } from "../../components/dashboard/AppSidebar";
import { TopNavbar } from "../../components/dashboard/TopNavbar";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useToast } from "../../hooks/use-toast";
import {
  downloadCertificateFile,
  getMyCertificates,
  type CertificateRecord,
} from "../../api/certificates";

export default function Certificates() {
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCertificateId, setActiveCertificateId] = useState<string | null>(null);
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | null>(null);

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
        setActiveCertificateId((current) => {
          if (current) return current;
          const list = Array.isArray(response?.data?.certificates)
            ? (response.data.certificates as CertificateRecord[])
            : [];
          return list[0]?.id ?? null;
        });
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

  const stats = useMemo(() => {
    const total = certificates.length;
    const available = certificates.filter((certificate) => certificate.status === "available").length;
    const claimed = certificates.filter((certificate) => certificate.status === "claimed").length;

    return [
      {
        label: "Earned so far",
        value: total,
        icon: Award,
        iconClassName: "bg-primary/10 text-primary",
      },
      {
        label: "Ready to download",
        value: available,
        icon: Sparkles,
        iconClassName: "bg-amber-500/10 text-amber-600",
      },
      {
        label: "Already claimed",
        value: claimed,
        icon: CheckCircle2,
        iconClassName: "bg-green-500/10 text-green-600",
      },
    ];
  }, [certificates]);

  const activeCertificate =
    certificates.find((certificate) => certificate.id === activeCertificateId) || null;

  const handleDownloadCertificate = async (certificate: CertificateRecord) => {
    try {
      setDownloadingCertificateId(certificate.id);
      await downloadCertificateFile(
        certificate.id,
        `${certificate.programmeTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-certificate`,
      );
    } catch (error) {
      toast({
        title: "Unable to download certificate",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingCertificateId(null);
    }
  };

  return (
    <div className="scholar-theme flex min-h-screen bg-background">
      <AppSidebar />
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
              {stats.map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`rounded-lg p-2.5 ${stat.iconClassName}`}>
                      <stat.icon size={22} />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Your certificates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={activeCertificateId ?? undefined}
                      onValueChange={(value) => setActiveCertificateId(value)}
                    >
                      <SelectTrigger className="w-full sm:max-w-md">
                        <SelectValue placeholder="Select a certificate" />
                      </SelectTrigger>
                      <SelectContent>
                        {certificates.map((certificate) => (
                          <SelectItem key={certificate.id} value={certificate.id}>
                            <span className="flex items-center gap-2">
                              {certificate.programmeTitle}
                              <span className="text-xs text-muted-foreground">
                                ({certificate.status})
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                          <Button
                            variant="outline"
                            onClick={() => void handleDownloadCertificate(activeCertificate)}
                            disabled={downloadingCertificateId === activeCertificate.id}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
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
