import { Award, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useNavigate } from "react-router-dom";
import { certificatesData } from "@/data/certificates";
import { format } from "date-fns";

export function CertificateWidget() {
  const navigate = useNavigate();
  const claimable = certificatesData.filter(c => c.status === "claimable");
  const claimed = certificatesData.filter(c => c.status === "claimed");
  const recent = claimed.slice(0, 2);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Award size={18} className="text-accent" />
          Your Certificates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {claimable.length > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[hsl(var(--vahani-gold-light))] border border-[hsl(var(--vahani-gold-border))]">
            <Sparkles size={14} className="text-accent shrink-0" />
            <span className="text-xs text-foreground font-medium">
              {claimable.length} certificate{claimable.length > 1 ? "s" : ""} ready to claim!
            </span>
          </div>
        )}

        {recent.map(cert => (
          <div key={cert.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Award size={16} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{cert.courseName}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(cert.completionDate), "MMM dd, yyyy")}
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {cert.grade}
            </Badge>
          </div>
        ))}

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-primary"
          onClick={() => navigate("/certificates")}
        >
          View All Certificates <ArrowRight size={14} className="ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
