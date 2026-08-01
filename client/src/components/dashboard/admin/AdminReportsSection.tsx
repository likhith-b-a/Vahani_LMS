import type { ChangeEvent } from "react";
import { BarChart3, Download, Loader2, Sparkles } from "lucide-react";
import {
  type AdminReportResponse,
  type AdminUser,
} from "@/api/admin";
import { type AdminWishlistAiOverviewResponse } from "@/api/wishlist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/dateFormat";
import { downloadCsvReport, exportReportAsPdf } from "@/lib/reportExport";

export const reportLabels = {
  scholar: "Scholar report",
  programme: "Programme report",
  wishlist: "Wishlist report",
} as const;

interface AdminReportsSectionProps {
  reportType: keyof typeof reportLabels;
  onReportTypeChange: (value: keyof typeof reportLabels) => void;
  reportBatchFilter: string;
  onReportBatchFilterChange: (value: string) => void;
  reportManagerFilter: string;
  onReportManagerFilterChange: (value: string) => void;
  reportDateFrom: string;
  onReportDateFromChange: (value: string) => void;
  reportDateTo: string;
  onReportDateToChange: (value: string) => void;
  scholarBatches: string[];
  programmeManagers: AdminUser[];
  reportData: AdminReportResponse | null;
  reportHeaders: string[];
  wishlistAiOverview: AdminWishlistAiOverviewResponse | null;
  wishlistAiLoading: boolean;
  onGenerateReport: () => void;
  onGenerateWishlistAiOverview: () => void;
}

export function AdminReportsSection({
  reportType,
  onReportTypeChange,
  reportBatchFilter,
  onReportBatchFilterChange,
  reportManagerFilter,
  onReportManagerFilterChange,
  reportDateFrom,
  onReportDateFromChange,
  reportDateTo,
  onReportDateToChange,
  scholarBatches,
  programmeManagers,
  reportData,
  reportHeaders,
  wishlistAiOverview,
  wishlistAiLoading,
  onGenerateReport,
  onGenerateWishlistAiOverview,
}: AdminReportsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Export reports</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <Select value={reportType} onValueChange={(value: keyof typeof reportLabels) => onReportTypeChange(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(reportLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(reportType === "scholar" || reportType === "wishlist") && (
            <Select value={reportBatchFilter} onValueChange={onReportBatchFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="All batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {scholarBatches.map((batch) => (
                  <SelectItem key={batch} value={batch}>
                    {batch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {reportType === "programme" && (
            <>
              <Input type="date" value={reportDateFrom} onChange={(event: ChangeEvent<HTMLInputElement>) => onReportDateFromChange(event.target.value)} />
              <Input type="date" value={reportDateTo} onChange={(event: ChangeEvent<HTMLInputElement>) => onReportDateToChange(event.target.value)} />
              <Select value={reportManagerFilter} onValueChange={onReportManagerFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All managers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All managers</SelectItem>
                  {programmeManagers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => onGenerateReport()}>
            <BarChart3 className="mr-2 h-4 w-4" />
            {reportType === "wishlist" ? "Generate wishlist report" : "Generate report"}
          </Button>
          {reportType === "wishlist" && (
            <Button
              variant="outline"
              onClick={() => onGenerateWishlistAiOverview()}
              disabled={wishlistAiLoading}
            >
              {wishlistAiLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              AI overview
            </Button>
          )}
          <Button variant="outline" disabled={!reportData || reportData.rows.length === 0} onClick={() => reportData && downloadCsvReport(reportData, `${reportType}-report`)}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" disabled={!reportData || reportData.rows.length === 0} onClick={() => reportData && exportReportAsPdf(reportData, reportLabels[reportType], `${reportType}-report`)}>
            Export PDF
          </Button>
        </div>
        {reportData && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium text-foreground">{reportLabels[reportType]}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generated on {formatDateTime(reportData.generatedAt)} with {reportData.rows.length} row(s).
              </p>
            </div>
            {reportData.rows.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      {reportHeaders.map((key) => (
                        <th key={key} className="px-4 py-3 text-left font-medium text-foreground">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportData.rows.slice(0, 10).map((row, index) => (
                      <tr key={`${reportData.type}-${index}`}>
                        {reportHeaders.map((key) => (
                          <td key={key} className="px-4 py-3 text-muted-foreground">
                            {String(row[key] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No rows matched the selected filters.</p>
            )}
          </div>
        )}
        {reportType === "wishlist" && wishlistAiOverview && (
          <div className="space-y-4 rounded-2xl border border-border bg-card/70 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">AI wishlist overview</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Generated using {wishlistAiOverview.model} from {wishlistAiOverview.wishlistCount} wishlist request(s).
                </p>
              </div>
              <Badge variant="outline">
                {wishlistAiOverview.summary.uniqueRequestedProgrammes} unique programme ideas
              </Badge>
            </div>

            <div className="rounded-xl bg-muted/30 p-4">
              <p className="text-sm leading-7 text-muted-foreground">
                {wishlistAiOverview.analysis.overview}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-border p-4">
                <p className="font-medium text-foreground">Priority signals</p>
                <div className="space-y-3">
                  {wishlistAiOverview.analysis.prioritySignals.map((item) => (
                    <div key={`${item.title}-${item.reason}`} className="rounded-xl bg-muted/20 p-3">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border p-4">
                <p className="font-medium text-foreground">Recommended actions</p>
                <div className="space-y-3">
                  {wishlistAiOverview.analysis.recommendedActions.map((item) => (
                    <div key={`${item.action}-${item.impact}`} className="rounded-xl bg-muted/20 p-3">
                      <p className="text-sm font-semibold text-foreground">{item.action}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-xl border border-border p-4">
                <p className="font-medium text-foreground">Batch insights</p>
                <div className="space-y-3">
                  {wishlistAiOverview.analysis.batchInsights.map((item) => (
                    <div key={`${item.batch}-${item.insight}`} className="rounded-xl bg-muted/20 p-3">
                      <p className="text-sm font-semibold text-foreground">{item.batch}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border p-4">
                <p className="font-medium text-foreground">Suggested programme ideas</p>
                <div className="space-y-3">
                  {wishlistAiOverview.analysis.suggestedProgrammeIdeas.map((item) => (
                    <div key={`${item.title}-${item.audience}`} className="rounded-xl bg-muted/20 p-3">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.why}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-vahani-blue">
                        Audience: {item.audience}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Top requested titles
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {wishlistAiOverview.summary.topRequestedTitles.map((item) => (
                  <Badge key={`${item.title}-${item.count}`} variant="secondary">
                    {item.title} ({item.count})
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
