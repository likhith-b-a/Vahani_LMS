import { AdminAnalyticsSection } from "@/components/dashboard/admin/AdminAnalyticsSection";
import { useAdminSummary } from "@/hooks/admin/useAdminSummary";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { useAdminProgrammes } from "@/hooks/admin/useAdminProgrammes";

export default function AdminAnalyticsPage() {
  const { data: summary } = useAdminSummary();
  const { usersQuery } = useAdminUsers();
  const { programmesQuery } = useAdminProgrammes();

  return (
    <AdminAnalyticsSection
      summary={summary ?? null}
      users={usersQuery.data?.users || []}
      programmes={programmesQuery.data?.programmes || []}
    />
  );
}
