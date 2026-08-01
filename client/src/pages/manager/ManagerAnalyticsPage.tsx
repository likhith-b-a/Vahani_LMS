import { ManagerAnalyticsSection } from "@/components/dashboard/manager/ManagerAnalyticsSection";
import { useManagerProgrammes, useManagerProgrammeDetails } from "@/hooks/manager/useManagerProgrammes";

export default function ManagerAnalyticsPage() {
  const { programmesQuery } = useManagerProgrammes();
  const programmes = programmesQuery.data || [];
  const programmeDetails = useManagerProgrammeDetails(programmes);

  return <ManagerAnalyticsSection programmes={programmes} programmeDetails={programmeDetails} />;
}
