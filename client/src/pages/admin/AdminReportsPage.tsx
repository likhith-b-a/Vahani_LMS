import { useMemo, useState } from "react";
import { type AdminReportResponse } from "@/api/admin";
import { type AdminWishlistAiOverviewResponse } from "@/api/wishlist";
import { AdminReportsSection, reportLabels } from "@/components/dashboard/admin/AdminReportsSection";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { useAdminReports } from "@/hooks/admin/useAdminReports";
import { getReportHeaders } from "@/lib/reportExport";

export default function AdminReportsPage() {
  const { usersQuery } = useAdminUsers();
  const { generateReport, generateWishlistReport, generateWishlistAiOverview } = useAdminReports();

  const users = usersQuery.data?.users || [];
  const scholars = users.filter((entry) => entry.role === "scholar");
  const programmeManagers = users.filter((entry) => entry.role === "programme_manager");
  const scholarBatches = useMemo(
    () =>
      Array.from(
        new Set(scholars.map((entry) => entry.batch).filter((entry): entry is string => Boolean(entry))),
      ).sort(),
    [scholars],
  );

  const [reportType, setReportType] = useState<keyof typeof reportLabels>("scholar");
  const [reportBatchFilter, setReportBatchFilter] = useState("all");
  const [reportManagerFilter, setReportManagerFilter] = useState("all");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");
  const [reportData, setReportData] = useState<AdminReportResponse | null>(null);
  const [wishlistAiOverview, setWishlistAiOverview] =
    useState<AdminWishlistAiOverviewResponse | null>(null);

  const reportHeaders = useMemo(() => (reportData ? getReportHeaders(reportData.rows) : []), [reportData]);

  const handleGenerateReport = async () => {
    setWishlistAiOverview(null);
    try {
      if (reportType === "wishlist") {
        const data = await generateWishlistReport.mutateAsync(reportBatchFilter);
        setReportData(data);
        return;
      }
      const data = await generateReport.mutateAsync({
        type: reportType,
        filters:
          reportType === "scholar"
            ? { batch: reportBatchFilter !== "all" ? reportBatchFilter : undefined }
            : {
                from: reportDateFrom || undefined,
                to: reportDateTo || undefined,
                managerId: reportManagerFilter !== "all" ? reportManagerFilter : undefined,
              },
      });
      setReportData(data);
    } catch {
      // toast handled by mutation's onError
    }
  };

  const handleGenerateWishlistAiOverview = async () => {
    try {
      const data = await generateWishlistAiOverview.mutateAsync(reportBatchFilter);
      setWishlistAiOverview(data);
    } catch {
      // toast handled by mutation's onError
    }
  };

  return (
    <AdminReportsSection
      reportType={reportType}
      onReportTypeChange={setReportType}
      reportBatchFilter={reportBatchFilter}
      onReportBatchFilterChange={setReportBatchFilter}
      reportManagerFilter={reportManagerFilter}
      onReportManagerFilterChange={setReportManagerFilter}
      reportDateFrom={reportDateFrom}
      onReportDateFromChange={setReportDateFrom}
      reportDateTo={reportDateTo}
      onReportDateToChange={setReportDateTo}
      scholarBatches={scholarBatches}
      programmeManagers={programmeManagers}
      reportData={reportData}
      reportHeaders={reportHeaders}
      wishlistAiOverview={wishlistAiOverview}
      wishlistAiLoading={generateWishlistAiOverview.isPending}
      onGenerateReport={() => void handleGenerateReport()}
      onGenerateWishlistAiOverview={() => void handleGenerateWishlistAiOverview()}
    />
  );
}
