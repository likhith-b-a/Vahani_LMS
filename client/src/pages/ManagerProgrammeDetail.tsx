import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  addProgrammeMeetingLink,
  addProgrammeResource,
  createInteractiveSession,
  createProgrammeAssignment,
  deleteInteractiveSession,
  deleteProgrammeAssignment,
  downloadManagedCertificateFile,
  generateProgrammeCertificates,
  getManagedProgrammeDetail,
  getProgrammeCertificates,
  markInteractiveSessionAttendance,
  publishProgrammeResults,
  type ManagedCertificate,
  type ManagedProgramme,
  updateInteractiveSession,
  updateProgrammeAssignment,
  updateProgrammeCertificate,
} from "../api/programmeManager";
import { ManagerSidebar } from "../components/dashboard/ManagerSidebar";
import { AssignmentDialog, type AssignmentPayload } from "../components/dashboard/manager/AssignmentDialog";
import { SessionDialog, type SessionPayload } from "../components/dashboard/manager/SessionDialog";
import { ResourceDialog } from "../components/dashboard/manager/ResourceDialog";
import { MeetingDialog } from "../components/dashboard/manager/MeetingDialog";
import {
  SessionAttendanceDialog,
  type SessionAttendancePayload,
} from "../components/dashboard/manager/SessionAttendanceDialog";
import { ProgrammeCertificatesDialog } from "../components/dashboard/manager/ProgrammeCertificatesDialog";
import {
  EditCertificateDialog,
  type EditCertificatePayload,
} from "../components/dashboard/manager/EditCertificateDialog";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import { formatDate, formatDateTime } from "../lib/dateFormat";

const tabs = [
  { id: "assignments", label: "Assignments", icon: FileText },
  { id: "sessions", label: "Interactive sessions", icon: CalendarDays },
  { id: "resources", label: "Resource material", icon: BookOpen },
  { id: "meetings", label: "Online meetings", icon: LinkIcon },
  { id: "scholars", label: "Scholars", icon: Users },
] as const;

export default function ManagerProgrammeDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const dashboardBasePath = location.pathname.startsWith("/tutor") ? "/tutor" : "/programme-manager";

  const [programme, setProgramme] = useState<ManagedProgramme | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("assignments");
  const [assignmentTrackFilter, setAssignmentTrackFilter] = useState("all");

  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showCertificatesDialog, setShowCertificatesDialog] = useState(false);
  const [showEditCertificateDialog, setShowEditCertificateDialog] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingCertificate, setEditingCertificate] = useState<ManagedCertificate | null>(null);

  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [attendanceOccurrenceId, setAttendanceOccurrenceId] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<ManagedCertificate[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | null>(null);

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

  const loadCertificates = useCallback(async () => {
    if (!id) return;

    try {
      setCertificatesLoading(true);
      const response = await getProgrammeCertificates(id);
      setCertificates(
        Array.isArray(response?.data?.certificates) ? (response.data.certificates as ManagedCertificate[]) : [],
      );
    } catch (error) {
      toast({
        title: "Unable to load certificates",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCertificatesLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (programme?.resultsPublishedAt) {
      void loadCertificates();
    }
  }, [loadCertificates, programme?.resultsPublishedAt]);

  const editingAssignment = useMemo(
    () => programme?.assignments.find((assignment) => assignment.id === editingAssignmentId) || null,
    [editingAssignmentId, programme],
  );
  const editingSession = useMemo(
    () => programme?.interactiveSessions.find((session) => session.id === editingSessionId) || null,
    [editingSessionId, programme],
  );
  const attendanceSession = useMemo(
    () => programme?.interactiveSessions.find((session) => session.id === attendanceSessionId) || null,
    [attendanceSessionId, programme],
  );
  const attendanceEnrollments = useMemo(() => {
    if (!programme || !attendanceSession || !attendanceOccurrenceId) return [];
    const occurrence = attendanceSession.occurrences.find((entry) => entry.id === attendanceOccurrenceId);
    if (!occurrence) return [];
    const assignedUserIds = new Set(occurrence.assignments.map((assignment) => assignment.userId));
    return programme.enrollments.filter((enrollment) => assignedUserIds.has(enrollment.user.id));
  }, [attendanceOccurrenceId, attendanceSession, programme]);

  const assignmentTrackGroupOptions = useMemo(
    () => (programme?.groupTrackGroups || []).filter(Boolean),
    [programme?.groupTrackGroups],
  );

  const filteredAssignments = useMemo(() => {
    if (!programme) return [];
    if (assignmentTrackFilter === "all") return programme.assignments;
    if (assignmentTrackFilter === "__open__") {
      return programme.assignments.filter(
        (assignment) => !assignment.targetTrackGroups || assignment.targetTrackGroups.length === 0,
      );
    }
    return programme.assignments.filter((assignment) => assignment.targetTrackGroups?.includes(assignmentTrackFilter));
  }, [assignmentTrackFilter, programme]);

  const openAttendanceDialog = (sessionId: string, occurrenceId: string) => {
    setAttendanceSessionId(sessionId);
    setAttendanceOccurrenceId(occurrenceId);
    setShowAttendanceDialog(true);
  };

  const handleAssignmentSubmit = async (payload: AssignmentPayload, submittedEditingId: string | null) => {
    if (!programme) return;
    try {
      if (submittedEditingId) {
        await updateProgrammeAssignment(submittedEditingId, payload);
      } else {
        await createProgrammeAssignment(programme.id, payload);
      }
      setShowAssignmentDialog(false);
      setEditingAssignmentId(null);
      await loadProgramme();
      toast({
        title: submittedEditingId ? "Assignment updated" : "Assignment added",
        description: submittedEditingId
          ? "The assignment changes are now visible in the programme."
          : "The new assignment is now visible to scholars.",
      });
    } catch (error) {
      toast({
        title: submittedEditingId ? "Unable to update assignment" : "Unable to add assignment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSessionSubmit = async (payload: SessionPayload, submittedEditingId: string | null) => {
    if (!programme) return;
    try {
      if (submittedEditingId) {
        await updateInteractiveSession(submittedEditingId, payload);
      } else {
        await createInteractiveSession(programme.id, payload);
      }
      setShowSessionDialog(false);
      setEditingSessionId(null);
      await loadProgramme();
      toast({
        title: submittedEditingId ? "Session updated" : "Session scheduled",
        description: submittedEditingId
          ? "The interactive session has been updated."
          : "The interactive session has been added to the programme.",
      });
    } catch (error) {
      toast({
        title: submittedEditingId ? "Unable to update session" : "Unable to schedule session",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResourceSubmit = async (payload: {
    title: string;
    url: string;
    description: string;
    file: File | null;
  }) => {
    if (!programme) return;
    try {
      await addProgrammeResource(programme.id, payload);
      setShowResourceDialog(false);
      await loadProgramme();
      toast({ title: "Resource added", description: "The study material has been attached to the programme." });
    } catch (error) {
      toast({
        title: "Unable to add resource",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMeetingSubmit = async (payload: { title: string; url: string }) => {
    if (!programme) return;
    try {
      await addProgrammeMeetingLink(programme.id, payload);
      setShowMeetingDialog(false);
      await loadProgramme();
      toast({ title: "Meeting link added", description: "Scholars can now see the meeting in the programme." });
    } catch (error) {
      toast({
        title: "Unable to add meeting",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAssignment = async (assignmentId: string, title: string) => {
    if (!window.confirm(`Delete assignment "${title}"? This will remove its submissions too.`)) return;

    try {
      await deleteProgrammeAssignment(assignmentId);
      await loadProgramme();
      toast({ title: "Assignment deleted", description: "The assignment has been removed from this programme." });
    } catch (error) {
      toast({
        title: "Unable to delete assignment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSession = async (sessionId: string, title: string) => {
    if (
      !window.confirm(`Delete interactive session "${title}"? All scheduled dates and attendance for it will be removed.`)
    ) {
      return;
    }

    try {
      await deleteInteractiveSession(sessionId);
      await loadProgramme();
      toast({
        title: "Interactive session deleted",
        description: "The session and its scheduled dates have been removed.",
      });
    } catch (error) {
      toast({
        title: "Unable to delete interactive session",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAttendanceSubmit = async (attendance: SessionAttendancePayload[]) => {
    if (!attendanceSessionId || !attendanceOccurrenceId) return;

    try {
      await markInteractiveSessionAttendance(attendanceSessionId, attendanceOccurrenceId, attendance);
      setShowAttendanceDialog(false);
      await loadProgramme();
      toast({ title: "Attendance updated", description: "The session attendance and marks have been saved." });
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
      toast({ title: "Results published", description: "Programme completion status and credits have been updated." });
    } catch (error) {
      toast({
        title: "Unable to publish results",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOpenCertificatesDialog = async () => {
    setShowCertificatesDialog(true);
    await loadCertificates();
  };

  const handleGenerateCertificates = async () => {
    if (!programme) return;

    try {
      setCertificatesLoading(true);
      const response = await generateProgrammeCertificates(programme.id);
      setCertificates(
        Array.isArray(response?.data?.certificates) ? (response.data.certificates as ManagedCertificate[]) : [],
      );
      toast({ title: "Certificates generated", description: "Completed scholars can now view their certificates." });
    } catch (error) {
      toast({
        title: "Unable to generate certificates",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCertificatesLoading(false);
    }
  };

  const handleDownloadCertificate = async (certificate: ManagedCertificate) => {
    try {
      setDownloadingCertificateId(certificate.id);
      await downloadManagedCertificateFile(
        certificate.id,
        `${certificate.programmeTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${certificate.scholarName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      );
    } catch (error) {
      toast({
        title: "Unable to download certificate",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingCertificateId(null);
    }
  };

  const handleUpdateCertificate = async (payload: EditCertificatePayload) => {
    try {
      const response = await updateProgrammeCertificate(payload.certificateId, {
        scholarName: payload.scholarName,
        programmeTitle: payload.programmeTitle,
        issuedAt: payload.issuedAt,
      });
      const updatedCertificate = response?.data as ManagedCertificate;
      setCertificates((current) =>
        current.map((certificate) => (certificate.id === updatedCertificate.id ? updatedCertificate : certificate)),
      );
      setShowEditCertificateDialog(false);
      toast({
        title: "Certificate updated",
        description: "The certificate has been regenerated with the same credential ID.",
      });
    } catch (error) {
      toast({
        title: "Unable to update certificate",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
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
      <ManagerSidebar basePath={dashboardBasePath} />

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
              <Button variant="outline" onClick={() => navigate(`${dashboardBasePath}/programmes`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to programmes
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setEditingAssignmentId(null);
                    setShowAssignmentDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add assignment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`${dashboardBasePath}/programmes/${id}/sessions/new`)}
                >
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
                <Button
                  variant="outline"
                  onClick={() => navigate(`${dashboardBasePath}/programmes/${id}/grouping`)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Grouped delivery
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`${dashboardBasePath}/programmes/${id}/tutors`)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Assign tutors
                </Button>
                <Button variant="secondary" onClick={() => void handlePublishResults()}>
                  Publish results
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void handleOpenCertificatesDialog()}
                  disabled={!programme?.resultsPublishedAt}
                >
                  {certificates.length > 0 ? "View & edit certificates" : "Generate certificates"}
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
                <section className="overflow-hidden rounded-[1.75rem] border border-border bg-[linear-gradient(135deg,rgba(12,106,204,0.10),rgba(255,255,255,0.98),rgba(32,201,151,0.06))] p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-vahani-blue">
                          Programme Workspace
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                            {programme.title}
                          </h2>
                          <Badge variant="outline">{summary.scholars} scholars</Badge>
                        </div>
                        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                          {programme.description || "No programme description added yet."}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>Created {formatDate(programme.createdAt)}</span>
                          <span>Managed by {programme.programmeManager?.name || "Unassigned"}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[420px]">
                        {[
                          { label: "Scholars", value: summary.scholars },
                          { label: "Assignments", value: summary.assignments },
                          { label: "Live sessions", value: summary.sessions },
                          { label: "Resources + meetings", value: summary.resources + summary.meetings },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl border border-border bg-card/85 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                              {item.label}
                            </p>
                            <p className="mt-1 text-base font-semibold text-foreground">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {programme.resultsPublishedAt ? (
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Results already published</p>
                    <p className="mt-1">
                      Published on {formatDateTime(programme.resultsPublishedAt)}. Scholars can now see completion
                      status and earned credits.
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
                        <div className="space-y-4">
                          {programme.groupedDeliveryEnabled && assignmentTrackGroupOptions.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/20 p-4">
                              <Label className="text-sm font-medium text-foreground">Filter by track group</Label>
                              <select
                                className="h-10 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
                                value={assignmentTrackFilter}
                                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                  setAssignmentTrackFilter(event.target.value)
                                }
                              >
                                <option value="all">All groups</option>
                                <option value="__open__">Open to all scholars</option>
                                {assignmentTrackGroupOptions.map((group) => (
                                  <option key={group} value={group}>
                                    {group}
                                  </option>
                                ))}
                              </select>
                              <p className="text-xs text-muted-foreground">
                                Narrow the assignment list to one track when grouped delivery is enabled.
                              </p>
                            </div>
                          ) : null}

                          {filteredAssignments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              No assignments match the current filter.
                            </p>
                          ) : (
                            filteredAssignments.map((assignment) => (
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
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary">
                                      {assignment.submissions.length}/
                                      {programme.groupedDeliveryEnabled && assignment.targetTrackGroups?.length
                                        ? programme.enrollments.filter(
                                            (enrollment) =>
                                              enrollment.trackGroup &&
                                              assignment.targetTrackGroups.includes(enrollment.trackGroup),
                                          ).length
                                        : programme.enrollments.length}{" "}
                                      submitted
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingAssignmentId(assignment.id);
                                        setShowAssignmentDialog(true);
                                      }}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => void handleDeleteAssignment(assignment.id, assignment.title)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  <span>Due {formatDateTime(assignment.dueDate)}</span>
                                  <span>Max marks {assignment.maxScore ?? 0}</span>
                                  {programme.groupedDeliveryEnabled && assignment.targetTrackGroups?.length ? (
                                    <span>Track groups: {assignment.targetTrackGroups.join(", ")}</span>
                                  ) : null}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ))}

                    {activeTab === "sessions" &&
                      (programme.interactiveSessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No interactive sessions scheduled yet.</p>
                      ) : (
                        programme.interactiveSessions.map((session) => {
                          const canMarkAttendance = new Date(session.scheduledAt).getTime() <= Date.now();
                          return (
                            <details key={session.id} className="rounded-2xl border border-border">
                              <summary className="cursor-pointer list-none px-4 py-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-foreground">{session.title}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {session.description || "No session description."}
                                    </p>
                                  </div>
                                  <Badge variant="outline">
                                    {session.occurrences.length} date{session.occurrences.length === 1 ? "" : "s"}
                                  </Badge>
                                </div>
                              </summary>
                              <div className="border-t border-border px-4 pb-4 pt-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-foreground">{session.title}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {session.description || "No session description."}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        navigate(`${dashboardBasePath}/programmes/${id}/sessions/${session.id}`)
                                      }
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => void handleDeleteSession(session.id, session.title)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!canMarkAttendance}
                                      onClick={() => openAttendanceDialog(session.id, session.occurrences[0]?.id || "")}
                                    >
                                      Mark attendance
                                    </Button>
                                  </div>
                                </div>
                                <div className="mt-4 space-y-3">
                                  {session.occurrences.map((occurrence, index) => {
                                    const assignedCount = occurrence.assignments.length;
                                    const markedCount = session.attendances.filter(
                                      (attendance) => attendance.interactiveSessionOccurrenceId === occurrence.id,
                                    ).length;

                                    return (
                                      <div
                                        key={occurrence.id}
                                        className="rounded-xl border border-border/70 bg-muted/20 p-3"
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                          <div className="space-y-1 text-sm">
                                            <p className="font-medium text-foreground">
                                              Date {index + 1}: {formatDateTime(occurrence.scheduledAt)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              {assignedCount} scholars assigned
                                              {" • "}
                                              {markedCount}/{assignedCount} marked
                                            </p>
                                          </div>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={new Date(occurrence.scheduledAt).getTime() > Date.now()}
                                            onClick={() => openAttendanceDialog(session.id, occurrence.id)}
                                          >
                                            Mark attendance
                                          </Button>
                                        </div>
                                        {occurrence.meetingUrl ? (
                                          <a
                                            href={occurrence.meetingUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-2 inline-block text-sm text-vahani-blue underline-offset-4 hover:underline"
                                          >
                                            {occurrence.meetingUrl}
                                          </a>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </details>
                          );
                        })
                      ))}

                    {activeTab === "resources" &&
                      ((programme.resources || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No resource materials added yet.</p>
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
                            <p className="mt-2 text-xs text-muted-foreground">Added {formatDate(resource.createdAt)}</p>
                          </div>
                        ))
                      ))}

                    {activeTab === "meetings" &&
                      ((programme.meetingLinks || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No online meetings added yet.</p>
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
                            <p className="mt-2 text-xs text-muted-foreground">Added {formatDate(meeting.createdAt)}</p>
                          </div>
                        ))
                      ))}

                    {activeTab === "scholars" &&
                      (programme.enrollments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No scholars enrolled in this programme yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {programme.groupedDeliveryEnabled ? (
                            <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                              Track groups are managed from the grouped delivery dialog. Session dates are assigned
                              directly inside each interactive session.
                            </div>
                          ) : null}
                          <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card">
                            <Table className="text-[15px]">
                              <TableHeader className="bg-muted/20">
                                <TableRow className="border-border hover:bg-transparent">
                                  <TableHead className="h-14 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                                    Scholar
                                  </TableHead>
                                  <TableHead className="h-14 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                                    Batch
                                  </TableHead>
                                  <TableHead className="h-14 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                                    Gender
                                  </TableHead>
                                  {programme.groupedDeliveryEnabled ? (
                                    <TableHead className="h-14 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                                      Track group
                                    </TableHead>
                                  ) : null}
                                  <TableHead className="h-14 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                                    Status
                                  </TableHead>
                                  <TableHead className="h-14 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                                    Enrolled on
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="bg-card">
                                {programme.enrollments.map((enrollment) => (
                                  <TableRow key={enrollment.id} className="border-border/80 hover:bg-transparent">
                                    <TableCell className="px-6 py-5">
                                      <div>
                                        <p className="text-[15px] font-semibold text-foreground">
                                          {enrollment.user.name}
                                        </p>
                                        <p className="mt-1 text-sm text-muted-foreground">{enrollment.user.email}</p>
                                      </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-5 text-[15px] text-muted-foreground">
                                      {enrollment.user.batch || "No batch"}
                                    </TableCell>
                                    <TableCell className="px-6 py-5 text-[15px] text-muted-foreground">
                                      {enrollment.user.gender || "No gender"}
                                    </TableCell>
                                    {programme.groupedDeliveryEnabled ? (
                                      <TableCell className="px-6 py-5">
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
                                    <TableCell className="px-6 py-5 text-[15px] text-muted-foreground">
                                      {formatDate(enrollment.enrolledAt)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>

      <AssignmentDialog
        open={showAssignmentDialog}
        onOpenChange={(open) => {
          setShowAssignmentDialog(open);
          if (!open) setEditingAssignmentId(null);
        }}
        editingAssignment={editingAssignment}
        groupedDeliveryEnabled={!!programme?.groupedDeliveryEnabled}
        groupTrackGroups={programme?.groupTrackGroups || []}
        onSubmit={(payload, submittedEditingId) => void handleAssignmentSubmit(payload, submittedEditingId)}
      />

      <SessionDialog
        open={showSessionDialog}
        onOpenChange={(open) => {
          setShowSessionDialog(open);
          if (!open) setEditingSessionId(null);
        }}
        editingSession={editingSession}
        enrollments={programme?.enrollments || []}
        onSubmit={(payload, submittedEditingId) => void handleSessionSubmit(payload, submittedEditingId)}
      />

      <ResourceDialog
        open={showResourceDialog}
        onOpenChange={setShowResourceDialog}
        onSubmit={(payload) => void handleResourceSubmit(payload)}
      />

      <MeetingDialog
        open={showMeetingDialog}
        onOpenChange={setShowMeetingDialog}
        onSubmit={(payload) => void handleMeetingSubmit(payload)}
      />

      <SessionAttendanceDialog
        open={showAttendanceDialog}
        onOpenChange={setShowAttendanceDialog}
        session={attendanceSession}
        occurrenceId={attendanceOccurrenceId || ""}
        enrollments={attendanceEnrollments}
        onSubmit={(attendance) => void handleAttendanceSubmit(attendance)}
      />

      <ProgrammeCertificatesDialog
        open={showCertificatesDialog}
        onOpenChange={setShowCertificatesDialog}
        resultsPublished={!!programme?.resultsPublishedAt}
        certificates={certificates}
        certificatesLoading={certificatesLoading}
        downloadingCertificateId={downloadingCertificateId}
        onGenerateCertificates={() => void handleGenerateCertificates()}
        onDownloadCertificate={(certificate) => void handleDownloadCertificate(certificate)}
        onEditCertificate={(certificate) => {
          setEditingCertificate(certificate);
          setShowEditCertificateDialog(true);
        }}
      />

      <EditCertificateDialog
        open={showEditCertificateDialog}
        onOpenChange={setShowEditCertificateDialog}
        certificate={editingCertificate}
        onSubmit={(payload) => void handleUpdateCertificate(payload)}
      />
    </div>
  );
}
