import { Award, Download, Eye, Sparkles } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { type Certificate } from "../../data/certificates";
import { format } from "date-fns";

interface Props {
  certificate: Certificate;
  onClaim?: (id: string) => void;
  onView?: (cert: Certificate) => void;
  onDownload?: (cert: Certificate) => void;
}

export function CertificateCard({ certificate, onClaim, onView, onDownload }: Props) {
  const isClaimable = certificate.status === "claimable";

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
      isClaimable ? "border-accent/50 bg-[hsl(var(--vahani-gold-light))]" : ""
    }`}>
      {certificate.isNew && (
        <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground text-[10px] px-2">
          <Sparkles size={12} className="mr-1" /> New
        </Badge>
      )}
      <CardContent className="p-5">
        {/* Certificate visual */}
        <div className={`w-full h-28 rounded-lg flex items-center justify-center mb-4 ${
          isClaimable
            ? "bg-gradient-to-br from-accent/20 to-accent/5 border border-[hsl(var(--vahani-gold-border))]"
            : "bg-gradient-to-br from-primary/10 to-primary/5 border border-border"
        }`}>
          <Award size={40} className={isClaimable ? "text-accent" : "text-primary"} />
        </div>

        <h3 className="font-semibold text-foreground text-sm mb-1 line-clamp-1">{certificate.courseName}</h3>
        <p className="text-xs text-muted-foreground mb-1">
          Completed: {format(new Date(certificate.completionDate), "MMM dd, yyyy")}
        </p>
        <p className="text-xs text-muted-foreground mb-3">Grade: {certificate.grade}</p>

        {certificate.certificateId && (
          <p className="text-[10px] text-muted-foreground font-mono mb-3">ID: {certificate.certificateId}</p>
        )}

        {isClaimable ? (
          <Button
            onClick={() => onClaim?.(certificate.id)}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            size="sm"
          >
            <Award size={14} className="mr-1" /> Claim Certificate
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onView?.(certificate)}>
              <Eye size={14} className="mr-1" /> View
            </Button>
            <Button size="sm" className="flex-1" onClick={() => onDownload?.(certificate)}>
              <Download size={14} className="mr-1" /> Download
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
