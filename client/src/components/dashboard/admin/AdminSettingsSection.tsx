import { type AdminSettings } from "@/api/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface AdminSettingsSectionProps {
  settingsDraft: AdminSettings | null;
  onSettingsDraftChange: (updater: (current: AdminSettings | null) => AdminSettings | null) => void;
  onSaveSettings: () => void;
}

export function AdminSettingsSection({
  settingsDraft,
  onSettingsDraftChange,
  onSaveSettings,
}: AdminSettingsSectionProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>System settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {settingsDraft?.featureAccess &&
            Object.entries(settingsDraft.featureAccess).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">{key}</p>
                  <p className="text-xs text-muted-foreground">
                    Control whether this capability is available in the platform.
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(value) =>
                    onSettingsDraftChange((current) =>
                      current
                        ? {
                            ...current,
                            featureAccess: { ...current.featureAccess, [key]: value },
                          }
                        : current,
                    )
                  }
                />
              </div>
            ))}

          <Button onClick={() => onSaveSettings()}>Save settings</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Access summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {settingsDraft?.featureAccess &&
              Object.entries(settingsDraft.featureAccess).map(([key, enabled]) => (
                <Badge key={key} variant={enabled ? "default" : "outline"}>
                  {key}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
