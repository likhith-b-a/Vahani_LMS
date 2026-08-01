import { useEffect, useState, type ChangeEvent } from "react";
import { type ManagedProgrammeAssignment } from "@/api/programmeManager";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface AssignmentFormState {
  title: string;
  description: string;
  dueDate: string;
  maxScore: string;
  assignmentType: string;
  targetTrackGroups: string[];
  isGraded: boolean;
  allowLateSubmission: boolean;
  allowResubmission: boolean;
}

const emptyAssignmentForm: AssignmentFormState = {
  title: "",
  description: "",
  dueDate: "",
  maxScore: "",
  assignmentType: "document",
  targetTrackGroups: [],
  isGraded: true,
  allowLateSubmission: true,
  allowResubmission: true,
};

const assignmentToFormState = (assignment: ManagedProgrammeAssignment): AssignmentFormState => ({
  title: assignment.title,
  description: assignment.description || "",
  dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : "",
  maxScore: assignment.maxScore !== null && assignment.maxScore !== undefined ? String(assignment.maxScore) : "",
  assignmentType: assignment.assignmentType,
  targetTrackGroups: assignment.targetTrackGroups || [],
  isGraded: true,
  allowLateSubmission: true,
  allowResubmission: true,
});

export interface AssignmentPayload {
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  assignmentType: string;
  targetTrackGroups: string[];
  isGraded: boolean;
  allowLateSubmission: boolean;
  allowResubmission: boolean;
}

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAssignment: ManagedProgrammeAssignment | null;
  groupedDeliveryEnabled: boolean;
  groupTrackGroups: string[];
  onSubmit: (payload: AssignmentPayload, editingAssignmentId: string | null) => void;
}

export function AssignmentDialog({
  open,
  onOpenChange,
  editingAssignment,
  groupedDeliveryEnabled,
  groupTrackGroups,
  onSubmit,
}: AssignmentDialogProps) {
  const { toast } = useToast();
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(emptyAssignmentForm);

  useEffect(() => {
    if (open) {
      setAssignmentForm(editingAssignment ? assignmentToFormState(editingAssignment) : emptyAssignmentForm);
    }
  }, [open, editingAssignment]);

  const handleSubmit = () => {
    if (!assignmentForm.title.trim() || !assignmentForm.description.trim() || !assignmentForm.dueDate || !assignmentForm.maxScore) {
      toast({
        title: "Assignment details required",
        description: "Fill in title, description, due date, and max marks.",
        variant: "destructive",
      });
      return;
    }

    onSubmit(
      {
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim(),
        dueDate: assignmentForm.dueDate,
        maxScore: Number(assignmentForm.maxScore),
        assignmentType: assignmentForm.assignmentType,
        targetTrackGroups: assignmentForm.targetTrackGroups,
        isGraded: assignmentForm.isGraded,
        allowLateSubmission: assignmentForm.allowLateSubmission,
        allowResubmission: assignmentForm.allowResubmission,
      },
      editingAssignment?.id || null,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingAssignment ? "Edit assignment" : "Add assignment"}</DialogTitle>
          <DialogDescription>
            {editingAssignment
              ? "Update the assignment details for this programme."
              : "Create a new assignment for this programme."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={assignmentForm.title}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setAssignmentForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Assignment type</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={assignmentForm.assignmentType}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setAssignmentForm((current) => ({ ...current, assignmentType: event.target.value }))
                }
              >
                {["document", "audio", "video", "quiz", "archive", "link_submission"].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input
                type="datetime-local"
                value={assignmentForm.dueDate}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setAssignmentForm((current) => ({ ...current, dueDate: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Max marks</Label>
              <Input
                type="number"
                min="0"
                value={assignmentForm.maxScore}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setAssignmentForm((current) => ({ ...current, maxScore: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={assignmentForm.description}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setAssignmentForm((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>
          {groupedDeliveryEnabled && groupTrackGroups.length > 0 ? (
            <div className="space-y-2">
              <Label>Target track groups</Label>
              <div className="flex flex-wrap gap-2">
                {groupTrackGroups.map((group) => (
                  <label key={group} className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={assignmentForm.targetTrackGroups.includes(group)}
                      onChange={() =>
                        setAssignmentForm((current) => ({
                          ...current,
                          targetTrackGroups: current.targetTrackGroups.includes(group)
                            ? current.targetTrackGroups.filter((entry) => entry !== group)
                            : [...current.targetTrackGroups, group],
                        }))
                      }
                    />
                    <span>{group}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave all unchecked to show the assignment to every scholar in the programme.
              </p>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{editingAssignment ? "Update assignment" : "Add assignment"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
