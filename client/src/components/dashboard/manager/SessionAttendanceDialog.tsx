import { useEffect, useState, type ChangeEvent } from "react";
import { type ManagedInteractiveSession, type ManagedProgramme } from "@/api/programmeManager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/dateFormat";

type ManagedEnrollment = ManagedProgramme["enrollments"][number];

export interface SessionAttendancePayload {
  userId: string;
  status: "present" | "absent";
  score: number;
}

interface SessionAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ManagedInteractiveSession | null;
  occurrenceId: string;
  enrollments: ManagedEnrollment[];
  onSubmit: (attendance: SessionAttendancePayload[]) => void;
}

export function SessionAttendanceDialog({
  open,
  onOpenChange,
  session,
  occurrenceId,
  enrollments,
  onSubmit,
}: SessionAttendanceDialogProps) {
  const occurrence = session?.occurrences.find((entry) => entry.id === occurrenceId) || null;

  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, "present" | "absent">>({});
  const [attendanceScoreDrafts, setAttendanceScoreDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !session || !occurrence) return;

    setAttendanceDrafts(
      Object.fromEntries(
        enrollments.map((enrollment) => {
          const attendance = session.attendances.find(
            (entry) => entry.userId === enrollment.user.id && entry.interactiveSessionOccurrenceId === occurrence.id,
          );
          return [enrollment.user.id, attendance?.status || "present"];
        }),
      ) as Record<string, "present" | "absent">,
    );
    setAttendanceScoreDrafts(
      Object.fromEntries(
        enrollments.map((enrollment) => {
          const attendance = session.attendances.find(
            (entry) => entry.userId === enrollment.user.id && entry.interactiveSessionOccurrenceId === occurrence.id,
          );
          return [
            enrollment.user.id,
            attendance?.score !== null && attendance?.score !== undefined
              ? String(attendance.score)
              : String(session.maxScore || 0),
          ];
        }),
      ),
    );
  }, [open, session, occurrence, enrollments]);

  const handleSubmit = () => {
    onSubmit(
      enrollments.map((enrollment) => ({
        userId: enrollment.user.id,
        status: attendanceDrafts[enrollment.user.id] || "present",
        score: Number(
          attendanceDrafts[enrollment.user.id] === "absent" ? 0 : attendanceScoreDrafts[enrollment.user.id] || 0,
        ),
      })),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{session?.title || "Mark attendance"}</DialogTitle>
          <DialogDescription>
            All assigned scholars start as present. Mark absentees, adjust marks when graded, and save.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {occurrence ? (
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{formatDateTime(occurrence.scheduledAt)}</p>
              <p className="mt-1">Max marks {session?.maxScore ?? 0}</p>
            </div>
          ) : null}
          {enrollments.map((enrollment) => (
            <div
              key={enrollment.user.id}
              className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1fr_160px_140px] sm:items-center"
            >
              <div>
                <p className="font-medium text-foreground">{enrollment.user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {enrollment.user.email}
                  {enrollment.user.batch ? ` • ${enrollment.user.batch}` : ""}
                </p>
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={attendanceDrafts[enrollment.user.id] || "present"}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  const nextStatus = event.target.value as "present" | "absent";
                  setAttendanceDrafts((current) => ({ ...current, [enrollment.user.id]: nextStatus }));
                  setAttendanceScoreDrafts((current) => ({
                    ...current,
                    [enrollment.user.id]:
                      nextStatus === "absent" ? "0" : current[enrollment.user.id] || String(session?.maxScore ?? 0),
                  }));
                }}
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
              {session?.maxScore ? (
                <Input
                  type="number"
                  min="0"
                  max={session?.maxScore ?? 0}
                  disabled={(attendanceDrafts[enrollment.user.id] || "present") === "absent"}
                  value={
                    (attendanceDrafts[enrollment.user.id] || "present") === "absent"
                      ? "0"
                      : attendanceScoreDrafts[enrollment.user.id] || String(session?.maxScore ?? 0)
                  }
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setAttendanceScoreDrafts((current) => ({ ...current, [enrollment.user.id]: event.target.value }))
                  }
                />
              ) : (
                <div className="flex h-10 items-center rounded-md border border-dashed border-border px-3 text-sm text-muted-foreground">
                  Non-graded
                </div>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Update attendance</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
