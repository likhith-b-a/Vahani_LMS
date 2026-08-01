import type { ChangeEvent } from "react";
import { Mail } from "lucide-react";
import { type ManagedProgramme, type ManagedProgrammeSummary } from "@/api/programmeManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/dateFormat";

type ManagedEnrollment = ManagedProgramme["enrollments"][number];

interface ManagerStudentsSectionProps {
  programmes: ManagedProgrammeSummary[];
  selectedProgrammeId: string;
  onSelectedProgrammeIdChange: (value: string) => void;
  selectedProgramme: ManagedProgramme | null;
  studentSearch: string;
  onStudentSearchChange: (value: string) => void;
  visibleStudents: ManagedEnrollment[];
  selectedEmailStudentIds: string[];
  onSelectAll: () => void;
  onSelectVisible: () => void;
  onClearSelection: () => void;
  onToggleEmailStudent: (userId: string) => void;
  onProceedToEmail: () => void;
  canProceedToEmail: boolean;
  onOpenStudentDetail: (userId: string) => void;
}

export function ManagerStudentsSection({
  programmes,
  selectedProgrammeId,
  onSelectedProgrammeIdChange,
  selectedProgramme,
  studentSearch,
  onStudentSearchChange,
  visibleStudents,
  selectedEmailStudentIds,
  onSelectAll,
  onSelectVisible,
  onClearSelection,
  onToggleEmailStudent,
  onProceedToEmail,
  canProceedToEmail,
  onOpenStudentDetail,
}: ManagerStudentsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Students</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              disabled={!selectedProgrammeId || (selectedProgramme?.enrollments || []).length === 0}
            >
              Select all
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectVisible}
              disabled={!selectedProgrammeId || visibleStudents.length === 0}
            >
              Select visible
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearSelection}
              disabled={selectedEmailStudentIds.length === 0}
            >
              Clear selection
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onProceedToEmail}
              disabled={!canProceedToEmail}
            >
              <Mail className="mr-2 h-4 w-4" />
              Proceed to email
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[280px,1fr]">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={selectedProgrammeId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              onSelectedProgrammeIdChange(event.target.value);
            }}
          >
            <option value="">Select a programme</option>
            {programmes.map((programme) => (
              <option key={programme.id} value={programme.id}>
                {programme.title}
              </option>
            ))}
          </select>

          {selectedProgrammeId && (
            <Input
              value={studentSearch}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onStudentSearchChange(event.target.value)
              }
              placeholder="Search scholars by name, email, or batch"
            />
          )}
        </div>

        {!selectedProgrammeId && (
          <p className="text-sm text-muted-foreground">
            Select a programme first to see its scholars.
          </p>
        )}

        {selectedProgrammeId && (
          <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card">
            <Table className="text-[15px]">
              <TableHeader className="bg-muted/20">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="h-14 w-[56px] px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    Select
                  </TableHead>
                  <TableHead className="h-14 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    Scholar
                  </TableHead>
                  <TableHead className="hidden h-14 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground md:table-cell">
                    Batch
                  </TableHead>
                  {selectedProgramme?.groupedDeliveryEnabled ? (
                    <TableHead className="hidden h-14 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground md:table-cell">
                      Track group
                    </TableHead>
                  ) : null}
                  <TableHead className="h-14 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="hidden h-14 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground lg:table-cell">
                    Enrolled on
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-card">
                {visibleStudents.length === 0 ? (
                  <TableRow className="border-border/80 hover:bg-transparent">
                    <TableCell
                      colSpan={selectedProgramme?.groupedDeliveryEnabled ? 6 : 5}
                      className="px-6 py-6 text-sm text-muted-foreground"
                    >
                      No scholars match the current filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleStudents.map((enrollment) => (
                    <TableRow
                      key={enrollment.id}
                      className="cursor-pointer border-border/80 hover:bg-muted/20"
                      onClick={() => onOpenStudentDetail(enrollment.user.id)}
                    >
                      <TableCell
                        className="px-6 py-5"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedEmailStudentIds.includes(enrollment.user.id)}
                          onCheckedChange={() => onToggleEmailStudent(enrollment.user.id)}
                        />
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div>
                          <p className="text-[15px] font-semibold text-foreground">
                            {enrollment.user.name}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {enrollment.user.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden px-6 py-5 text-[15px] text-muted-foreground md:table-cell">
                        {enrollment.user.batch || "No batch"}
                      </TableCell>
                      {selectedProgramme?.groupedDeliveryEnabled ? (
                        <TableCell className="hidden px-6 py-5 md:table-cell">
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground"
                          >
                            {enrollment.trackGroup || "Unassigned"}
                          </Badge>
                        </TableCell>
                      ) : null}
                      <TableCell className="px-6 py-5">
                        <Badge
                          variant="outline"
                          className="rounded-full px-3 py-1 text-xs font-semibold capitalize"
                        >
                          {enrollment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden px-6 py-5 text-[15px] text-muted-foreground lg:table-cell">
                        {formatDate(enrollment.enrolledAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
