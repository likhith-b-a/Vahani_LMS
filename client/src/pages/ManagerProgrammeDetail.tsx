import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  FileText,
  Link as LinkIcon,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  addProgrammeMeetingLink,
  addProgrammeResource,
  createInteractiveSession,
  createProgrammeAssignment,
  getManagedProgrammeDetail,
  markInteractiveSessionAttendance,
  publishProgrammeResults,
  type ManagedInteractiveSession,
  type ManagedProgramme,
} from "../api/programmeManager";
import { ManagerSidebar } from "../components/dashboard/ManagerSidebar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";

const emptyAssignmentForm = {
  title: "",
  description: "",
  dueDate: "",
  maxScore: "",
  assignmentType: "document",
  isGraded: true,
  allowLateSubmission: true,
  allowResubmission: true,
};

const emptySessionForm = {
  title: "",
  description: "",
  scheduledAt: "",
  durationMinutes: "60",
  maxScore: "0",
  meetingUrl: "",
};

const emptyResourceForm = {
  title: "",
  url: "",
  description: "",
  file: null as File | null,
};

const emptyMeetingForm = {
  title: "",
  url: "",
};

const tabs = [
  { id: "assignments", label: "Assignments", icon: FileText },
  { id: "sessions", label: "Interactive sessions", icon: CalendarDays },
  { id: "resources", label: "Resource material", icon: BookOpen },
  { id: "meetings", label: "Online meetings", icon: LinkIcon },
  { id: "scholars", label: "Scholars", icon: Users },
] as const;

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "No date";

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

export default function ManagerProgrammeDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const dashboardBasePath = location.pathname.startsWith("/tutor")
    ? "/tutor"
    : "/programme-manager";

  const [programme, setProgramme] = useState<ManagedProgramme | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]["id"]>("assignments");

  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);

  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [resourceForm, setResourceForm] = useState(emptyResourceForm);
  const [meetingForm, setMeetingForm] = useState(emptyMeetingForm);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, "present" | "absent">>({});
  const [attendanceScoreDrafts, setAttendanceScoreDrafts] = useState<Record<string, string>>({});

  const loadProgramme = useCallback(async () => {
    if (!id) {
      setProgramme(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getManagedProgrammeDetail(id);
      setProgramme((response?.data?.programme as ManagedProgramme) || null);
    } catch (error) {
      toast({
        title: "Unable to load programme",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    void loadProgramme();
  }, [loadProgramme]);

  const selectedAttendanceSession = useMemo(
    () =>
      programme?.interactiveSessions.find((session) => session.id === attendanceSessionId) ||
      null,
    [attendanceSessionId, programme],
  );

  const openAttendanceDialog = (session: ManagedInteractiveSession) => {
    if (!programme) return;
    setAttendanceSessionId(session.id);
    setAttendanceDrafts(
      Object.fromEntries(
        programme.enrollments.map((enrollment) => {
          const attendance = session.attendances.find((entry) => entry.userId === enrollment.user.id);
          return [enrollment.user.id, attendance?.status || "present"];
        }),
      ) as Record<string, "present" | "absent">,
    );
    setAttendanceScoreDrafts(
      Object.fromEntries(
        programme.enrollments.map((enrollment) => {
          const attendance = session.attendances.find((entry) => entry.userId === enrollment.user.id);
          return [
            enrollment.user.id,
            attendance?.score !== null && attendance?.score !== undefined
              ? String(attendance.score)
              : String(session.maxScore || 0),
          ];
        }),
      ) as Record<string, string>,
    );
    setShowAttendanceDialog(true);
  };

  const handleAddAssignment = async () => {
    if (!programme) return;
    if (
      !assignmentForm.title.trim() ||
      !assignmentForm.description.trim() ||
      !assignmentForm.dueDate ||
      !assignmentForm.maxScore
    ) {
      toast({
        title: "Assignment details required",
        description: "Fill in title, description, due date, and max marks.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createProgrammeAssignment(programme.id, {
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim(),
        dueDate: assignmentForm.dueDate,
        maxScore: Number(assignmentForm.maxScore),
        assignmentType: assignmentForm.assignmentType,
        isGraded: assignmentForm.isGraded,
        allowLateSubmission: assignmentForm.allowLateSubmission,
        allowResubmission: assignmentForm.allowResubmission,
      });
      setAssignmentForm(emptyAssignmentForm);
      setShowAssignmentDialog(false);
      await loadProgramme();
      toast({
        title: "Assignment added",
        description: "The new assignment is now visible to scholars.",
      });
    } catch (error) {
      toast({
        title: "Unable to add assignment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddSession = async () => {
    if (!programme) return;
    if (!sessionForm.title.trim() || !sessionForm.scheduledAt) {
      toast({
        title: "Session details required",
        description: "Add a title and scheduled time for the session.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createInteractiveSession(programme.id, {
        title: sessionForm.title.trim(),
        description: sessionForm.description.trim(),
        scheduledAt: sessionForm.scheduledAt,
        durationMinutes: Number(sessionForm.durationMinutes || 60),
        maxScore: Number(sessionForm.maxScore || 0),
        meetingUrl: sessionForm.meetingUrl.trim() || undefined,
      });
      setSessionForm(emptySessionForm);
      setShowSessionDialog(false);
      await loadProgramme();
      toast({
        title: "Session scheduled",
        description: "The interactive session has been added to the programme.",
      });
    } catch (error) {
      toast({
        title: "Unable to schedule session",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddResource = async () => {
    if (!programme) return;
    if (!resourceForm.title.trim() || (!resourceForm.url.trim() && !resourceForm.file)) {
      toast({
        title: "Resource details required",
        description: "Add a title and either a file or a link.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addProgrammeResource(programme.id, resourceForm);
      setResourceForm(emptyResourceForm);
      setShowResourceDialog(false);
      await loadProgramme();
      toast({
        title: "Resource added",
        description: "The study material has been attached to the programme.",
      });
    } catch (error) {
      toast({
        title: "Unable to add resource",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddMeeting = async () => {
    if (!programme) return;
    if (!meetingForm.title.trim() || !meetingForm.url.trim()) {
      toast({
        title: "Meeting details required",
        description: "Add both a title and a link for the online meeting.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addProgrammeMeetingLink(programme.id, {
        title: meetingForm.title.trim(),
        url: meetingForm.url.trim(),
      });
      setMeetingForm(emptyMeetingForm);
      setShowMeetingDialog(false);
      await loadProgramme();
      toast({
        title: "Meeting link added",
        description: "Scholars can now see the meeting in the programme.",
      });
    } catch (error) {
      toast({
        title: "Unable to add meeting",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAttendance = async () => {
    if (!programme || !attendanceSessionId) return;

    try {
      await markInteractiveSessionAttendance(
        attendanceSessionId,
        programme.enrollments.map((enrollment) => ({
          userId: enrollment.user.id,
          status: attendanceDrafts[enrollment.user.id] || "present",
          score: Number(
            attendanceDrafts[enrollment.user.id] === "absent"
              ? 0
              : attendanceScoreDrafts[enrollment.user.id] || 0,
          ),
        })),
      );
      setShowAttendanceDialog(false);
      await loadProgramme();
      toast({
        title: "Attendance updated",
        description: "The session attendance and marks have been saved.",
      });
    } catch (error) {
      toast({
        title: "Unable to update attendance",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePublishResults = async () => {
    if (!programme) return;
    try {
      await publishProgrammeResults(programme.id);
      await loadProgramme();
      toast({
        title: "Results published",
        description: "Programme completion status and credits have been updated.",
      });
    } catch (error) {
      toast({
        title: "Unable to publish results",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateCertificatesPlaceholder = () => {
    toast({
      title: "Certificates flow pending",
      description: "The button is ready. We can wire certificate generation next.",
    });
  };

  const summary = {
    assignments: programme?.assignments.length || 0,
    sessions: programme?.interactiveSessions.length || 0,
    resources: programme?.resources?.length || 0,
    meetings: programme?.meetingLinks?.length || 0,
    scholars: programme?.enrollments.length || 0,
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
          <Button variant="outline" onClick={() => void loadProgramme()}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(`${dashboardBasePath}?section=programmes`)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to programmes
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setShowAssignmentDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add assignment
                </Button>
                <Button variant="outline" onClick={() => setShowSessionDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Interactive session
                </Button>
                <Button variant="outline" onClick={() => setShowResourceDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Resource material
                </Button>
                <Button variant="outline" onClick={() => setShowMeetingDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Online meeting
                </Button>
                <Button variant="secondary" onClick={() => void handlePublishResults()}>
                  Publish results
                </Button>
                <Button variant="secondary" onClick={handleGenerateCertificatesPlaceholder}>
                  Generate certificates
                </Button>
              </div>
            </div>

            {loading ? (
              <Card>
                <CardContent className="py-12 text-sm text-muted-foreground">
                  Loading programme workspace...
                </CardContent>
              </Card>
            ) : !programme ? (
              <Card>
                <CardContent className="py-12 text-sm text-muted-foreground">
                  This programme was not found in your managed list.
                </CardContent>
              </Card>
            ) : (
              <>
                <section className="overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(12,106,204,0.10),rgba(255,255,255,0.98),rgba(32,201,151,0.06))] p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-vahani-blue">
                        Programme Workspace
                      </p>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        {programme.title}
                      </h2>
                      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                        {programme.description || "No programme description added yet."}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Created {formatDate(programme.createdAt)}</span>
                        <span>Managed by {programme.programmeManager?.name || "Unassigned"}</span>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:w-[460px]">
                      <div className="rounded-2xl border border-border bg-card/80 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Scholars</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{summary.scholars}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-card/80 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Assignments</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{summary.assignments}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-card/80 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Live sessions</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{summary.sessions}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-card/80 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Resources + meetings</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                          {summary.resources + summary.meetings}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {programme.resultsPublishedAt ? (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Results already published</p>
                    <p className="mt-1">
                      Published on {formatDateTime(programme.resultsPublishedAt)}. Scholars can now
                      see completion status and earned credits.
                    </p>
                  </div>
                ) : null}

                <Card>
                  <CardHeader className="gap-4">
                    <div className="flex flex-wrap gap-2">
                      {tabs.map((tab) => (
                        <Button
                          key={tab.id}
                          type="button"
                          variant={activeTab === tab.id ? "default" : "outline"}
                          onClick={() => setActiveTab(tab.id)}
                        >
                          <tab.icon className="mr-2 h-4 w-4" />
                          {tab.label}
                        </Button>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {activeTab === "assignments" &&
                      (programme.assignments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No assignments published for this programme yet.
                        </p>
                      ) : (
                        programme.assignments.map((assignment) => (
                          <div key={assignment.id} className="rounded-2xl border border-border p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-foreground">{assignment.title}</p>
                                  <Badge variant="outline">{assignment.assignmentType}</Badge>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {assignment.description || "No assignment description."}
                                </p>
                              </div>
                              <Badge variant="secondary">
                                {assignment.submissions.length}/{programme.enrollments.length} submitted
                              </Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span>Due {formatDateTime(assignment.dueDate)}</span>
                              <span>Max marks {assignment.maxScore ?? 0}</span>
                            </div>
                          </div>
                        ))
                      ))}

                    {activeTab === "sessions" &&
                      (programme.interactiveSessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No interactive sessions scheduled yet.
                        </p>
                      ) : (
                        programme.interactiveSessions.map((session) => {
                          const canMarkAttendance =
                            new Date(session.scheduledAt).getTime() <= Date.now();
                          return (
                            <div key={session.id} className="rounded-2xl border border-border p-4">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-foreground">{session.title}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {session.description || "No session description."}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={!canMarkAttendance}
                                  onClick={() => openAttendanceDialog(session)}
                                >
                                  Mark attendance
                                </Button>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span>{formatDateTime(session.scheduledAt)}</span>
                                <span>Max marks {session.maxScore}</span>
                                <span>
                                  {session.attendances.length}/{programme.enrollments.length} marked
                                </span>
                              </div>
                              {session.meetingUrl ? (
                                <a
                                  href={session.meetingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-3 inline-block text-sm text-vahani-blue underline-offset-4 hover:underline"
                                >
                                  {session.meetingUrl}
                                </a>
                              ) : null}
                            </div>
                          );
                        })
                      ))}

                    {activeTab === "resources" &&
                      ((programme.resources || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No resource materials added yet.
                        </p>
                      ) : (
                        (programme.resources || []).map((resource) => (
                          <div key={resource.id} className="rounded-2xl border border-border p-4">
                            <p className="font-semibold text-foreground">{resource.title}</p>
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-block text-sm text-vahani-blue underline-offset-4 hover:underline"
                            >
                              {resource.url}
                            </a>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Added {formatDate(resource.createdAt)}
                            </p>
                          </div>
                        ))
                      ))}

                    {activeTab === "meetings" &&
                      ((programme.meetingLinks || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No online meetings added yet.
                        </p>
                      ) : (
                        (programme.meetingLinks || []).map((meeting) => (
                          <div key={meeting.id} className="rounded-2xl border border-border p-4">
                            <p className="font-semibold text-foreground">{meeting.title}</p>
                            <a
                              href={meeting.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-block text-sm text-vahani-blue underline-offset-4 hover:underline"
                            >
                              {meeting.url}
                            </a>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Added {formatDate(meeting.createdAt)}
                            </p>
                          </div>
                        ))
                      ))}

                    {activeTab === "scholars" &&
                      (programme.enrollments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No scholars enrolled in this programme yet.
                        </p>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          {programme.enrollments.map((enrollment) => (
                            <div key={enrollment.id} className="rounded-2xl border border-border p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-foreground">{enrollment.user.name}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {enrollment.user.email}
                                  </p>
                                </div>
                                <Badge variant="outline">{enrollment.status}</Badge>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span>{enrollment.user.batch || "No batch"}</span>
                                <span>Enrolled {formatDate(enrollment.enrolledAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>

      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add assignment</DialogTitle>
            <DialogDescription>Create a new assignment for this programme.</DialogDescription>
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
                    setAssignmentForm((current) => ({
                      ...current,
                      assignmentType: event.target.value,
                    }))
                  }
                >
                  {["document", "audio", "video", "quiz", "archive", "link_submission"].map(
                    (type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ),
                  )}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddAssignment()}>Add assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule interactive session</DialogTitle>
            <DialogDescription>
              Add the session details, meeting link, and marks configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
                <Label>Scheduled at</Label>
                <Input
                  type="datetime-local"
                  value={sessionForm.scheduledAt}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setSessionForm((current) => ({
                      ...current,
                      scheduledAt: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  value={sessionForm.durationMinutes}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setSessionForm((current) => ({
                      ...current,
                      durationMinutes: event.target.value,
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
                    setSessionForm((current) => ({ ...current, maxScore: event.target.value }))
                  }
                />
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
            <div className="space-y-2">
              <Label>Meeting URL</Label>
              <Input
                value={sessionForm.meetingUrl}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSessionForm((current) => ({ ...current, meetingUrl: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSessionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddSession()}>Schedule session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResourceDialog} onOpenChange={setShowResourceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add resource material</DialogTitle>
            <DialogDescription>Upload a file or share a link for scholars.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={resourceForm.title}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setResourceForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={resourceForm.description}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setResourceForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Resource URL</Label>
              <Input
                value={resourceForm.url}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setResourceForm((current) => ({ ...current, url: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Upload file</Label>
              <Input
                type="file"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setResourceForm((current) => ({
                    ...current,
                    file: event.target.files?.[0] || null,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResourceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddResource()}>Add resource</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add online meeting</DialogTitle>
            <DialogDescription>Publish a meeting link for this programme.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={meetingForm.title}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setMeetingForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Meeting URL</Label>
              <Input
                value={meetingForm.url}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setMeetingForm((current) => ({ ...current, url: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeetingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddMeeting()}>Add meeting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAttendanceDialog} onOpenChange={setShowAttendanceDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedAttendanceSession?.title || "Mark attendance"}</DialogTitle>
            <DialogDescription>
              All scholars start as present. Mark absentees, adjust marks, and save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(programme?.enrollments || []).map((enrollment) => (
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
                    setAttendanceDrafts((current) => ({
                      ...current,
                      [enrollment.user.id]: nextStatus,
                    }));
                    setAttendanceScoreDrafts((current) => ({
                      ...current,
                      [enrollment.user.id]:
                        nextStatus === "absent"
                          ? "0"
                          : current[enrollment.user.id] ||
                            String(selectedAttendanceSession?.maxScore ?? 0),
                    }));
                  }}
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                </select>
                <Input
                  type="number"
                  min="0"
                  max={selectedAttendanceSession?.maxScore ?? 0}
                  disabled={(attendanceDrafts[enrollment.user.id] || "present") === "absent"}
                  value={
                    (attendanceDrafts[enrollment.user.id] || "present") === "absent"
                      ? "0"
                      : attendanceScoreDrafts[enrollment.user.id] ||
                        String(selectedAttendanceSession?.maxScore ?? 0)
                  }
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setAttendanceScoreDrafts((current) => ({
                      ...current,
                      [enrollment.user.id]: event.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttendanceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveAttendance()}>Update attendance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
