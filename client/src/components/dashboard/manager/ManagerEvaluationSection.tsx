import { type ChangeEvent } from "react";
import { Mail } from "lucide-react";
import { type ManagedInteractiveSession, type ManagedProgrammeAssignment, type ManagedSubmission } from "@/api/programmeManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EvaluationStudentRow {
  user: {
    id: string;
    name: string;
    email: string;
    batch?: string | null;
  };
  status: "present" | "absent";
  score: string;
}

interface PreviewFileState {
  url: string;
  title: string;
}

interface ManagerEvaluationSectionProps {
  programmes: Array<{ id: string; title: string }>;
  selectedProgrammeId: string;
  onSelectedProgrammeChange: (value: string) => void;
  selectedAssignmentId: string;
  onSelectedAssignmentChange: (value: string) => void;
  selectedAssignments: ManagedProgrammeAssignment[];
  selectedInteractiveSessions: ManagedInteractiveSession[];
  selectedAssignmentType: "" | "assignment" | "session";
  evaluationSearch: string;
  onEvaluationSearchChange: (value: string) => void;
  evaluationFilter: string;
  onEvaluationFilterChange: (value: string) => void;
  filteredSubmissions: ManagedSubmission[];
  filteredSessionStudents: EvaluationStudentRow[];
  selectedEvaluationSession: ManagedInteractiveSession | null;
  scoreDrafts: Record<string, string>;
  onScoreDraftChange: (submissionId: string, value: string) => void;
  onSaveMarks: (submissionId: string) => void;
  onOpenSubmissionFile: (submission: ManagedSubmission) => void;
  onEmailPendingAssignments: () => void;
  onEmailVisibleScholars: () => void;
  attendanceSessionMaxScore: number;
  onSessionStatusChange: (userId: string, status: "present" | "absent") => void;
  onSessionScoreChange: (userId: string, value: string) => void;
  onSaveSessionEvaluation: () => void;
  formatDateTime: (value?: string | null) => string;
  previewFile: PreviewFileState | null;
  onPreviewFileChange: (value: PreviewFileState | null) => void;
}

export function ManagerEvaluationSection({
  programmes,
  selectedProgrammeId,
  onSelectedProgrammeChange,
  selectedAssignmentId,
  onSelectedAssignmentChange,
  selectedAssignments,
  selectedInteractiveSessions,
  selectedAssignmentType,
  evaluationSearch,
  onEvaluationSearchChange,
  evaluationFilter,
  onEvaluationFilterChange,
  filteredSubmissions,
  filteredSessionStudents,
  selectedEvaluationSession,
  scoreDrafts,
  onScoreDraftChange,
  onSaveMarks,
  onOpenSubmissionFile,
  onEmailPendingAssignments,
  onEmailVisibleScholars,
  attendanceSessionMaxScore,
  onSessionStatusChange,
  onSessionScoreChange,
  onSaveSessionEvaluation,
  formatDateTime,
  previewFile,
  onPreviewFileChange,
}: ManagerEvaluationSectionProps) {
  return (
    <>
      <Card>
        <CardHeader className="space-y-5">
          <div>
            <CardTitle>Evaluation</CardTitle>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Choose a programme first, then select the assignment or interactive
              session you want to review. Document submissions open in a built-in
              preview here, while audio and video submissions download directly for
              review.
            </p>
          </div>

          <div className="space-y-4">
            <div className="max-w-xl space-y-2">
              <Label>Select programme</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedProgrammeId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  onSelectedProgrammeChange(event.target.value)
                }
              >
                <option value="">Select a programme</option>
                {programmes.map((programme) => (
                  <option key={programme.id} value={programme.id}>
                    {programme.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedProgrammeId ? (
              <div className="max-w-xl space-y-2">
                <Label>Select assignment or session</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedAssignmentId}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    onSelectedAssignmentChange(event.target.value)
                  }
                >
                  <option value="">Select an item</option>
                  {selectedAssignments.map((assignment) => (
                    <option key={assignment.id} value={`assignment:${assignment.id}`}>
                      Assignment: {assignment.title}
                    </option>
                  ))}
                  {selectedInteractiveSessions.map((session) => (
                    <option key={session.id} value={`session:${session.id}`}>
                      Interactive session: {session.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {!selectedProgrammeId ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Select a programme to begin evaluation.
            </div>
          ) : null}

          {selectedProgrammeId && !selectedAssignmentId ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              Now choose an assignment or interactive session to load scholar records.
            </div>
          ) : null}

          {selectedAssignmentId ? (
            <>
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedAssignmentType === "session"
                      ? "Interactive session evaluation"
                      : "Scholar submissions"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use search and the quick filter to narrow the list before grading or
                    following up.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row xl:min-w-[560px]">
                  <Input
                    value={evaluationSearch}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onEvaluationSearchChange(event.target.value)
                    }
                    placeholder="Search scholars by name, email, or batch"
                    className="sm:flex-1"
                  />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm sm:w-[220px]"
                    value={evaluationFilter}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      onEvaluationFilterChange(event.target.value)
                    }
                  >
                    {selectedAssignmentType === "session" ? (
                      <>
                        <option value="all">All scholars</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                      </>
                    ) : (
                      <>
                        <option value="all">All submissions</option>
                        <option value="under_evaluation">Under evaluation</option>
                        <option value="graded">Graded</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedAssignmentType === "assignment" ? (
                  <Button variant="outline" size="sm" onClick={onEmailPendingAssignments}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email not submitted
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEmailVisibleScholars}
                  disabled={
                    selectedAssignmentType === "session"
                      ? filteredSessionStudents.length === 0
                      : filteredSubmissions.length === 0
                  }
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Email visible scholars
                </Button>
              </div>
            </>
          ) : null}

          {selectedAssignmentType === "assignment" && filteredSubmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No submissions match the current search or filter.
            </p>
          ) : null}

          {selectedAssignmentType === "assignment" &&
            filteredSubmissions.map((submission) => (
              <div key={submission.id} className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-foreground">{submission.student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {submission.student.email}
                      {submission.student.batch ? ` | ${submission.student.batch}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatDateTime(submission.submittedAt)}
                    </p>
                    {submission.fileUrl ? (
                      <button
                        type="button"
                        className="mt-2 text-xs font-medium text-vahani-blue underline-offset-4 hover:underline"
                        onClick={() => onOpenSubmissionFile(submission)}
                      >
                        {submission.assignment.assignmentType === "document"
                          ? "Preview submission"
                          : "Download submission"}
                      </button>
                    ) : null}
                  </div>
                  <Badge variant="outline">{submission.status}</Badge>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    type="number"
                    min="0"
                    max={submission.assignment.maxScore ?? undefined}
                    value={scoreDrafts[submission.id] || ""}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onScoreDraftChange(submission.id, event.target.value)
                    }
                    className="sm:max-w-[180px]"
                  />
                  <Button onClick={() => onSaveMarks(submission.id)}>Save marks</Button>
                </div>
              </div>
            ))}

          {selectedAssignmentType === "session" && selectedEvaluationSession && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {selectedEvaluationSession.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateTime(selectedEvaluationSession.scheduledAt)}
                    </p>
                  </div>
                  <Badge variant="outline">Max marks {selectedEvaluationSession.maxScore}</Badge>
                </div>
              </div>

              {filteredSessionStudents.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No scholars match the current search or filter.
                </p>
              )}

              {filteredSessionStudents.map((entry) => (
                <div
                  key={entry.user.id}
                  className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_160px_140px]"
                >
                  <div>
                    <p className="font-medium text-foreground">{entry.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.user.email}
                      {entry.user.batch ? ` | ${entry.user.batch}` : ""}
                    </p>
                  </div>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={entry.status}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      onSessionStatusChange(
                        entry.user.id,
                        event.target.value as "present" | "absent",
                      )
                    }
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                  </select>
                  <Input
                    type="number"
                    min="0"
                    max={attendanceSessionMaxScore}
                    disabled={entry.status === "absent"}
                    value={entry.status === "absent" ? "0" : entry.score}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      onSessionScoreChange(entry.user.id, event.target.value)
                    }
                  />
                </div>
              ))}

              <div className="flex justify-end">
                <Button onClick={onSaveSessionEvaluation}>Save session evaluation</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(previewFile)}
        onOpenChange={(open) => {
          if (!open) {
            onPreviewFileChange(null);
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.title || "Submission preview"}</DialogTitle>
            <DialogDescription>
              Review the uploaded document here without leaving the evaluation flow.
            </DialogDescription>
          </DialogHeader>
          {previewFile ? (
            <div className="space-y-4">
              <iframe
                src={previewFile.url}
                title={previewFile.title}
                className="h-[70vh] w-full rounded-xl border border-border bg-background"
              />
              <div className="flex justify-end">
                <Button asChild variant="outline">
                  <a href={previewFile.url} target="_blank" rel="noreferrer">
                    Open in new tab
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
