import { useEffect, useState, type ChangeEvent } from "react";
import { type ManagedInteractiveSession, type ManagedProgramme } from "@/api/programmeManager";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
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
import { formatDateTime } from "@/lib/dateFormat";

interface SessionOccurrenceFormState {
  scheduledAt: string;
  durationMinutes: string;
  meetingUrl: string;
  assignedUserIds: string[];
}

interface SessionFormState {
  title: string;
  description: string;
  maxScore: string;
  occurrences: SessionOccurrenceFormState[];
}

const emptyOccurrence: SessionOccurrenceFormState = {
  scheduledAt: "",
  durationMinutes: "60",
  meetingUrl: "",
  assignedUserIds: [],
};

const emptySessionForm: SessionFormState = {
  title: "",
  description: "",
  maxScore: "0",
  occurrences: [{ ...emptyOccurrence }],
};

const sessionToFormState = (session: ManagedInteractiveSession): SessionFormState => ({
  title: session.title,
  description: session.description || "",
  maxScore: String(session.maxScore || 0),
  occurrences:
    session.occurrences.length > 0
      ? session.occurrences.map((occurrence) => ({
          scheduledAt: new Date(occurrence.scheduledAt).toISOString().slice(0, 16),
          durationMinutes: String(occurrence.durationMinutes || 60),
          meetingUrl: occurrence.meetingUrl || "",
          assignedUserIds: occurrence.assignments.map((assignment) => assignment.userId),
        }))
      : [{ ...emptyOccurrence }],
});

export interface SessionPayload {
  title: string;
  description: string;
  maxScore: number;
  occurrences: Array<{
    scheduledAt: string;
    durationMinutes: number;
    meetingUrl?: string;
    assignedUserIds: string[];
  }>;
}

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSession: ManagedInteractiveSession | null;
  enrollments: ManagedProgramme["enrollments"];
  onSubmit: (payload: SessionPayload, editingSessionId: string | null) => void;
}

export function SessionDialog({ open, onOpenChange, editingSession, enrollments, onSubmit }: SessionDialogProps) {
  const { toast } = useToast();
  const [sessionForm, setSessionForm] = useState<SessionFormState>(emptySessionForm);
  const [openSection, setOpenSection] = useState("basic-details");
  const [scholarSearch, setScholarSearch] = useState("");

  useEffect(() => {
    if (open) {
      setSessionForm(editingSession ? sessionToFormState(editingSession) : emptySessionForm);
      setOpenSection("basic-details");
      setScholarSearch("");
    }
  }, [open, editingSession]);

  const handleSubmit = () => {
    if (
      !sessionForm.title.trim() ||
      sessionForm.occurrences.some((occurrence) => !occurrence.scheduledAt || !occurrence.assignedUserIds.length)
    ) {
      toast({
        title: "Session details required",
        description: "Add a title, every session date, and at least one scholar for each date.",
        variant: "destructive",
      });
      return;
    }

    onSubmit(
      {
        title: sessionForm.title.trim(),
        description: sessionForm.description.trim(),
        maxScore: Number(sessionForm.maxScore || 0),
        occurrences: sessionForm.occurrences.map((occurrence) => ({
          scheduledAt: occurrence.scheduledAt,
          durationMinutes: Number(occurrence.durationMinutes || 60),
          meetingUrl: occurrence.meetingUrl.trim() || undefined,
          assignedUserIds: occurrence.assignedUserIds,
        })),
      },
      editingSession?.id || null,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingSession ? "Edit interactive session" : "Schedule interactive session"}</DialogTitle>
          <DialogDescription>
            {editingSession
              ? "Update the session details, meeting link, and marks configuration."
              : "Add the session details, meeting link, and marks configuration."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <Input
              placeholder="Search scholars by name, email, batch, or track group"
              value={scholarSearch}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setScholarSearch(event.target.value)}
            />
          </div>
          <Accordion
            type="single"
            collapsible
            value={openSection}
            onValueChange={(value) => setOpenSection(value || "basic-details")}
            className="space-y-3"
          >
            <AccordionItem value="basic-details" className="rounded-2xl border border-border px-4">
              <AccordionTrigger className="py-4 text-left text-base font-semibold text-foreground hover:no-underline">
                Basic details
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={sessionForm.title}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setSessionForm((current) => ({ ...current, title: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max marks</Label>
                    <Input
                      type="number"
                      min="0"
                      value={sessionForm.maxScore}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setSessionForm((current) => ({ ...current, maxScore: event.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Set this to 0 for attendance-only, non-graded sessions.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    value={sessionForm.description}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      setSessionForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
            <div className="space-y-3">
              {sessionForm.occurrences.map((occurrence, index) => {
                const assignedUserIds = new Set(occurrence.assignedUserIds);
                const assignedElsewhere = new Set(
                  sessionForm.occurrences.flatMap((entry, occurrenceIndex) =>
                    occurrenceIndex === index ? [] : entry.assignedUserIds,
                  ),
                );
                const searchableEnrollments = enrollments.filter(
                  (enrollment) =>
                    !scholarSearch.trim() ||
                    `${enrollment.user.name} ${enrollment.user.email} ${enrollment.user.batch || ""} ${enrollment.trackGroup || ""}`
                      .toLowerCase()
                      .includes(scholarSearch.toLowerCase()),
                );
                const assignedEnrollments = searchableEnrollments.filter((enrollment) =>
                  assignedUserIds.has(enrollment.user.id),
                );
                const availableEnrollments = searchableEnrollments.filter(
                  (enrollment) => !assignedUserIds.has(enrollment.user.id) && !assignedElsewhere.has(enrollment.user.id),
                );

                return (
                  <AccordionItem
                    key={`${index}-${occurrence.scheduledAt}`}
                    value={`date-${index}`}
                    className="rounded-2xl border border-border px-4"
                  >
                    <AccordionTrigger className="py-4 text-left hover:no-underline">
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-3">
                        <div>
                          <p className="font-semibold text-foreground">Session date {index + 1}</p>
                          <p className="text-sm text-muted-foreground">
                            {occurrence.scheduledAt ? formatDateTime(occurrence.scheduledAt) : `Date ${index + 1}`}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {occurrence.assignedUserIds.length} scholar{occurrence.assignedUserIds.length === 1 ? "" : "s"}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">
                          Configure date, link, and scholar audience
                        </p>
                        {sessionForm.occurrences.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const nextSection =
                                index > 0 || sessionForm.occurrences.length - 1 > 1
                                  ? `date-${Math.max(0, index - 1)}`
                                  : "basic-details";
                              setSessionForm((current) => ({
                                ...current,
                                occurrences: current.occurrences.filter((_, occurrenceIndex) => occurrenceIndex !== index),
                              }));
                              setOpenSection(nextSection);
                            }}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Scheduled at</Label>
                          <Input
                            type="datetime-local"
                            value={occurrence.scheduledAt}
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              setSessionForm((current) => ({
                                ...current,
                                occurrences: current.occurrences.map((entry, occurrenceIndex) =>
                                  occurrenceIndex === index ? { ...entry, scheduledAt: event.target.value } : entry,
                                ),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Duration (minutes)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={occurrence.durationMinutes}
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              setSessionForm((current) => ({
                                ...current,
                                occurrences: current.occurrences.map((entry, occurrenceIndex) =>
                                  occurrenceIndex === index ? { ...entry, durationMinutes: event.target.value } : entry,
                                ),
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>Meeting URL</Label>
                          <Input
                            value={occurrence.meetingUrl}
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              setSessionForm((current) => ({
                                ...current,
                                occurrences: current.occurrences.map((entry, occurrenceIndex) =>
                                  occurrenceIndex === index ? { ...entry, meetingUrl: event.target.value } : entry,
                                ),
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Label>
                          Scholars for this date ({assignedEnrollments.length} assigned, {availableEnrollments.length}{" "}
                          available)
                        </Label>
                        <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-border/70 p-3">
                          {searchableEnrollments
                            .filter(
                              (enrollment) =>
                                assignedUserIds.has(enrollment.user.id) || !assignedElsewhere.has(enrollment.user.id),
                            )
                            .map((enrollment) => (
                              <label
                                key={`${occurrence.scheduledAt}-${enrollment.user.id}`}
                                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
                              >
                                <div>
                                  <p className="font-medium text-foreground">{enrollment.user.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {enrollment.user.email}
                                    {enrollment.trackGroup ? ` • Track ${enrollment.trackGroup}` : ""}
                                  </p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={occurrence.assignedUserIds.includes(enrollment.user.id)}
                                  onChange={() =>
                                    setSessionForm((current) => ({
                                      ...current,
                                      occurrences: current.occurrences.map((entry, occurrenceIndex) =>
                                        occurrenceIndex === index
                                          ? {
                                              ...entry,
                                              assignedUserIds: entry.assignedUserIds.includes(enrollment.user.id)
                                                ? entry.assignedUserIds.filter((userId) => userId !== enrollment.user.id)
                                                : [...entry.assignedUserIds, enrollment.user.id],
                                            }
                                          : {
                                              ...entry,
                                              assignedUserIds: entry.assignedUserIds.filter(
                                                (userId) => userId !== enrollment.user.id,
                                              ),
                                            },
                                      ),
                                    }))
                                  }
                                />
                              </label>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          A scholar can only be assigned to one date for this interactive session.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSessionForm((current) => {
                      const nextOccurrences = [...current.occurrences, { ...emptyOccurrence }];
                      setOpenSection(`date-${nextOccurrences.length - 1}`);
                      return { ...current, occurrences: nextOccurrences };
                    })
                  }
                >
                  Add another date
                </Button>
              </div>
            </div>
          </Accordion>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{editingSession ? "Update session" : "Schedule session"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
