import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { ArrowLeft, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createInteractiveSession,
  getManagedProgrammeDetail,
  type ManagedInteractiveSession,
  type ManagedProgramme,
  updateInteractiveSession,
} from "../api/programmeManager";
import { ManagerSidebar } from "../components/dashboard/ManagerSidebar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";

const emptySessionForm = {
  title: "",
  description: "",
  maxScore: "0",
  occurrences: [
    {
      scheduledAt: "",
      durationMinutes: "60",
      meetingUrl: "",
      assignedUserIds: [] as string[],
    },
  ],
};

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "No date";

export default function ManagerInteractiveSessionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id, sessionId } = useParams();

  const dashboardBasePath = location.pathname.startsWith("/tutor")
    ? "/tutor"
    : "/programme-manager";
  const isEditMode = Boolean(sessionId);

  const [programme, setProgramme] = useState<ManagedProgramme | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionScholarSearch, setSessionScholarSearch] = useState("");
  const [openSection, setOpenSection] = useState("basic-details");
  const [sessionForm, setSessionForm] = useState(emptySessionForm);

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

      if (sessionId && nextProgramme) {
        const session = nextProgramme.interactiveSessions.find((entry) => entry.id === sessionId);
        if (session) {
          setSessionForm({
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
                : emptySessionForm.occurrences,
          });
        }
      }
    } catch (error) {
      toast({
        title: "Unable to load session workspace",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, sessionId, toast]);

  useEffect(() => {
    void loadProgramme();
  }, [loadProgramme]);

  const handleSaveSession = async () => {
    if (!programme) return;
    if (
      !sessionForm.title.trim() ||
      sessionForm.occurrences.some(
        (occurrence) => !occurrence.scheduledAt || !occurrence.assignedUserIds.length,
      )
    ) {
      toast({
        title: "Session details required",
        description: "Add a title, each date, and at least one scholar for every date.",
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
          scheduledAt: occurrence.scheduledAt,
          durationMinutes: Number(occurrence.durationMinutes || 60),
          meetingUrl: occurrence.meetingUrl.trim() || undefined,
          assignedUserIds: occurrence.assignedUserIds,
        })),
      };

      if (sessionId) {
        await updateInteractiveSession(sessionId, payload);
      } else {
        await createInteractiveSession(programme.id, payload);
      }

      toast({
        title: sessionId ? "Interactive session updated" : "Interactive session created",
        description: "The session schedule has been saved.",
      });
      navigate(`${dashboardBasePath}/programmes/${programme.id}`);
    } catch (error) {
      toast({
        title: sessionId ? "Unable to update session" : "Unable to create session",
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
            <Button variant="outline" onClick={() => void loadProgramme()}>
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => navigate(`${dashboardBasePath}/programmes/${id}`)}>
              <ArrowLeft size={16} className="mr-2" />
              Back to programme
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
                <section className="overflow-hidden rounded-[1.75rem] border border-border bg-[linear-gradient(135deg,rgba(12,106,204,0.10),rgba(255,255,255,0.98),rgba(32,201,151,0.06))] p-5 shadow-sm sm:p-6">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-vahani-blue">
                      Interactive Session Editor
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        {isEditMode ? "Edit interactive session" : "Create interactive session"}
                      </h2>
                      <Badge variant="outline">{programme.title}</Badge>
                    </div>
                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                      Create one logical session and split scholars across multiple scheduled dates without duplicates.
                    </p>
                  </div>
                </section>

                <Card>
                  <CardHeader className="space-y-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <Input
                        placeholder="Search scholars by name, email, batch, or track group"
                        value={sessionScholarSearch}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setSessionScholarSearch(event.target.value)
                        }
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
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

                      {sessionForm.occurrences.map((occurrence, index) => {
                        const assignedUserIds = new Set(occurrence.assignedUserIds);
                        const assignedElsewhere = new Set(
                          sessionForm.occurrences.flatMap((entry, occurrenceIndex) =>
                            occurrenceIndex === index ? [] : entry.assignedUserIds,
                          ),
                        );
                        const searchableEnrollments = (programme.enrollments || []).filter((enrollment) =>
                          !sessionScholarSearch.trim() ||
                          `${enrollment.user.name} ${enrollment.user.email} ${enrollment.user.batch || ""} ${enrollment.trackGroup || ""}`
                            .toLowerCase()
                            .includes(sessionScholarSearch.toLowerCase()),
                        );
                        const visibleEnrollments = searchableEnrollments.filter(
                          (enrollment) =>
                            assignedUserIds.has(enrollment.user.id) ||
                            !assignedElsewhere.has(enrollment.user.id),
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
                                    {occurrence.scheduledAt
                                      ? formatDateTime(occurrence.scheduledAt)
                                      : `Date ${index + 1}`}
                                  </p>
                                </div>
                                <Badge variant="outline">
                                  {occurrence.assignedUserIds.length} scholar
                                  {occurrence.assignedUserIds.length === 1 ? "" : "s"}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pb-4">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-foreground">
                                  Configure date and scholar audience
                                </p>
                                {sessionForm.occurrences.length > 1 ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSessionForm((current) => ({
                                        ...current,
                                        occurrences: current.occurrences.filter(
                                          (_, occurrenceIndex) => occurrenceIndex !== index,
                                        ),
                                      }));
                                      setOpenSection(index > 0 ? `date-${index - 1}` : "basic-details");
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
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
                                          occurrenceIndex === index
                                            ? { ...entry, scheduledAt: event.target.value }
                                            : entry,
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
                                          occurrenceIndex === index
                                            ? { ...entry, durationMinutes: event.target.value }
                                            : entry,
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
                                          occurrenceIndex === index
                                            ? { ...entry, meetingUrl: event.target.value }
                                            : entry,
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>
                                  Scholars for this date ({occurrence.assignedUserIds.length} assigned)
                                </Label>
                                <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border/70 p-3">
                                  {visibleEnrollments.map((enrollment) => (
                                    <label
                                      key={`${index}-${enrollment.user.id}`}
                                      className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
                                    >
                                      <div>
                                        <p className="font-medium text-foreground">{enrollment.user.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {enrollment.user.email}
                                          {enrollment.user.batch ? ` • ${enrollment.user.batch}` : ""}
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
                                                      ? entry.assignedUserIds.filter(
                                                          (userId) => userId !== enrollment.user.id,
                                                        )
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
                                  Scholars already assigned to another date are hidden here unless they are already assigned to this date.
                                </p>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSessionForm((current) => {
                            const nextOccurrences = [
                              ...current.occurrences,
                              {
                                scheduledAt: "",
                                durationMinutes: "60",
                                meetingUrl: "",
                                assignedUserIds: [],
                              },
                            ];
                            setOpenSection(`date-${nextOccurrences.length - 1}`);
                            return {
                              ...current,
                              occurrences: nextOccurrences,
                            };
                          })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add another date
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`${dashboardBasePath}/programmes/${programme.id}`)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => void handleSaveSession()} disabled={saving}>
                    {saving
                      ? isEditMode
                        ? "Updating..."
                        : "Creating..."
                      : isEditMode
                        ? "Update session"
                        : "Create session"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
