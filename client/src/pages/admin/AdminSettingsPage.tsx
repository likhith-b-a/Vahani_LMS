import { useEffect, useState } from "react";
import { type AdminSettings } from "@/api/admin";
import { AdminSettingsSection } from "@/components/dashboard/admin/AdminSettingsSection";
import { useAdminSettings } from "@/hooks/admin/useAdminSettings";

export default function AdminSettingsPage() {
  const { settingsQuery, saveSettings } = useAdminSettings();
  const [settingsDraft, setSettingsDraft] = useState<AdminSettings | null>(null);

  useEffect(() => {
    if (settingsQuery.data && !settingsDraft) {
      setSettingsDraft(settingsQuery.data);
    }
  }, [settingsQuery.data, settingsDraft]);

  const handleSaveSettings = () => {
    if (!settingsDraft) return;
    saveSettings.mutate(settingsDraft);
  };

  return (
    <AdminSettingsSection
      settingsDraft={settingsDraft}
      onSettingsDraftChange={setSettingsDraft}
      onSaveSettings={handleSaveSettings}
    />
  );
}
