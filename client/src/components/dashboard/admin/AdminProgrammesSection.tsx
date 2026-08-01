import type { ChangeEvent } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { type AdminProgramme } from "@/api/admin";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { formatDate } from "@/lib/dateFormat";

export type ProgrammeStatusFilter = "all" | "setup" | "active" | "completed";

interface AdminProgrammesSectionProps {
  programmeSearch: string;
  onProgrammeSearchChange: (value: string) => void;
  programmeDateFrom: string;
  onProgrammeDateFromChange: (value: string) => void;
  programmeDateTo: string;
  onProgrammeDateToChange: (value: string) => void;
  programmeStatusFilter: ProgrammeStatusFilter;
  onProgrammeStatusFilterChange: (value: ProgrammeStatusFilter) => void;
  onClearFilters: () => void;
  programmes: AdminProgramme[];
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  getProgrammeStatus: (programme: AdminProgramme) => Exclude<ProgrammeStatusFilter, "all">;
  onCreateProgramme: () => void;
  onOpenProgramme: (programme: AdminProgramme) => void;
  onEditProgramme: (programme: AdminProgramme) => void;
  onRequestDeleteProgramme: (programme: AdminProgramme) => void;
}

export function AdminProgrammesSection({
  programmeSearch,
  onProgrammeSearchChange,
  programmeDateFrom,
  onProgrammeDateFromChange,
  programmeDateTo,
  onProgrammeDateToChange,
  programmeStatusFilter,
  onProgrammeStatusFilterChange,
  onClearFilters,
  programmes,
  page,
  totalPages,
  totalCount,
  onPageChange,
  getProgrammeStatus,
  onCreateProgramme,
  onOpenProgramme,
  onEditProgramme,
  onRequestDeleteProgramme,
}: AdminProgrammesSectionProps) {
  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Programmes</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Search, filter by timeline, and open a programme to manage scholars and assignments.
              {" "}
              {totalCount} total.
            </p>
          </div>
          <Button onClick={onCreateProgramme}>
            <Plus className="mr-2 h-4 w-4" />
            Create programme
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={programmeSearch}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onProgrammeSearchChange(event.target.value)}
              placeholder="Search programmes by title, description, or manager"
              className="pl-9"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Input type="date" value={programmeDateFrom} onChange={(event: ChangeEvent<HTMLInputElement>) => onProgrammeDateFromChange(event.target.value)} />
            <Input type="date" value={programmeDateTo} onChange={(event: ChangeEvent<HTMLInputElement>) => onProgrammeDateToChange(event.target.value)} />
            <Select value={programmeStatusFilter} onValueChange={(value) => onProgrammeStatusFilterChange(value as ProgrammeStatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="setup">Setup</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={onClearFilters}>
              Clear filters
            </Button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {programmes.map((programme) => (
            <button
              key={programme.id}
              type="button"
              onClick={() => onOpenProgramme(programme)}
              className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-[28px] border border-border bg-card text-left transition hover:border-vahani-blue/40 hover:shadow-md"
            >
              <div className="h-2 bg-gradient-to-r from-[#11173f] via-[#7a5600] to-[#f5aa00]" />
              <div className="flex h-full flex-col gap-5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xl font-semibold leading-tight text-foreground lg:text-2xl">
                      {programme.title}
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-muted-foreground">
                      {programme.description || "No description added for this programme yet."}
                    </p>
                  </div>
                  <Badge
                    variant={getProgrammeStatus(programme) === "completed" ? "default" : "secondary"}
                  >
                    {getProgrammeStatus(programme) === "completed"
                      ? "Completed"
                      : getProgrammeStatus(programme) === "setup"
                        ? "Setup"
                        : "Active"}
                  </Badge>
                </div>

                <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                  <div className="space-y-3">
                    <p>Handled by: {programme.programmeManager?.name || "Unassigned manager"}</p>
                    <p>{programme.assignments.filter((assignment) => assignment.pendingCount > 0).length} pending</p>
                  </div>
                  <div className="space-y-3">
                    <p>Enrolled {formatDate(programme.createdAt)}</p>
                    <p>
                      {programme.assignments.some((assignment) => assignment.dueDate && new Date(assignment.dueDate) > new Date())
                        ? "Upcoming assignment available"
                        : "No upcoming assignment"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{programme.selfEnrollmentEnabled ? "Self-enrollable" : "Mandatory"}</span>
                  <span>{programme.enrollments.length} scholars</span>
                  <span>{programme.assignments.length} assignments</span>
                  <span>{programme.resources?.length ?? 0} resources</span>
                </div>

                <div className="mt-auto grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenProgramme(programme);
                    }}
                  >
                    View details
                  </Button>
                  <Button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenProgramme(programme);
                    }}
                    className="bg-amber-500 text-black hover:bg-amber-400"
                  >
                    Continue
                  </Button>
                </div>

                <div className="flex justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditProgramme(programme);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRequestDeleteProgramme(programme);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </button>
          ))}
        </div>

        {programmes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
            No programmes match the current filters.
          </div>
        )}

        {programmes.length > 0 && totalPages > 1 && (
          <Pagination className="justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(Math.max(1, page - 1));
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    onPageChange(Math.min(totalPages, page + 1));
                  }}
                  className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
}
