import { useState } from "react";
import { AppSidebar } from "../components/dashboard/AppSidebar";
import { TopNavbar } from "../components/dashboard/TopNavbar";
import { CertificateCard } from "../components/certificates/CertificateCard";
import { CertificateModal } from "../components/certificates/CertificateModal";
import { Card, CardContent } from "../components/ui/card";
import { Award, CheckCircle, Clock } from "lucide-react";
import { certificatesData, type Certificate } from "../data/certificates";
import { useToast } from "../hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Certificates() {
  const [certificates, setCertificates] = useState(certificatesData);
  const [viewCert, setViewCert] = useState<Certificate | null>(null);
  const { toast } = useToast();

  const claimable = certificates.filter(c => c.status === "claimable");
  const claimed = certificates.filter(c => c.status === "claimed");

  const handleClaim = (id: string) => {
    setCertificates(prev =>
      prev.map(c =>
        c.id === id
          ? {
              ...c,
              status: "claimed" as const,
              claimedDate: new Date().toISOString().split("T")[0],
              certificateId: `VAH-${Date.now().toString(36).toUpperCase()}`,
              isNew: false,
            }
          : c
      )
    );
    toast({
      title: "🎉 Certificate Claimed!",
      description: "Your certificate has been successfully claimed.",
    });
  };

  const stats = [
    { label: "Total Earned", value: certificates.length, icon: Award, color: "text-accent" },
    { label: "Claimed", value: claimed.length, icon: CheckCircle, color: "text-[hsl(var(--success))]" },
    { label: "Pending", value: claimable.length, icon: Clock, color: "text-muted-foreground" },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activePage="Certificates" />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
            {/* Header */}
            <section>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">My Certificates</h2>
              <p className="text-sm text-muted-foreground">View, claim, and download your achievements</p>
            </section>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {stats.map(s => (
                <Card key={s.label}>
                  <CardContent className="flex items-center gap-3 sm:gap-4 p-3 sm:p-5">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <s.icon size={18} className={s.color} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Claimable */}
            {claimable.length > 0 && (
              <section>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-accent" /> Claimable Certificates
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  <AnimatePresence>
                    {claimable.map(cert => (
                      <motion.div
                        key={cert.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <CertificateCard certificate={cert} onClaim={handleClaim} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {/* Claimed */}
            <section>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-[hsl(var(--success))]" /> Completed Certificates
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {claimed.map(cert => (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <CertificateCard
                      certificate={cert}
                      onView={setViewCert}
                      onDownload={() =>
                        toast({ title: "Downloading...", description: "Your certificate PDF is being prepared." })
                      }
                    />
                  </motion.div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>

      <CertificateModal certificate={viewCert} open={!!viewCert} onClose={() => setViewCert(null)} />
    </div>
  );
}
