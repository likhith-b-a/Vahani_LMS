import { type ManagedProgramme } from "@/api/programmeManager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/dateFormat";

type ManagedEnrollment = ManagedProgramme["enrollments"][number];

interface StudentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudentDetail: ManagedEnrollment | null;
  selectedProgramme: ManagedProgramme | null;
}

export function StudentDetailDialog({
  open,
  onOpenChange,
  selectedStudentDetail,
  selectedProgramme,
}: StudentDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {selectedStudentDetail?.user.name || "Scholar details"}
          </DialogTitle>
          <DialogDescription>
            Review the selected scholar inside the current programme.
          </DialogDescription>
        </DialogHeader>
        {selectedStudentDetail && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="mt-1 font-medium text-foreground">
                  {selectedStudentDetail.user.email}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Batch</p>
                <p className="mt-1 font-medium text-foreground">
                  {selectedStudentDetail.user.batch || "No batch"}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Programme</p>
                <p className="mt-1 font-medium text-foreground">
                  {selectedProgramme?.title || "No programme selected"}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Enrollment</p>
                <p className="mt-1 font-medium text-foreground">
                  {selectedStudentDetail.status}
                </p>
              </div>
              {selectedProgramme?.groupedDeliveryEnabled ? (
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Track group</p>
                  <p className="mt-1 font-medium text-foreground">
                    {selectedStudentDetail.trackGroup || "Unassigned"}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Enrolled on</p>
              <p className="mt-1 font-medium text-foreground">
                {formatDate(selectedStudentDetail.enrolledAt)}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
