import type { ChangeEvent } from "react";
import { Download } from "lucide-react";
import {
  type ManagedProgrammeSummary,
  type ProgrammeManagerReportResponse,
} from "@/api/programmeManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/dateFormat";
import { downloadCsvReport, exportReportAsPdf } from "@/lib/reportExport";

interface ManagerReportsSectionProps {
  programmes: ManagedProgrammeSummary[];
  reportProgrammeId: string;
  onReportProgrammeIdChange: (value: string) => void;
  reportData: ProgrammeManagerReportResponse | null;
  reportHeaders: string[];
  onGenerateReport: () => void;
}

export function ManagerReportsSection({
  programmes,
  reportProgrammeId,
  onReportProgrammeIdChange,
  reportData,
  reportHeaders,
  onGenerateReport,
}: ManagerReportsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Programme reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={reportProgrammeId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onReportProgrammeIdChange(event.target.value)
            }
          >
            <option value="">Select a programme</option>
            {programmes.map((programme) => (
              <option key={programme.id} value={programme.id}>
                {programme.title}
              </option>
            ))}
          </select>
          <Button onClick={() => onGenerateReport()}>
            Generate report
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={!reportData || reportData.rows.length === 0}
              onClick={() =>
                reportData &&
                downloadCsvReport(
                  reportData,
                  `programme-report-${reportData.programme.title.replace(/\s+/g, "-").toLowerCase()}`,
                )
              }
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              disabled={!reportData || reportData.rows.length === 0}
              onClick={() =>
                reportData &&
                exportReportAsPdf(
                  reportData,
                  `${reportData.programme.title} report`,
                  `programme-report-${reportData.programme.title.replace(/\s+/g, "-").toLowerCase()}`,
                )
              }
            >
              PDF
            </Button>
          </div>
        </div>

        {reportData && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4">
              <p className="font-medium text-foreground">
                {reportData.programme.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generated on {formatDateTime(reportData.generatedAt)} with{" "}
                {reportData.rows.length} scholar row(s).
              </p>
            </div>

            {reportData.rows.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      {reportHeaders.map((key) => (
                        <th
                          key={key}
                          className="px-4 py-3 text-left font-medium text-foreground"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportData.rows.map((row, index) => (
                      <tr key={`${reportData.programme.id}-${index}`}>
                        {reportHeaders.map((key) => (
                          <td
                            key={key}
                            className="px-4 py-3 text-muted-foreground"
                          >
                            {String(row[key] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No scholar rows were returned for this programme yet.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
