import { type ChangeEvent } from "react";
import { CalendarDays, ClipboardCheck, FolderKanban, Sparkles, Users } from "lucide-react";
import { type ManagedProgrammeSummary } from "@/api/programmeManager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type ManagerProgrammeStatusFilter = "all" | "setup" | "active" | "completed";

function getProgrammeStatus(programme: ManagedProgrammeSummary) {
  if (programme.resultsPublishedAt) {
    return "completed";
  }

  if (
    programme.scholarsCount === 0 &&
    programme.assignmentsCount === 0 &&
    programme.interactiveSessionsCount === 0 &&
    (programme.resourcesCount || 0) === 0
  ) {
    return "setup";
  }

  return "active";
}

function getStatusMeta(status: ReturnType<typeof getProgrammeStatus>) {
  if (status === "completed") {
    return {
      label: "Completed",
      className: "bg-green-500/10 text-green-600",
    };
  }

  if (status === "setup") {
    return {
      label: "Setup",
      className: "bg-amber-500/10 text-amber-700",
    };
  }

  return {
    label: "Active",
    className: "bg-vahani-blue/10 text-vahani-blue",
  };
}

interface ManagerProgrammesSectionProps {
  programmeSearch: string;
  onProgrammeSearchChange: (value: string) => void;
  programmeDateFrom: string;
  onProgrammeDateFromChange: (value: string) => void;
  programmeDateTo: string;
  onProgrammeDateToChange: (value: string) => void;
  programmeStatusFilter: ManagerProgrammeStatusFilter;
  onProgrammeStatusFilterChange: (value: ManagerProgrammeStatusFilter) => void;
  filteredProgrammes: ManagedProgrammeSummary[];
  onOpenProgramme: (programmeId: string) => void;
  formatDate: (value?: string | null) => string;
}

export function ManagerProgrammesSection({
  programmeSearch,
  onProgrammeSearchChange,
  programmeDateFrom,
  onProgrammeDateFromChange,
  programmeDateTo,
  onProgrammeDateToChange,
  programmeStatusFilter,
  onProgrammeStatusFilterChange,
  filteredProgrammes,
  onOpenProgramme,
  formatDate,
}: ManagerProgrammesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Programmes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
          <Input
            value={programmeSearch}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onProgrammeSearchChange(event.target.value)
            }
            placeholder="Search programmes by title or description"
          />
          <Input
            type="date"
            value={programmeDateFrom}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onProgrammeDateFromChange(event.target.value)
            }
          />
          <Input
            type="date"
            value={programmeDateTo}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onProgrammeDateToChange(event.target.value)
            }
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={programmeStatusFilter}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onProgrammeStatusFilterChange(event.target.value as ManagerProgrammeStatusFilter)
            }
          >
            <option value="all">All statuses</option>
            <option value="setup">Setup</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredProgrammes.map((programme) => (
            (() => {
              const status = getProgrammeStatus(programme);
              const statusMeta = getStatusMeta(status);

              return (
                <button
                  key={programme.id}
                  type="button"
                  onClick={() => onOpenProgramme(programme.id)}
                  className="group flex h-full min-h-[280px] flex-col overflow-hidden rounded-[28px] border border-border bg-card text-left transition hover:-translate-y-0.5 hover:border-vahani-blue/40 hover:shadow-lg"
                >
                  <div className="h-1.5 bg-gradient-to-r from-[#11173f] via-[#0c6acc] to-[#f3b233]" />
                  <div className="flex h-full flex-col gap-5 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xl font-semibold leading-tight text-foreground">
                          {programme.title}
                        </p>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                          {programme.description || "No description added yet."}
                        </p>
                      </div>
                      <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                    </div>

                    <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                      <div className="inline-flex items-center gap-2">
                        <Users className="h-4 w-4 text-vahani-blue" />
                        <span>{programme.scholarsCount} scholars</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-vahani-blue" />
                        <span>{programme.assignmentsCount} assignments</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-vahani-blue" />
                        <span>{programme.interactiveSessionsCount} live sessions</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-vahani-blue" />
                        <span>{(programme.resourcesCount || 0) + (programme.meetingsCount || 0)} resources + meetings</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Created {formatDate(programme.createdAt)}
                      </span>
                      {programme.resultsPublishedAt ? (
                        <span className="inline-flex items-center gap-1.5">
                          Results published {formatDate(programme.resultsPublishedAt)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        {status === "completed"
                          ? "Results published and ready to review."
                          : status === "setup"
                            ? "Add scholars and learning items to get started."
                            : "Continue managing coursework and scholar progress."}
                      </div>
                      <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition group-hover:border-vahani-blue/40">
                        Open
                      </span>
                    </div>
                  </div>
                </button>
              );
            })()
          ))}
          {filteredProgrammes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
              No programmes match the current search, date range, or status.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
