import { useEffect, useMemo, useState } from "react";
import { type ProgrammeManagerReportResponse } from "@/api/programmeManager";
import { ManagerReportsSection } from "@/components/dashboard/manager/ManagerReportsSection";
import { useManagerProgrammes } from "@/hooks/manager/useManagerProgrammes";
import { useManagerReports } from "@/hooks/manager/useManagerReports";
import { getReportHeaders } from "@/lib/reportExport";

export default function ManagerReportsPage() {
  const { programmesQuery } = useManagerProgrammes();
  const { generateReport } = useManagerReports();

  const programmes = programmesQuery.data || [];

  const [reportProgrammeId, setReportProgrammeId] = useState("");
  const [reportData, setReportData] = useState<ProgrammeManagerReportResponse | null>(null);

  useEffect(() => {
    if (!reportProgrammeId && programmes[0]) {
      setReportProgrammeId(programmes[0].id);
    }
  }, [programmes, reportProgrammeId]);

  const reportHeaders = useMemo(() => (reportData ? getReportHeaders(reportData.rows) : []), [reportData]);

  const handleGenerateReport = async () => {
    if (!reportProgrammeId) return;
    try {
      const data = await generateReport.mutateAsync(reportProgrammeId);
      setReportData(data);
    } catch {
      // toast handled by mutation's onError
    }
  };

  return (
    <ManagerReportsSection
      programmes={programmes}
      reportProgrammeId={reportProgrammeId}
      onReportProgrammeIdChange={setReportProgrammeId}
      reportData={reportData}
      reportHeaders={reportHeaders}
      onGenerateReport={() => void handleGenerateReport()}
    />
  );
}
