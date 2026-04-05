import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
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
  bulkAssignManagedProgrammeGrouping,
  createInteractiveSession,
  createProgrammeAssignment,
  deleteInteractiveSession,
  deleteProgrammeAssignment,
  downloadManagedProgrammeGroupingTemplate,
  generateProgrammeCertificates,
  getManagedProgrammeDetail,
  getManagedCertificateDownloadUrl,
  getProgrammeCertificates,
  markInteractiveSessionAttendance,
  publishProgrammeResults,
  type ManagedInteractiveSession,
  type ManagedCertificate,
  type ManagedProgramme,
  updateInteractiveSession,
  updateManagedProgrammeGrouping,
  updateManagedProgrammeScholarGrouping,
  updateProgrammeAssignment,
  updateProgrammeCertificate,
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
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";

const emptyAssignmentForm = {
  title: "",
  description: "",
  dueDate: "",
  maxScore: "",
  assignmentType: "document",
  targetTrackGroups: [] as string[],
  isGraded: true,
  allowLateSubmission: true,
  allowResubmission: true,
};

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

const resetAssignmentForm = () => ({ ...emptyAssignmentForm });
const resetSessionForm = () => ({ ...emptySessionForm });
const parseCommaSeparatedValues = (value: string) =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

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
  const [assignmentTrackFilter, setAssignmentTrackFilter] = useState("all");

  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showCertificatesDialog, setShowCertificatesDialog] = useState(false);
  const [showEditCertificateDialog, setShowEditCertificateDialog] = useState(false);
  const [showGroupingDialog, setShowGroupingDialog] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const groupingUploadInputRef = useRef<HTMLInputElement | null>(null);

  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [resourceForm, setResourceForm] = useState(emptyResourceForm);
  const [meetingForm, setMeetingForm] = useState(emptyMeetingForm);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [attendanceOccurrenceId, setAttendanceOccurrenceId] = useState<string | null>(null);
  const [sessionDialogOpenSection, setSessionDialogOpenSection] = useState("basic-details");
  const [sessionScholarSearch, setSessionScholarSearch] = useState("");
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, "present" | "absent">>({});
  const [attendanceScoreDrafts, setAttendanceScoreDrafts] = useState<Record<string, string>>({});
  const [certificates, setCertificates] = useState<ManagedCertificate[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [certificateEditForm, setCertificateEditForm] = useState({
    id: "",
    scholarName: "",
    programmeTitle: "",
    issuedAt: "",
  });
  const [groupingForm, setGroupingForm] = useState({
    enabled: false,
    trackGroupsText: "",
  });
  const [groupingSaving, setGroupingSaving] = useState(false);
  const [updatingEnrollmentId, setUpdatingEnrollmentId] = useState<string | null>(null);
  const [groupingUploading, setGroupingUploading] = useState(false);
  const [groupingSearch, setGroupingSearch] = useState("");
  const [groupingBatchFilter, setGroupingBatchFilter] = useState("all");

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

  useEffect(() => {
    setGroupingForm({
      enabled: !!programme?.groupedDeliveryEnabled,
      trackGroupsText: (programme?.groupTrackGroups || []).join(", "),
    });
  }, [programme?.groupTrackGroups, programme?.groupedDeliveryEnabled]);

  const loadCertificates = useCallback(async () => {
    if (!id) return;

    try {
      setCertificatesLoading(true);
      const response = await getProgrammeCertificates(id);
      setCertificates(
        Array.isArray(response?.data?.certificates)
          ? (response.data.certificates as ManagedCertificate[])
          : [],
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

  const selectedAttendanceSession = useMemo(
    () =>
      programme?.interactiveSessions.find((session) => session.id === attendanceSessionId) ||
      null,
    [attendanceSessionId, programme],
  );
  const selectedAttendanceOccurrence = useMemo(
    () =>
      selectedAttendanceSession?.occurrences.find(
        (occurrence) => occurrence.id === attendanceOccurrenceId,
      ) || null,
    [attendanceOccurrenceId, selectedAttendanceSession],
  );

  const selectedAttendanceEnrollments = useMemo(() => {
    if (!programme || !selectedAttendanceOccurrence) {
      return [];
    }
    const assignedUserIds = new Set(
      selectedAttendanceOccurrence.assignments.map((assignment) => assignment.userId),
    );

    return programme.enrollments.filter((enrollment) =>
      assignedUserIds.has(enrollment.user.id),
    );
  }, [programme, selectedAttendanceOccurrence]);

  const groupingBatchOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (programme?.enrollments || [])
            .map((enrollment) => enrollment.user.batch?.trim())
            .filter((batch): batch is string => Boolean(batch)),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [programme?.enrollments],
  );

  const filteredGroupingEnrollments = useMemo(() => {
    if (!programme) {
      return [];
    }

    return programme.enrollments.filter((enrollment) => {
      const matchesSearch =
        !groupingSearch.trim() ||
        `${enrollment.user.name} ${enrollment.user.email} ${enrollment.user.batch || ""} ${enrollment.trackGroup || ""}`
          .toLowerCase()
          .includes(groupingSearch.toLowerCase());
      const matchesBatch =
        groupingBatchFilter === "all" ||
        (enrollment.user.batch || "").toLowerCase() === groupingBatchFilter.toLowerCase();
      return matchesSearch && matchesBatch;
    });
  }, [groupingBatchFilter, groupingSearch, programme]);

  const assignmentTrackGroupOptions = useMemo(
    () => (programme?.groupTrackGroups || []).filter(Boolean),
    [programme?.groupTrackGroups],
  );

  const filteredAssignments = useMemo(() => {
    if (!programme) {
      return [];
    }

    if (assignmentTrackFilter === "all") {
      return programme.assignments;
    }

    if (assignmentTrackFilter === "__open__") {
      return programme.assignments.filter(
        (assignment) => !assignment.targetTrackGroups || assignment.targetTrackGroups.length === 0,
      );
    }

    return programme.assignments.filter((assignment) =>
      assignment.targetTrackGroups?.includes(assignmentTrackFilter),
    );
  }, [assignmentTrackFilter, programme]);

  const openAttendanceDialog = (
    session: ManagedInteractiveSession,
    occurrenceId: string,
  ) => {
    if (!programme) return;
    const occurrence = session.occurrences.find((entry) => entry.id === occurrenceId);
    if (!occurrence) return;
    const assignedUserIds = new Set(
      occurrence.assignments.map((assignment) => assignment.userId),
    );
    const eligibleEnrollments = programme.enrollments.filter((enrollment) =>
      assignedUserIds.has(enrollment.user.id),
    );

    setAttendanceSessionId(session.id);
    setAttendanceOccurrenceId(occurrenceId);
    setAttendanceDrafts(
      Object.fromEntries(
        eligibleEnrollments.map((enrollment) => {
          const attendance = session.attendances.find(
            (entry) =>
              entry.userId === enrollment.user.id &&
              entry.interactiveSessionOccurrenceId === occurrenceId,
          );
          return [enrollment.user.id, attendance?.status || "present"];
        }),
      ) as Record<string, "present" | "absent">,
    );
    setAttendanceScoreDrafts(
      Object.fromEntries(
        eligibleEnrollments.map((enrollment) => {
          const attendance = session.attendances.find(
            (entry) =>
              entry.userId === enrollment.user.id &&
              entry.interactiveSessionOccurrenceId === occurrenceId,
          );
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
      const payload = {
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim(),
        dueDate: assignmentForm.dueDate,
        maxScore: Number(assignmentForm.maxScore),
        assignmentType: assignmentForm.assignmentType,
        targetTrackGroups: assignmentForm.targetTrackGroups,
        isGraded: assignmentForm.isGraded,
        allowLateSubmission: assignmentForm.allowLateSubmission,
        allowResubmission: assignmentForm.allowResubmission,
      };

      if (editingAssignmentId) {
        await updateProgrammeAssignment(editingAssignmentId, payload);
      } else {
        await createProgrammeAssignment(programme.id, payload);
      }
      setAssignmentForm(resetAssignmentForm());
      setEditingAssignmentId(null);
      setShowAssignmentDialog(false);
      await loadProgramme();
      toast({
        title: editingAssignmentId ? "Assignment updated" : "Assignment added",
        description: editingAssignmentId
          ? "The assignment changes are now visible in the programme."
          : "The new assignment is now visible to scholars.",
      });
    } catch (error) {
      toast({
        title: editingAssignmentId ? "Unable to update assignment" : "Unable to add assignment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddSession = async () => {
    if (!programme) return;
    if (
      !sessionForm.title.trim() ||
      sessionForm.occurrences.some(
        (occurrence) =>
          !occurrence.scheduledAt || !occurrence.assignedUserIds.length,
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

      if (editingSessionId) {
        await updateInteractiveSession(editingSessionId, payload);
      } else {
        await createInteractiveSession(programme.id, payload);
      }
      setSessionForm(resetSessionForm());
      setEditingSessionId(null);
      setShowSessionDialog(false);
      await loadProgramme();
      toast({
        title: editingSessionId ? "Session updated" : "Session scheduled",
        description: editingSessionId
          ? "The interactive session has been updated."
          : "The interactive session has been added to the programme.",
      });
    } catch (error) {
      toast({
        title: editingSessionId ? "Unable to update session" : "Unable to schedule session",
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

  const handleDeleteAssignment = async (assignmentId: string, title: string) => {
    if (!window.confirm(`Delete assignment "${title}"? This will remove its submissions too.`)) {
      return;
    }

    try {
      await deleteProgrammeAssignment(assignmentId);
      await loadProgramme();
      toast({
        title: "Assignment deleted",
        description: "The assignment has been removed from this programme.",
      });
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
      !window.confirm(
        `Delete interactive session "${title}"? All scheduled dates and attendance for it will be removed.`,
      )
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

  const handleSaveGroupingSettings = async () => {
    if (!programme) return;

    try {
      setGroupingSaving(true);
      await updateManagedProgrammeGrouping(programme.id, {
        groupedDeliveryEnabled: groupingForm.enabled,
        groupTrackGroups: parseCommaSeparatedValues(groupingForm.trackGroupsText),
      });
      await loadProgramme();
      toast({
        title: "Grouping settings updated",
        description: groupingForm.enabled
          ? "Track groups and session slots are now available in this programme."
          : "Grouped delivery has been disabled for this programme.",
      });
    } catch (error) {
      toast({
        title: "Unable to update grouping settings",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGroupingSaving(false);
    }
  };

  const handleUpdateScholarGrouping = async (
    enrollmentId: string,
    nextValues: { trackGroup?: string | null },
  ) => {
    if (!programme) return;

    try {
      setUpdatingEnrollmentId(enrollmentId);
      await updateManagedProgrammeScholarGrouping(programme.id, enrollmentId, nextValues);
      await loadProgramme();
      toast({
        title: "Scholar grouping updated",
        description: "The scholar assignment has been saved.",
      });
    } catch (error) {
      toast({
        title: "Unable to update scholar grouping",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingEnrollmentId(null);
    }
  };

  const handleDownloadGroupingTemplate = async () => {
    if (!programme) return;

    try {
      const blob = await downloadManagedProgrammeGroupingTemplate(programme.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${programme.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-scholar-grouping.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Unable to download grouping template",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGroupingUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!programme) return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setGroupingUploading(true);
      await bulkAssignManagedProgrammeGrouping(programme.id, file);
      await loadProgramme();
      toast({
        title: "Scholar grouping uploaded",
        description: "The uploaded scholar assignments have been applied.",
      });
    } catch (error) {
      toast({
        title: "Unable to upload grouping file",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGroupingUploading(false);
      if (groupingUploadInputRef.current) {
        groupingUploadInputRef.current.value = "";
      }
    }
  };

  const handleSaveAttendance = async () => {
    if (!programme || !attendanceSessionId || !attendanceOccurrenceId) return;

    try {
      await markInteractiveSessionAttendance(
        attendanceSessionId,
        attendanceOccurrenceId,
        selectedAttendanceEnrollments.map((enrollment) => ({
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
        Array.isArray(response?.data?.certificates)
          ? (response.data.certificates as ManagedCertificate[])
          : [],
      );
      toast({
        title: "Certificates generated",
        description: "Completed scholars can now view their certificates.",
      });
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

  const openEditAssignmentDialog = (assignment: ManagedProgramme["assignments"][number]) => {
    setEditingAssignmentId(assignment.id);
    setAssignmentForm({
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
    setShowAssignmentDialog(true);
  };

  const openAddAssignmentDialog = () => {
    setEditingAssignmentId(null);
    setAssignmentForm(resetAssignmentForm());
    setShowAssignmentDialog(true);
  };

  const openEditSessionDialog = (session: ManagedInteractiveSession) => {
    setEditingSessionId(session.id);
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
          : [
              {
                scheduledAt: "",
                durationMinutes: "60",
                meetingUrl: "",
                assignedUserIds: [],
              },
            ],
    });
    setSessionDialogOpenSection("basic-details");
    setSessionScholarSearch("");
    setShowSessionDialog(true);
  };

  const openAddSessionDialog = () => {
    setEditingSessionId(null);
    setSessionForm(resetSessionForm());
    setSessionDialogOpenSection("basic-details");
    setSessionScholarSearch("");
    setShowSessionDialog(true);
  };

  const handleAssignmentDialogChange = (open: boolean) => {
    setShowAssignmentDialog(open);
    if (!open) {
      setEditingAssignmentId(null);
      setAssignmentForm(resetAssignmentForm());
    }
  };

  const handleSessionDialogChange = (open: boolean) => {
    setShowSessionDialog(open);
    if (!open) {
      setEditingSessionId(null);
      setSessionForm(resetSessionForm());
      setSessionDialogOpenSection("basic-details");
      setSessionScholarSearch("");
    }
  };

  const openEditCertificateDialog = (certificate: ManagedCertificate) => {
    setCertificateEditForm({
      id: certificate.id,
      scholarName: certificate.scholarName,
      programmeTitle: certificate.programmeTitle,
      issuedAt: certificate.issuedAt.slice(0, 10),
    });
    setShowEditCertificateDialog(true);
  };

  const handleUpdateCertificate = async () => {
    try {
      const response = await updateProgrammeCertificate(certificateEditForm.id, {
        scholarName: certificateEditForm.scholarName,
        programmeTitle: certificateEditForm.programmeTitle,
        issuedAt: certificateEditForm.issuedAt,
      });
      const updatedCertificate = response?.data as ManagedCertificate;
      setCertificates((current) =>
        current.map((certificate) =>
          certificate.id === updatedCertificate.id ? updatedCertificate : certificate,
        ),
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
                <Button onClick={openAddAssignmentDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add assignment
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(`${dashboardBasePath}/programmes/${programme.id}/sessions/new`)
                  }
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
                  onClick={() => navigate(`${dashboardBasePath}/programmes/${programme.id}/grouping`)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Grouped delivery
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
                          <Badge variant="outline">
                            {summary.scholars} scholars
                          </Badge>
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
                          <div
                            key={item.label}
                            className="rounded-xl border border-border bg-card/85 px-3 py-2.5"
                          >
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                              {item.label}
                            </p>
                            <p className="mt-1 text-base font-semibold text-foreground">
                              {item.value}
                            </p>
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
                        <div className="space-y-4">
                          {programme.groupedDeliveryEnabled &&
                          assignmentTrackGroupOptions.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/20 p-4">
                              <Label className="text-sm font-medium text-foreground">
                                Filter by track group
                              </Label>
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
                                  {(programme.groupedDeliveryEnabled && assignment.targetTrackGroups?.length
                                    ? programme.enrollments.filter(
                                        (enrollment) =>
                                          enrollment.trackGroup &&
                                          assignment.targetTrackGroups.includes(enrollment.trackGroup),
                                      ).length
                                    : programme.enrollments.length)}{" "}
                                  submitted
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditAssignmentDialog(assignment)}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    void handleDeleteAssignment(assignment.id, assignment.title)
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span>Due {formatDateTime(assignment.dueDate)}</span>
                              <span>Max marks {assignment.maxScore ?? 0}</span>
                              {programme.groupedDeliveryEnabled &&
                              assignment.targetTrackGroups?.length ? (
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
                        <p className="text-sm text-muted-foreground">
                          No interactive sessions scheduled yet.
                        </p>
                      ) : (
                        programme.interactiveSessions.map((session) => {
                          const canMarkAttendance =
                            new Date(session.scheduledAt).getTime() <= Date.now();
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
                                      navigate(
                                        `${dashboardBasePath}/programmes/${programme.id}/sessions/${session.id}`,
                                      )
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
                                    onClick={() =>
                                      openAttendanceDialog(
                                        session,
                                        session.occurrences[0]?.id || "",
                                      )
                                    }
                                  >
                                    Mark attendance
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-4 space-y-3">
                                {session.occurrences.map((occurrence, index) => {
                                  const assignedCount = occurrence.assignments.length;
                                  const markedCount = session.attendances.filter(
                                    (attendance) =>
                                      attendance.interactiveSessionOccurrenceId === occurrence.id,
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
                                          onClick={() => openAttendanceDialog(session, occurrence.id)}
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
                        <div className="space-y-4">
                          {programme.groupedDeliveryEnabled ? (
                            <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                              Track groups are managed from the grouped delivery dialog. Session dates are assigned directly inside each interactive session.
                            </div>
                          ) : null}
                          <div className="overflow-hidden rounded-2xl border border-border">
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-border text-sm">
                                <thead className="bg-muted/30">
                                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                    <th className="px-4 py-3 font-medium">Scholar</th>
                                    <th className="px-4 py-3 font-medium">Batch</th>
                                    <th className="px-4 py-3 font-medium">Gender</th>
                                    {programme.groupedDeliveryEnabled ? (
                                      <th className="px-4 py-3 font-medium">Track group</th>
                                    ) : null}
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Enrolled on</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-card">
                                  {programme.enrollments.map((enrollment) => (
                                    <tr key={enrollment.id} className="align-top">
                                      <td className="px-4 py-4">
                                        <div>
                                          <p className="font-semibold text-foreground">
                                            {enrollment.user.name}
                                          </p>
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            {enrollment.user.email}
                                          </p>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-muted-foreground">
                                        {enrollment.user.batch || "No batch"}
                                      </td>
                                      <td className="px-4 py-4 text-muted-foreground">
                                        {enrollment.user.gender || "No gender"}
                                      </td>
                                      {programme.groupedDeliveryEnabled ? (
                                        <td className="px-4 py-4">
                                          <Badge variant="secondary">
                                            {enrollment.trackGroup || "Unassigned"}
                                          </Badge>
                                        </td>
                                      ) : null}
                                      <td className="px-4 py-4">
                                        <Badge variant="outline">{enrollment.status}</Badge>
                                      </td>
                                      <td className="px-4 py-4 text-muted-foreground">
                                        {formatDate(enrollment.enrolledAt)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
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

      <Dialog open={showAssignmentDialog} onOpenChange={handleAssignmentDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAssignmentId ? "Edit assignment" : "Add assignment"}</DialogTitle>
            <DialogDescription>
              {editingAssignmentId
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
            {programme?.groupedDeliveryEnabled && (programme.groupTrackGroups || []).length > 0 ? (
              <div className="space-y-2">
                <Label>Target track groups</Label>
                <div className="flex flex-wrap gap-2">
                  {programme.groupTrackGroups?.map((group) => (
                    <label
                      key={group}
                      className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm"
                    >
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
            <Button variant="outline" onClick={() => handleAssignmentDialogChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddAssignment()}>
              {editingAssignmentId ? "Update assignment" : "Add assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSessionDialog} onOpenChange={handleSessionDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSessionId ? "Edit interactive session" : "Schedule interactive session"}
            </DialogTitle>
            <DialogDescription>
              {editingSessionId
                ? "Update the session details, meeting link, and marks configuration."
                : "Add the session details, meeting link, and marks configuration."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <Input
                placeholder="Search scholars by name, email, batch, or track group"
                value={sessionScholarSearch}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSessionScholarSearch(event.target.value)
                }
              />
            </div>
            <Accordion
              type="single"
              collapsible
              value={sessionDialogOpenSection}
              onValueChange={(value) => setSessionDialogOpenSection(value || "basic-details")}
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
                const searchableEnrollments = (programme?.enrollments || []).filter((enrollment) =>
                  !sessionScholarSearch.trim() ||
                  `${enrollment.user.name} ${enrollment.user.email} ${enrollment.user.batch || ""} ${enrollment.trackGroup || ""}`
                    .toLowerCase()
                    .includes(sessionScholarSearch.toLowerCase()),
                );
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
                              occurrences: current.occurrences.filter(
                                (_, occurrenceIndex) => occurrenceIndex !== index,
                              ),
                            }));
                            setSessionDialogOpenSection(nextSection);
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
                  <div className="mt-4 space-y-2">
                    <Label>
                      Scholars for this date ({assignedEnrollments.length} assigned, {availableEnrollments.length} available)
                    </Label>
                    <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-border/70 p-3">
                      {searchableEnrollments
                        .filter(
                          (enrollment) =>
                            assignedUserIds.has(enrollment.user.id) ||
                            !assignedElsewhere.has(enrollment.user.id),
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
                                        assignedUserIds: entry.assignedUserIds.filter((userId) => userId !== enrollment.user.id),
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
                      const nextOccurrences = [
                        ...current.occurrences,
                        {
                          scheduledAt: "",
                          durationMinutes: "60",
                          meetingUrl: "",
                          assignedUserIds: [],
                        },
                      ];
                      setSessionDialogOpenSection(`date-${nextOccurrences.length - 1}`);
                      return {
                        ...current,
                        occurrences: nextOccurrences,
                      };
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
            <Button variant="outline" onClick={() => handleSessionDialogChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddSession()}>
              {editingSessionId ? "Update session" : "Schedule session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showGroupingDialog}
        onOpenChange={(open) => {
          setShowGroupingDialog(open);
          if (!open) {
            setGroupingSearch("");
            setGroupingBatchFilter("all");
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Grouped delivery</DialogTitle>
            <DialogDescription>
              Enable grouped English delivery, define track groups, and assign scholars here or through the Excel template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-4">
              <div>
                <p className="font-medium text-foreground">Enable grouped delivery</p>
                <p className="text-sm text-muted-foreground">
                  Use this only when assignments need track-group targeting.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {groupingForm.enabled ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={groupingForm.enabled}
                  onCheckedChange={(value) =>
                    setGroupingForm((current) => ({ ...current, enabled: value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Track groups</Label>
              <Input
                placeholder="A, B, C"
                value={groupingForm.trackGroupsText}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setGroupingForm((current) => ({
                    ...current,
                    trackGroupsText: event.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Example: A, B, C. These are used for assignment targeting and scholar grouping.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleSaveGroupingSettings()} disabled={groupingSaving}>
                {groupingSaving ? "Saving..." : "Save grouped delivery settings"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleDownloadGroupingTemplate()}
                disabled={!groupingForm.enabled}
              >
                <Download className="mr-2 h-4 w-4" />
                Download grouping sheet
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => groupingUploadInputRef.current?.click()}
                disabled={!groupingForm.enabled || groupingUploading}
              >
                {groupingUploading ? "Uploading..." : "Upload filled sheet"}
              </Button>
              <input
                ref={groupingUploadInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleGroupingUpload}
              />
            </div>

            {groupingForm.enabled ? (
              <div className="space-y-4 rounded-xl border border-border p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                  <Input
                    placeholder="Filter scholars by name, email, batch, or current group"
                    value={groupingSearch}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setGroupingSearch(event.target.value)
                    }
                  />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={groupingBatchFilter}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      setGroupingBatchFilter(event.target.value)
                    }
                  >
                    <option value="all">All batches</option>
                    {groupingBatchOptions.map((batch) => (
                      <option key={batch} value={batch}>
                        {batch}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
                  {filteredGroupingEnrollments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No scholars match the current filter.
                    </p>
                  ) : (
                    filteredGroupingEnrollments.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-3"
                      >
                        <div>
                          <p className="font-medium text-foreground">{enrollment.user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {enrollment.user.email}
                            {enrollment.user.batch ? ` • ${enrollment.user.batch}` : ""}
                            {enrollment.user.gender ? ` • ${enrollment.user.gender}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            Current: {enrollment.trackGroup || "Unassigned"}
                          </span>
                          <select
                            className="h-10 min-w-[160px] rounded-md border border-input bg-background px-3 text-sm"
                            value={enrollment.trackGroup || ""}
                            disabled={updatingEnrollmentId === enrollment.id}
                            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                              void handleUpdateScholarGrouping(enrollment.id, {
                                trackGroup: event.target.value || null,
                              })
                            }
                          >
                            <option value="">Unassigned</option>
                            {parseCommaSeparatedValues(groupingForm.trackGroupsText).map((group) => (
                              <option key={group} value={group}>
                                {group}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupingDialog(false)}>
              Close
            </Button>
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
              All assigned scholars start as present. Mark absentees, adjust marks when graded, and save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAttendanceOccurrence ? (
              <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {formatDateTime(selectedAttendanceOccurrence.scheduledAt)}
                </p>
                <p className="mt-1">
                  Max marks {selectedAttendanceSession?.maxScore ?? 0}
                </p>
              </div>
            ) : null}
            {selectedAttendanceEnrollments.map((enrollment) => (
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
                {selectedAttendanceSession?.maxScore ? (
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
                ) : (
                  <div className="flex h-10 items-center rounded-md border border-dashed border-border px-3 text-sm text-muted-foreground">
                    Non-graded
                  </div>
                )}
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

      <Dialog open={showCertificatesDialog} onOpenChange={setShowCertificatesDialog}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Programme certificates</DialogTitle>
            <DialogDescription>
              Generate certificates for completed scholars and edit issued certificates without changing their credential IDs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-4">
              <div>
                <p className="font-medium text-foreground">
                  {programme?.resultsPublishedAt
                    ? "Results are published. Certificates can be generated for completed scholars."
                    : "Publish results first to enable certificate generation."}
                </p>
                <p className="text-sm text-muted-foreground">
                  Existing certificates will be refreshed and keep the same credential IDs.
                </p>
              </div>
              <Button
                onClick={() => void handleGenerateCertificates()}
                disabled={!programme?.resultsPublishedAt || certificatesLoading}
              >
                {certificatesLoading
                  ? "Generating..."
                  : certificates.length > 0
                    ? "Regenerate current certificates"
                    : "Generate certificates"}
              </Button>
            </div>

            {certificatesLoading ? (
              <p className="text-sm text-muted-foreground">Loading certificates...</p>
            ) : certificates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No certificates generated for this programme yet.
              </p>
            ) : (
              <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
                {certificates.map((certificate) => (
                  <div key={certificate.id} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{certificate.scholarName}</p>
                          <Badge variant="outline">{certificate.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{certificate.programmeTitle}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {certificate.credentialId} • Issued {formatDate(certificate.issuedAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditCertificateDialog(certificate)}>
                          Edit
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <a href={certificate.fileUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Open
                          </a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={getManagedCertificateDownloadUrl(certificate.id)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <a href={certificate.verificationUrl} target="_blank" rel="noreferrer">
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Verify
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditCertificateDialog} onOpenChange={setShowEditCertificateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit certificate</DialogTitle>
            <DialogDescription>
              Update certificate text and issue date. The certificate will be regenerated with the same credential ID.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Scholar name</Label>
              <Input
                value={certificateEditForm.scholarName}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setCertificateEditForm((current) => ({ ...current, scholarName: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Programme title</Label>
              <Input
                value={certificateEditForm.programmeTitle}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setCertificateEditForm((current) => ({ ...current, programmeTitle: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Issue date</Label>
              <Input
                type="date"
                value={certificateEditForm.issuedAt}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setCertificateEditForm((current) => ({ ...current, issuedAt: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditCertificateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleUpdateCertificate()}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
