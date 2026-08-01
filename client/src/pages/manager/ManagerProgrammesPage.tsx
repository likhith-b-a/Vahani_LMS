import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { type ManagedProgrammeSummary } from "@/api/programmeManager";
import {
  ManagerProgrammesSection,
  type ManagerProgrammeStatusFilter,
} from "@/components/dashboard/manager/ManagerProgrammesSection";
import { useManagerProgrammes } from "@/hooks/manager/useManagerProgrammes";
import { formatDate } from "@/lib/dateFormat";
import { matchesDateRange } from "@/lib/queryFilters";

const getManagerProgrammeStatus = (programme: ManagedProgrammeSummary) => {
  if (programme.resultsPublishedAt) return "completed";

  if (
    programme.scholarsCount === 0 &&
    programme.assignmentsCount === 0 &&
    programme.interactiveSessionsCount === 0 &&
    (programme.resourcesCount || 0) === 0
  ) {
    return "setup";
  }

  return "active";
};

export default function ManagerProgrammesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardBasePath = location.pathname.startsWith("/tutor") ? "/tutor" : "/programme-manager";
  const { programmesQuery } = useManagerProgrammes();
  const programmes = programmesQuery.data || [];

  const [programmeSearch, setProgrammeSearch] = useState("");
  const [programmeDateFrom, setProgrammeDateFrom] = useState("");
  const [programmeDateTo, setProgrammeDateTo] = useState("");
  const [programmeStatusFilter, setProgrammeStatusFilter] =
    useState<ManagerProgrammeStatusFilter>("all");

  const filteredProgrammes = useMemo(
    () =>
      programmes.filter((programme) => {
        const matchesSearch = `${programme.title} ${programme.description || ""}`
          .toLowerCase()
          .includes(programmeSearch.toLowerCase());
        const matchesStatus =
          programmeStatusFilter === "all" || getManagerProgrammeStatus(programme) === programmeStatusFilter;
        return (
          matchesSearch &&
          matchesStatus &&
          matchesDateRange(programme.createdAt, programmeDateFrom, programmeDateTo)
        );
      }),
    [programmeDateFrom, programmeDateTo, programmeSearch, programmeStatusFilter, programmes],
  );

  return (
    <ManagerProgrammesSection
      programmeSearch={programmeSearch}
      onProgrammeSearchChange={setProgrammeSearch}
      programmeDateFrom={programmeDateFrom}
      onProgrammeDateFromChange={setProgrammeDateFrom}
      programmeDateTo={programmeDateTo}
      onProgrammeDateToChange={setProgrammeDateTo}
      programmeStatusFilter={programmeStatusFilter}
      onProgrammeStatusFilterChange={setProgrammeStatusFilter}
      onClearProgrammeFilters={() => {
        setProgrammeSearch("");
        setProgrammeDateFrom("");
        setProgrammeDateTo("");
        setProgrammeStatusFilter("all");
      }}
      filteredProgrammes={filteredProgrammes}
      onOpenProgramme={(programmeId) => navigate(`${dashboardBasePath}/programmes/${programmeId}`)}
      formatDate={formatDate}
    />
  );
}
