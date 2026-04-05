import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { ArrowLeft, CalendarDays, Plus, Trash2, Users } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createInteractiveSession,
  getManagedProgrammeDetail,
  type ManagedProgramme,
  updateInteractiveSession,
} from "../api/programmeManager";
import { ManagerSidebar } from "../components/dashboard/ManagerSidebar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";

const createEmptyOccurrence = () => ({
  id: undefined as string | undefined,
  scheduledAt: "",
  durationMinutes: "60",
  meetingUrl: "",
  assignedUserIds: [] as string[],
});

const createEmptySessionForm = () => ({
  title: "",
  description: "",
  maxScore: "0",
  occurrences: [createEmptyOccurrence()],
});

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "No date";

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
};

export default function ManagerInteractiveSessionEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id, sessionId } = useParams();

  const dashboardBasePath = location.pathname.startsWith("/tutor")
    ? "/tutor"
    : "/programme-manager";

  const [programme, setProgramme] = useState<ManagedProgramme | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionScholarSearch, setSessionScholarSearch] = useState("");
  const [openSection, setOpenSection] = useState("basic-details");
  const [sessionForm, setSessionForm] = useState(createEmptySessionForm);

  const loadProgramme = useCallback(async () => {
    if (!id) {
      setProgramme(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getManagedProgrammeDetail(id);
      const nextProgramme = (response?.data?.programme as ManagedProgramme) || null;
      setProgramme(nextProgramme);

      if (!nextProgramme) {
        setSessionForm(createEmptySessionForm());
        return;
      }

      if (sessionId) {
        const existingSession =
          nextProgramme.interactiveSessions.find((session) => session.id === sessionId) || null;

        if (!existingSession) {
          toast({
            title: "Interactive session not found",
            description: "This session may have been deleted or moved.",
            variant: "destructive",
          });
          navigate(`${dashboardBasePath}/programmes/${id}`);
          return;
        }

        setSessionForm({
          title: existingSession.title,
          description: existingSession.description || "",
          maxScore: String(existingSession.maxScore || 0),
          occurrences:
            existingSession.occurrences.length > 0
              ? existingSession.occurrences.map((occurrence) => ({
                  id: occurrence.id,
                  scheduledAt: toDateTimeLocalValue(occurrence.scheduledAt),
                  durationMinutes: String(occurrence.durationMinutes || 60),
                  meetingUrl: occurrence.meetingUrl || "",
                  assignedUserIds: occurrence.assignments.map((assignment) => assignment.userId),
                }))
              : [createEmptyOccurrence()],
        });
      } else {
        setSessionForm(createEmptySessionForm());
      }

      setOpenSection("basic-details");
      setSessionScholarSearch("");
    } catch (error) {
      toast({
        title: "Unable to load interactive session",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [dashboardBasePath, id, navigate, sessionId, toast]);

  useEffect(() => {
    void loadProgramme();
  }, [loadProgramme]);

  const editingSession = useMemo(
    () =>
      programme?.interactiveSessions.find((session) => session.id === sessionId) || null,
    [programme, sessionId],
  );

  const programmeEnrollments = programme?.enrollments || [];

  const goBack = () => navigate(`${dashboardBasePath}/programmes/${id}`);

  const handleOccurrenceFieldChange = (
    index: number,
    field: "scheduledAt" | "durationMinutes" | "meetingUrl",
    value: string,
  ) => {
    setSessionForm((current) => ({
      ...current,
      occurrences: current.occurrences.map((entry, occurrenceIndex) =>
        occurrenceIndex === index ? { ...entry, [field]: value } : entry,
      ),
    }));
  };

  const handleOccurrenceScholarToggle = (index: number, userId: string) => {
    setSessionForm((current) => ({
      ...current,
      occurrences: current.occurrences.map((entry, occurrenceIndex) =>
        occurrenceIndex === index
          ? {
              ...entry,
              assignedUserIds: entry.assignedUserIds.includes(userId)
                ? entry.assignedUserIds.filter((entryUserId) => entryUserId !== userId)
                : [...entry.assignedUserIds, userId],
            }
          : entry,
      ),
    }));
  };

  const handleAssignAllAvailableScholars = (index: number, userIds: string[]) => {
    setSessionForm((current) => ({
      ...current,
      occurrences: current.occurrences.map((entry, occurrenceIndex) =>
        occurrenceIndex === index
          ? {
              ...entry,
              assignedUserIds: Array.from(new Set([...entry.assignedUserIds, ...userIds])),
            }
          : entry,
      ),
    }));
  };

  const handleRemoveOccurrence = (index: number) => {
    const nextSection =
      index > 0 || sessionForm.occurrences.length - 1 > 1
        ? `date-${Math.max(0, index - 1)}`
        : "basic-details";

    setSessionForm((current) => ({
      ...current,
      occurrences: current.occurrences.filter((_, occurrenceIndex) => occurrenceIndex !== index),
    }));
    setOpenSection(nextSection);
  };

  const handleAddOccurrence = () => {
    setSessionForm((current) => {
      const nextOccurrences = [...current.occurrences, createEmptyOccurrence()];
      setOpenSection(`date-${nextOccurrences.length - 1}`);
      return {
        ...current,
        occurrences: nextOccurrences,
      };
    });
  };

  const handleSave = async () => {
    if (!programme) return;

    if (
      !sessionForm.title.trim() ||
      sessionForm.occurrences.some(
        (occurrence) => !occurrence.scheduledAt || !occurrence.assignedUserIds.length,
      )
    ) {
      toast({
        title: "Session details required",
        description: "Add a title, every session date, and at least one scholar for each date.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: sessionForm.title.trim(),
        description: sessionForm.description.trim(),
        maxScore: Number(sessionForm.maxScore || 0),
        occurrences: sessionForm.occurrences.map((occurrence) => ({
          id: occurrence.id,
          scheduledAt: occurrence.scheduledAt,
          durationMinutes: Number(occurrence.durationMinutes || 60),
          meetingUrl: occurrence.meetingUrl.trim() || undefined,
          assignedUserIds: occurrence.assignedUserIds,
        })),
      };

      if (editingSession) {
        await updateInteractiveSession(editingSession.id, payload);
      } else {
        await createInteractiveSession(programme.id, payload);
      }

      toast({
        title: editingSession ? "Interactive session updated" : "Interactive session created",
        description: editingSession
          ? "The session dates and scholar allocations are now saved."
          : "The session is now available in the programme.",
      });
      goBack();
    } catch (error) {
      toast({
        title: editingSession ? "Unable to update session" : "Unable to create session",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <ManagerSidebar
        activeSection="programmes"
        onSelectSection={(section) => navigate(`${dashboardBasePath}?section=${section}`)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 pl-14 backdrop-blur-md lg:px-8 lg:pl-8">
          <div>
            <h1 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Programme Manager
            </h1>
            <p className="text-xs text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft size={16} className="mr-2" />
              Back to programme
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || loading}>
              {saving
                ? editingSession
                  ? "Saving..."
                  : "Creating..."
                : editingSession
                  ? "Save changes"
                  : "Create session"}
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-sm text-muted-foreground">
                  Loading interactive session editor...
                </CardContent>
              </Card>
            ) : !programme ? (
              <Card>
                <CardContent className="py-12 text-sm text-muted-foreground">
                  This programme could not be loaded.
                </CardContent>
              </Card>
            ) : (
              <>
                <section className="overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(12,106,204,0.10),rgba(255,255,255,0.98),rgba(32,201,151,0.06))] p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-vahani-blue">
                        Interactive Session
                      </p>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        {editingSession ? `Edit ${editingSession.title}` : "Create a new interactive session"}
                      </h2>
                      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                        Build one logical session, then split it into real scheduled dates and assign the right scholars to each date.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
                      <div className="rounded-2xl border border-border bg-card/80 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                          Programme
                        </p>
                        <p className="mt-2 text-sm font-semibold text-foreground">{programme.title}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-card/80 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                          Scholars
                        </p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {programme.enrollments.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">Session builder</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          One section stays open at a time so managers can focus on one decision.
                        </p>
                      </div>
                      <Badge variant="outline">
                        {sessionForm.occurrences.length} date
                        {sessionForm.occurrences.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Accordion
                      type="single"
                      collapsible
                      value={openSection}
                      onValueChange={(value) => setOpenSection(value || "basic-details")}
                      className="space-y-3"
                    >
                      <AccordionItem
                        value="basic-details"
                        className="overflow-hidden rounded-2xl border border-border bg-background"
                      >
                        <AccordionTrigger className="px-5 text-left text-base font-semibold">
                          Basic details
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 px-5 pb-5 pt-1">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Title</Label>
                              <Input
                                value={sessionForm.title}
                                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                  setSessionForm((current) => ({
                                    ...current,
                                    title: event.target.value,
                                  }))
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
                                  setSessionForm((current) => ({
                                    ...current,
                                    maxScore: event.target.value,
                                  }))
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
                              rows={4}
                              value={sessionForm.description}
                              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                                setSessionForm((current) => ({
                                  ...current,
                                  description: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {sessionForm.occurrences.map((occurrence, index) => {
                        const assignedUserIds = new Set(occurrence.assignedUserIds);
                        const assignedElsewhere = new Set(
                          sessionForm.occurrences.flatMap((entry, occurrenceIndex) =>
                            occurrenceIndex === index ? [] : entry.assignedUserIds,
                          ),
                        );
                        const searchableEnrollments = programmeEnrollments.filter((enrollment) => {
                          const haystack = `${enrollment.user.name} ${enrollment.user.email} ${
                            enrollment.user.batch || ""
                          } ${enrollment.trackGroup || ""}`.toLowerCase();
                          return (
                            !sessionScholarSearch.trim() ||
                            haystack.includes(sessionScholarSearch.toLowerCase())
                          );
                        });
                        const assignedEnrollments = searchableEnrollments.filter((enrollment) =>
                          assignedUserIds.has(enrollment.user.id),
                        );
                        const availableEnrollments = searchableEnrollments.filter(
                          (enrollment) =>
                            !assignedUserIds.has(enrollment.user.id) &&
                            !assignedElsewhere.has(enrollment.user.id),
                        );

                        return (
                          <AccordionItem
                            key={occurrence.id || `occurrence-${index}`}
                            value={`date-${index}`}
                            className="overflow-hidden rounded-2xl border border-border bg-background"
                          >
                            <AccordionTrigger className="px-5 text-left">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-foreground">Date {index + 1}</span>
                                <Badge variant="outline">
                                  {occurrence.scheduledAt
                                    ? formatDate(occurrence.scheduledAt)
                                    : "Unscheduled"}
                                </Badge>
                                <Badge variant="secondary">
                                  {occurrence.assignedUserIds.length} scholar
                                  {occurrence.assignedUserIds.length === 1 ? "" : "s"}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 px-5 pb-5 pt-1">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm text-muted-foreground">
                                  Assign scholars to this specific delivery date. Scholars already used in another date disappear from the available list here.
                                </p>
                                {sessionForm.occurrences.length > 1 ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveOccurrence(index)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove date
                                  </Button>
                                ) : null}
                              </div>

                              <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-2">
                                  <Label>Date & time</Label>
                                  <Input
                                    type="datetime-local"
                                    value={occurrence.scheduledAt}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                      handleOccurrenceFieldChange(index, "scheduledAt", event.target.value)
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Duration (minutes)</Label>
                                  <Input
                                    type="number"
                                    min="15"
                                    step="15"
                                    value={occurrence.durationMinutes}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                      handleOccurrenceFieldChange(index, "durationMinutes", event.target.value)
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Meeting URL</Label>
                                  <Input
                                    value={occurrence.meetingUrl}
                                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                      handleOccurrenceFieldChange(index, "meetingUrl", event.target.value)
                                    }
                                  />
                                </div>
                              </div>

                              <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/15 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-foreground">Scholar assignment</p>
                                    <p className="text-sm text-muted-foreground">
                                      {assignedEnrollments.length} assigned, {availableEnrollments.length} available
                                    </p>
                                  </div>
                                  <div className="flex w-full max-w-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                                    <div className="sm:min-w-[220px] sm:flex-1">
                                      <Input
                                        placeholder="Search by name, email, batch, or track group"
                                        value={sessionScholarSearch}
                                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                          setSessionScholarSearch(event.target.value)
                                        }
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={availableEnrollments.length === 0}
                                      onClick={() =>
                                        handleAssignAllAvailableScholars(
                                          index,
                                          availableEnrollments.map((enrollment) => enrollment.user.id),
                                        )
                                      }
                                    >
                                      Select all eligible scholars
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-muted-foreground" />
                                      <p className="text-sm font-medium text-foreground">Available scholars</p>
                                    </div>
                                    <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                                      {availableEnrollments.length === 0 ? (
                                        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                          No more scholars are available for this date with the current filters.
                                        </p>
                                      ) : (
                                        availableEnrollments.map((enrollment) => (
                                          <button
                                            key={`available-${enrollment.id}`}
                                            type="button"
                                            onClick={() =>
                                              handleOccurrenceScholarToggle(index, enrollment.user.id)
                                            }
                                            className="flex w-full items-start justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition hover:border-vahani-blue/40 hover:bg-vahani-blue/5"
                                          >
                                            <div>
                                              <p className="font-medium text-foreground">{enrollment.user.name}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {enrollment.user.email}
                                                {enrollment.user.batch ? ` • ${enrollment.user.batch}` : ""}
                                                {enrollment.trackGroup ? ` • Track ${enrollment.trackGroup}` : ""}
                                              </p>
                                            </div>
                                            <span className="text-xs font-medium text-vahani-blue">Add</span>
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                      <p className="text-sm font-medium text-foreground">Assigned to this date</p>
                                    </div>
                                    <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1">
                                      {assignedEnrollments.length === 0 ? (
                                        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                                          No scholars assigned yet.
                                        </p>
                                      ) : (
                                        assignedEnrollments.map((enrollment) => (
                                          <button
                                            key={`assigned-${enrollment.id}`}
                                            type="button"
                                            onClick={() =>
                                              handleOccurrenceScholarToggle(index, enrollment.user.id)
                                            }
                                            className="flex w-full items-start justify-between rounded-xl border border-vahani-blue/30 bg-vahani-blue/5 px-4 py-3 text-left transition hover:border-destructive/40 hover:bg-destructive/5"
                                          >
                                            <div>
                                              <p className="font-medium text-foreground">{enrollment.user.name}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {enrollment.user.email}
                                                {enrollment.user.batch ? ` • ${enrollment.user.batch}` : ""}
                                                {enrollment.trackGroup ? ` • Track ${enrollment.trackGroup}` : ""}
                                              </p>
                                            </div>
                                            <span className="text-xs font-medium text-destructive">Remove</span>
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                  A scholar can only be assigned to one date for this interactive session.
                                </p>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>

                    <div className="flex justify-end">
                      <Button type="button" variant="outline" onClick={handleAddOccurrence}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add another date
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
