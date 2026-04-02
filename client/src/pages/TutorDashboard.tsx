import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  Download,
  BellRing,
  BookOpen,
  CircleHelp,
  Mail,
  MessageSquareText,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Send,
} from "lucide-react";
import { createAnnouncement, getAnnouncements, type Announcement } from "@/api/announcements";
import { sendRoleBasedEmail, type EmailRecipient } from "@/api/emails";
import {
  addProgrammeMeetingLink,
  addProgrammeResource,
  createProgrammeAssignment,
  createInteractiveSession,
  evaluateProgrammeSubmission,
  getManagedAssignmentSubmissions,
  getManagedProgrammeDetail,
  getManagedProgrammes,
  getManagedProgrammeReport,
  markInteractiveSessionAttendance,
  type ProgrammeManagerReportResponse,
  type ManagedProgramme,
  type ManagedProgrammeSummary,
  type ManagedSubmission,
} from "@/api/programmeManager";
import {
  getSupportQueryDetail,
  getSupportQueries,
  replyToSupportQuery,
  updateSupportQueryStatus,
  type QueryStatus,
  type SupportQuery,
} from "@/api/queries";
import { ManagerSidebar } from "@/components/dashboard/ManagerSidebar";
import { EmailComposerDialog } from "@/components/dashboard/EmailComposerDialog";
import { ManagerEvaluationSection } from "@/components/dashboard/manager/ManagerEvaluationSection";
import { ManagerAnalyticsSection } from "@/components/dashboard/manager/ManagerAnalyticsSection";
import { ManagerProgrammesSection } from "@/components/dashboard/manager/ManagerProgrammesSection";
import type { ManagerProgrammeStatusFilter } from "@/components/dashboard/manager/ManagerProgrammesSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { downloadCsvReport, exportReportAsPdf } from "@/lib/reportExport";
import { useLocation, useNavigate } from "react-router-dom";

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

const emptyLinkForm = {
  title: "",
  url: "",
};

const emptyResourceForm = {
  title: "",
  url: "",
  description: "",
  file: null as File | null,
};

const emptyAnnouncementForm = {
  title: "",
  message: "",
  programmeId: "",
};

const emptySessionForm = {
  title: "",
  description: "",
  scheduledAt: "",
  durationMinutes: "60",
  maxScore: "0",
  meetingUrl: "",
};

const queryStatusLabels: Record<QueryStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

type QueryTimeRangeFilter = "all" | "7d" | "30d" | "90d";

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "No date";

const getManagerProgrammeStatus = (programme: ManagedProgrammeSummary) => {
  if (programme.resultsPublishedAt) {
    return "completed";
  }

  if (
    programme.scholarsCount === 0 &&
    programme.assignmentsCount === 0 &&
    programme.interactiveSessionsCount === 0 &&
    (programme.resourcesCount || 0) === 0
  ) {
    return "setup";
  }

  return "active";
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

const matchesDateRange = (
  value: string | null | undefined,
  from: string,
  to: string,
) => {
  if (!value) return !from && !to;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return false;
  if (from && target < new Date(from).getTime()) return false;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (target > end.getTime()) return false;
  }
  return true;
};

const isWithinTimeRange = (
  value: string | null | undefined,
  timeRange: QueryTimeRangeFilter,
) => {
  if (timeRange === "all") {
    return true;
  }
  if (!value) {
    return false;
  }

  const target = new Date(value).getTime();
  if (Number.isNaN(target)) {
    return false;
  }

  const dayMap: Record<Exclude<QueryTimeRangeFilter, "all">, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };

  return Date.now() - target <= dayMap[timeRange] * 24 * 60 * 60 * 1000;
};

export default function TutorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [programmes, setProgrammes] = useState<ManagedProgrammeSummary[]>([]);
  const [selectedProgramme, setSelectedProgramme] = useState<ManagedProgramme | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [queries, setQueries] = useState<SupportQuery[]>([]);

  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedQueryId, setSelectedQueryId] = useState("");
  const [selectedQueryDetail, setSelectedQueryDetail] = useState<SupportQuery | null>(null);

  const [programmeSearch, setProgrammeSearch] = useState("");
  const [programmeDateFrom, setProgrammeDateFrom] = useState("");
  const [programmeDateTo, setProgrammeDateTo] = useState("");
  const [programmeStatusFilter, setProgrammeStatusFilter] =
    useState<ManagerProgrammeStatusFilter>("all");
  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [announcementDateFrom, setAnnouncementDateFrom] = useState("");
  const [announcementDateTo, setAnnouncementDateTo] = useState("");
  const [reportProgrammeId, setReportProgrammeId] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [queryStatusFilter, setQueryStatusFilter] = useState<"all" | QueryStatus>("all");
  const [queryBatchFilter, setQueryBatchFilter] = useState("all");
  const [queryTimeRangeFilter, setQueryTimeRangeFilter] =
    useState<QueryTimeRangeFilter>("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [evaluationSearch, setEvaluationSearch] = useState("");
  const [evaluationFilter, setEvaluationFilter] = useState("all");

  const [submissions, setSubmissions] = useState<ManagedSubmission[]>([]);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [queryReplyDraft, setQueryReplyDraft] = useState("");
  const [queryStatusDraft, setQueryStatusDraft] = useState<QueryStatus>("open");
  const [pinnedQueryIds, setPinnedQueryIds] = useState<string[]>([]);
  const [isQueryListCollapsed, setIsQueryListCollapsed] = useState(false);

  const [studentDetailId, setStudentDetailId] = useState<string | null>(null);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [resourceForm, setResourceForm] = useState(emptyResourceForm);
  const [meetingForm, setMeetingForm] = useState(emptyLinkForm);
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncementForm);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, "present" | "absent">>({});
  const [attendanceScoreDrafts, setAttendanceScoreDrafts] = useState<Record<string, string>>({});
  const [reportData, setReportData] = useState<ProgrammeManagerReportResponse | null>(null);
  const [selectedEmailStudentIds, setSelectedEmailStudentIds] = useState<string[]>([]);
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([]);
  const [emailRecipientLabel, setEmailRecipientLabel] = useState("selected scholars");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("manager:pinnedQueries");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setPinnedQueryIds(parsed.filter((value): value is string => typeof value === "string"));
      }
    } catch {
      setPinnedQueryIds([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("manager:pinnedQueries", JSON.stringify(pinnedQueryIds));
  }, [pinnedQueryIds]);

  const loadSelectedProgramme = useCallback(
    async (programmeId: string) => {
      if (!programmeId) {
        setSelectedProgramme(null);
        return;
      }

      try {
        const response = await getManagedProgrammeDetail(programmeId);
        setSelectedProgramme((response?.data?.programme as ManagedProgramme) || null);
      } catch (error) {
        toast({
          title: "Unable to load programme details",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
        setSelectedProgramme(null);
      }
    },
    [toast],
  );

  const loadProgrammes = useCallback(
    async (preferredProgrammeId?: string) => {
      try {
        setLoading(true);
        const response = await getManagedProgrammes();
        const nextProgrammes = Array.isArray(response?.data?.programmes)
          ? (response.data.programmes as ManagedProgrammeSummary[])
          : [];
        const nextProgrammeId =
          preferredProgrammeId || selectedProgrammeId || nextProgrammes[0]?.id || "";
        setProgrammes(nextProgrammes);
        setSelectedProgrammeId(nextProgrammeId);
        setReportProgrammeId((current) => current || nextProgrammeId);
        await loadSelectedProgramme(nextProgrammeId);
      } catch (error) {
        toast({
          title: "Unable to load programmes",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [loadSelectedProgramme, selectedProgrammeId, toast],
  );

  const loadAnnouncements = useCallback(async () => {
    try {
      const response = await getAnnouncements();
      const nextAnnouncements = Array.isArray(response?.data?.announcements)
        ? (response.data.announcements as Announcement[])
        : [];
      setAnnouncements(nextAnnouncements);
    } catch (error) {
      toast({
        title: "Unable to load announcements",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadQueries = useCallback(
    async (preferredQueryId?: string) => {
      try {
        const response = await getSupportQueries();
        const nextQueries = Array.isArray(response?.data?.queries)
          ? (response.data.queries as SupportQuery[])
          : [];
        setQueries(nextQueries);
        setSelectedQueryDetail(null);
        setSelectedQueryId((current) => preferredQueryId || current || nextQueries[0]?.id || "");
      } catch (error) {
        toast({
          title: "Unable to load scholar queries",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    },
    [toast],
  );

  const loadSubmissions = useCallback(
    async (programmeId: string, assignmentId: string) => {
      if (!programmeId || !assignmentId) {
        setSubmissions([]);
        setScoreDrafts({});
        return;
      }

      try {
        const response = await getManagedAssignmentSubmissions(programmeId, assignmentId);
        const nextSubmissions = Array.isArray(response?.data)
          ? (response.data as ManagedSubmission[])
          : [];
        setSubmissions(nextSubmissions);
        setScoreDrafts(
          Object.fromEntries(
            nextSubmissions.map((submission) => [
              submission.id,
              submission.score !== null && submission.score !== undefined
                ? String(submission.score)
                : "",
            ]),
          ),
        );
      } catch (error) {
        toast({
          title: "Unable to load submissions",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
        setSubmissions([]);
        setScoreDrafts({});
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadProgrammes();
  }, [loadProgrammes]);

  useEffect(() => {
    if (activeSection === "announcements") {
      void loadAnnouncements();
    }
    if (activeSection === "analytics") {
      void loadAnnouncements();
    }
  }, [activeSection, loadAnnouncements]);

  useEffect(() => {
    if (activeSection === "queries") {
      void loadQueries();
    }
    if (activeSection === "analytics") {
      void loadQueries();
    }
  }, [activeSection, loadQueries]);

  useEffect(() => {
    const loadQueryDetail = async () => {
      if (activeSection !== "queries" || !selectedQueryId) {
        setSelectedQueryDetail(null);
        return;
      }

      try {
        const response = await getSupportQueryDetail(selectedQueryId);
        setSelectedQueryDetail((response?.data?.query as SupportQuery) || null);
      } catch {
        setSelectedQueryDetail(null);
      }
    };

    void loadQueryDetail();
  }, [activeSection, selectedQueryId]);

  useEffect(() => {
    void loadSelectedProgramme(selectedProgrammeId);
  }, [loadSelectedProgramme, selectedProgrammeId]);

  const selectedAssignmentType = selectedAssignmentId.startsWith("session:")
    ? "session"
    : selectedAssignmentId.startsWith("assignment:")
      ? "assignment"
      : "";
  const selectedAssignmentKey =
    selectedAssignmentType === "assignment"
      ? selectedAssignmentId.replace("assignment:", "")
      : "";
  const selectedSessionKey =
    selectedAssignmentType === "session"
      ? selectedAssignmentId.replace("session:", "")
      : "";
  const selectedAssignments = useMemo(
    () => selectedProgramme?.assignments || [],
    [selectedProgramme],
  );
  const selectedInteractiveSessions = useMemo(
    () => selectedProgramme?.interactiveSessions || [],
    [selectedProgramme],
  );
  const selectedQuery =
    selectedQueryDetail ||
    queries.find((query) => query.id === selectedQueryId) ||
    null;
  const selectedAttendanceSession = useMemo(
    () =>
      selectedProgramme?.interactiveSessions.find(
        (session) => session.id === attendanceSessionId,
      ) || null,
    [attendanceSessionId, selectedProgramme],
  );
  const selectedEvaluationSession =
    selectedInteractiveSessions.find((session) => session.id === selectedSessionKey) || null;

  const totalStudents = useMemo(
    () => programmes.reduce((sum, programme) => sum + programme.scholarsCount, 0),
    [programmes],
  );

  const totalResources = useMemo(
    () =>
      programmes.reduce(
        (sum, programme) =>
          sum + (programme.resourcesCount || 0) + (programme.meetingsCount || 0),
        0,
      ),
    [programmes],
  );

  const filteredProgrammes = useMemo(
    () =>
      programmes.filter((programme) => {
        const matchesSearch = `${programme.title} ${programme.description || ""}`
          .toLowerCase()
          .includes(programmeSearch.toLowerCase());
        const matchesStatus =
          programmeStatusFilter === "all" ||
          getManagerProgrammeStatus(programme) === programmeStatusFilter;
        return (
          matchesSearch &&
          matchesStatus &&
          matchesDateRange(programme.createdAt, programmeDateFrom, programmeDateTo)
        );
      }),
    [
      programmeDateFrom,
      programmeDateTo,
      programmeSearch,
      programmeStatusFilter,
      programmes,
    ],
  );

  const filteredAnnouncements = useMemo(
    () =>
      announcements.filter((announcement) => {
        const matchesSearch = `${announcement.title} ${announcement.message} ${announcement.programme?.title || ""}`
          .toLowerCase()
          .includes(announcementSearch.toLowerCase());
        return (
          matchesSearch &&
          matchesDateRange(
            announcement.createdAt,
            announcementDateFrom,
            announcementDateTo,
          )
        );
      }),
    [announcementDateFrom, announcementDateTo, announcementSearch, announcements],
  );

  const queryBatches = useMemo(
    () =>
      Array.from(
        new Set(
          queries
            .map((query) => query.author.batch)
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [queries],
  );

  const filteredQueries = useMemo(() => {
    const filtered = queries.filter((query) => {
      const matchesSearch = `${query.subject} ${query.message} ${query.author.name} ${query.author.email} ${query.programme?.title || ""}`
        .toLowerCase()
        .includes(querySearch.toLowerCase());
      const matchesStatus =
        queryStatusFilter === "all" || query.status === queryStatusFilter;
      const matchesBatch =
        queryBatchFilter === "all" || query.author.batch === queryBatchFilter;
      const matchesTimeRange = isWithinTimeRange(
        query.updatedAt || query.createdAt,
        queryTimeRangeFilter,
      );
      return matchesSearch && matchesStatus && matchesBatch && matchesTimeRange;
    });

    return [...filtered].sort((left, right) => {
      const leftPinned = pinnedQueryIds.includes(left.id);
      const rightPinned = pinnedQueryIds.includes(right.id);
      if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [
    pinnedQueryIds,
    queries,
    queryBatchFilter,
    querySearch,
    queryStatusFilter,
    queryTimeRangeFilter,
  ]);

  const visibleStudents = selectedProgramme
    ? selectedProgramme.enrollments.filter((enrollment) =>
        `${enrollment.user.name} ${enrollment.user.email} ${enrollment.user.batch || ""}`
          .toLowerCase()
          .includes(studentSearch.toLowerCase()),
      )
    : [];

  const selectedEmailRecipients = useMemo<EmailRecipient[]>(
    () =>
      (selectedProgramme?.enrollments || [])
        .filter((enrollment) => selectedEmailStudentIds.includes(enrollment.user.id))
        .map((enrollment) => ({
          id: enrollment.user.id,
          name: enrollment.user.name,
          email: enrollment.user.email,
        })),
    [selectedEmailStudentIds, selectedProgramme],
  );

  const selectedStudentDetail =
    selectedProgramme?.enrollments.find(
      (enrollment) => enrollment.user.id === studentDetailId,
    ) || null;

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const matchesSearch =
        !evaluationSearch.trim() ||
        `${submission.student.name} ${submission.student.email}`
          .toLowerCase()
          .includes(evaluationSearch.toLowerCase());

      const matchesFilter =
        evaluationFilter === "all" ||
        (evaluationFilter === "graded" && submission.status === "GRADED") ||
        (evaluationFilter === "under_evaluation" &&
          submission.status === "SUBMITTED");

      return matchesSearch && matchesFilter;
    });
  }, [evaluationFilter, evaluationSearch, submissions]);
  const filteredSessionStudents = useMemo(() => {
    if (!selectedProgramme || !selectedEvaluationSession) {
      return [];
    }

    return selectedProgramme.enrollments
      .filter((enrollment) => {
        const matchesSearch =
          !evaluationSearch.trim() ||
          `${enrollment.user.name} ${enrollment.user.email} ${enrollment.user.batch || ""}`
            .toLowerCase()
            .includes(evaluationSearch.toLowerCase());

        const attendance = selectedEvaluationSession.attendances.find(
          (entry) => entry.userId === enrollment.user.id,
        );
        const status = attendanceDrafts[enrollment.user.id] || attendance?.status || "present";
        const matchesFilter =
          evaluationFilter === "all" ||
          (evaluationFilter === "present" && status === "present") ||
          (evaluationFilter === "absent" && status === "absent");

        return matchesSearch && matchesFilter;
      })
      .map((enrollment) => {
        const attendance = selectedEvaluationSession.attendances.find(
          (entry) => entry.userId === enrollment.user.id,
        );

        return {
          user: enrollment.user,
          status: attendanceDrafts[enrollment.user.id] || attendance?.status || "present",
          score:
            attendanceDrafts[enrollment.user.id] === "absent"
              ? "0"
              : attendanceScoreDrafts[enrollment.user.id] ??
                (attendance?.score !== null && attendance?.score !== undefined
                  ? String(attendance.score)
                  : String(selectedEvaluationSession.maxScore || 0)),
        };
      });
  }, [
    attendanceDrafts,
    attendanceScoreDrafts,
    evaluationFilter,
    evaluationSearch,
    selectedEvaluationSession,
    selectedProgramme,
  ]);

  const pendingAssignmentRecipients = useMemo<EmailRecipient[]>(() => {
    if (!selectedProgramme || selectedAssignmentType !== "assignment" || !selectedAssignmentKey) {
      return [];
    }

    const submittedStudentIds = new Set(submissions.map((submission) => submission.student.id));

    return selectedProgramme.enrollments
      .filter((enrollment) => !submittedStudentIds.has(enrollment.user.id))
      .map((enrollment) => ({
        id: enrollment.user.id,
        name: enrollment.user.name,
        email: enrollment.user.email,
      }));
  }, [
    selectedAssignmentKey,
    selectedAssignmentType,
    selectedProgramme,
    submissions,
  ]);

  useEffect(() => {
    if (!selectedProgrammeId && programmes[0]) {
      setSelectedProgrammeId(programmes[0].id);
    }
  }, [programmes, selectedProgrammeId]);

  useEffect(() => {
    setSelectedAssignmentId((current) => {
      if (
        selectedAssignments.some(
          (assignment) => `assignment:${assignment.id}` === current,
        ) ||
        selectedInteractiveSessions.some(
          (session) => `session:${session.id}` === current,
        )
      ) {
        return current;
      }
      return "";
    });
  }, [selectedAssignments, selectedInteractiveSessions]);

  useEffect(() => {
    if (selectedQuery) {
      setQueryStatusDraft(selectedQuery.status);
    }
  }, [selectedQuery]);

  useEffect(() => {
    if (selectedAssignmentType === "assignment") {
      void loadSubmissions(selectedProgrammeId, selectedAssignmentKey);
      return;
    }

    setSubmissions([]);
    setScoreDrafts({});
  }, [
    loadSubmissions,
    selectedAssignmentId,
    selectedAssignmentKey,
    selectedAssignmentType,
    selectedProgrammeId,
  ]);

  useEffect(() => {
    if (!selectedProgramme || !selectedEvaluationSession) {
      return;
    }

    setAttendanceSessionId(selectedEvaluationSession.id);
    setAttendanceDrafts(
      Object.fromEntries(
        selectedProgramme.enrollments.map((enrollment) => {
          const attendance = selectedEvaluationSession.attendances.find(
            (entry) => entry.userId === enrollment.user.id,
          );
          return [enrollment.user.id, attendance?.status || "present"];
        }),
      ) as Record<string, "present" | "absent">,
    );
    setAttendanceScoreDrafts(
      Object.fromEntries(
        selectedProgramme.enrollments.map((enrollment) => {
          const attendance = selectedEvaluationSession.attendances.find(
            (entry) => entry.userId === enrollment.user.id,
          );
          return [
            enrollment.user.id,
            attendance?.score !== null && attendance?.score !== undefined
              ? String(attendance.score)
              : String(selectedEvaluationSession.maxScore || 0),
          ];
        }),
      ) as Record<string, string>,
    );
  }, [selectedEvaluationSession, selectedProgramme]);

  const toggleEmailStudent = (userId: string) => {
    setSelectedEmailStudentIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const openEmailDialogForRecipients = (
    recipients: EmailRecipient[],
    label: string,
  ) => {
    setEmailRecipients(recipients);
    setEmailRecipientLabel(label);
    setShowEmailDialog(true);
  };

  const handleOpenEmailForSelectedStudents = () => {
    if (!selectedEmailRecipients.length) {
      toast({
        title: "No scholars selected",
        description: "Select one or more scholars before proceeding to email.",
        variant: "destructive",
      });
      return;
    }

    openEmailDialogForRecipients(
      selectedEmailRecipients,
      `${selectedEmailRecipients.length} selected scholar${selectedEmailRecipients.length === 1 ? "" : "s"}`,
    );
  };

  const handleOpenEmailForPendingAssignments = () => {
    if (!pendingAssignmentRecipients.length) {
      toast({
        title: "No pending scholars",
        description: "Everyone has already submitted for this assignment.",
        variant: "destructive",
      });
      return;
    }

    openEmailDialogForRecipients(
      pendingAssignmentRecipients,
      `${pendingAssignmentRecipients.length} scholar${pendingAssignmentRecipients.length === 1 ? "" : "s"} who have not submitted yet`,
    );
  };

  const handleSendManagerEmail = async (payload: {
    subject: string;
    body: string;
    cc: string;
    bcc: string;
    attachments: File[];
  }) => {
    if (!emailRecipients.length) {
      toast({
        title: "No recipients selected",
        description: "Choose at least one scholar before sending.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingEmail(true);
      await sendRoleBasedEmail({
        userIds: emailRecipients.map((recipient) => recipient.id),
        subject: payload.subject,
        body: payload.body,
        cc: payload.cc,
        bcc: payload.bcc,
        attachments: payload.attachments,
      });
      setShowEmailDialog(false);
      toast({
        title: "Email sent",
        description: `Sent to ${emailRecipients.length} recipient${emailRecipients.length === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      toast({
        title: "Unable to send email",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const togglePinnedQuery = (queryId: string) => {
    setPinnedQueryIds((current) =>
      current.includes(queryId)
        ? current.filter((id) => id !== queryId)
        : [queryId, ...current],
    );
  };

  const handleCreateAssignment = async () => {
    if (!selectedProgrammeId || !assignmentForm.title.trim()) {
      toast({
        title: "Assignment details required",
        description: "Add a title and choose the programme first.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createProgrammeAssignment(selectedProgrammeId, {
        ...assignmentForm,
        maxScore: Number(assignmentForm.maxScore || 0),
      });
      setAssignmentForm(emptyAssignmentForm);
      setShowAssignmentDialog(false);
      await loadProgrammes(selectedProgrammeId);
      toast({
        title: "Assignment published",
        description: "The assignment is now visible under the selected programme.",
      });
    } catch (error) {
      toast({
        title: "Unable to publish assignment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateInteractiveSession = async () => {
    if (!selectedProgrammeId || !sessionForm.title.trim() || !sessionForm.scheduledAt) {
      toast({
        title: "Session details required",
        description: "Add a title and schedule for the interactive session.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createInteractiveSession(selectedProgrammeId, {
        title: sessionForm.title.trim(),
        description: sessionForm.description.trim(),
        scheduledAt: sessionForm.scheduledAt,
        durationMinutes: Number(sessionForm.durationMinutes || 60),
        maxScore: Number(sessionForm.maxScore || 0),
        meetingUrl: sessionForm.meetingUrl.trim() || undefined,
      });
      setSessionForm(emptySessionForm);
      setShowSessionDialog(false);
      await loadProgrammes(selectedProgrammeId);
      toast({
        title: "Interactive session scheduled",
        description: "Scholars will now see it in their calendar.",
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
    if (
      !selectedProgrammeId ||
      !resourceForm.title.trim() ||
      (!resourceForm.url.trim() && !resourceForm.file)
    ) {
      toast({
        title: "Resource details required",
        description: "Add a title and either a URL or an uploaded file.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addProgrammeResource(selectedProgrammeId, resourceForm);
      setResourceForm(emptyResourceForm);
      setShowResourceDialog(false);
      await loadProgrammes(selectedProgrammeId);
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
    if (!selectedProgrammeId || !meetingForm.title.trim() || !meetingForm.url.trim()) {
      toast({
        title: "Meeting details required",
        description: "Add both a title and a link for the online meeting.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addProgrammeMeetingLink(selectedProgrammeId, meetingForm);
      setMeetingForm(emptyLinkForm);
      setShowMeetingDialog(false);
      await loadProgrammes(selectedProgrammeId);
      toast({
        title: "Meeting link added",
        description: "Scholars can now see the session link in the programme.",
      });
    } catch (error) {
      toast({
        title: "Unable to add meeting",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendAnnouncement = async () => {
    const programmeId = announcementForm.programmeId || selectedProgrammeId;
    if (!programmeId || !announcementForm.title.trim() || !announcementForm.message.trim()) {
      toast({
        title: "Announcement details required",
        description: "Choose a programme, then add a title and message.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createAnnouncement({
        programmeId,
        title: announcementForm.title.trim(),
        message: announcementForm.message.trim(),
      });
      setAnnouncementForm(emptyAnnouncementForm);
      setShowAnnouncementDialog(false);
      await loadAnnouncements();
      toast({
        title: "Announcement sent",
        description: "The selected programme scholars will receive it in their dashboard.",
      });
    } catch (error) {
      toast({
        title: "Unable to send announcement",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAttendance = async () => {
    if (!attendanceSessionId || !selectedProgramme) {
      return;
    }

    try {
      await markInteractiveSessionAttendance(
        attendanceSessionId,
        selectedProgramme.enrollments.map((enrollment) => ({
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
      await loadProgrammes(selectedProgramme.id);
      toast({
        title: "Attendance updated",
        description: "The interactive session attendance has been saved.",
      });
    } catch (error) {
      toast({
        title: "Unable to update attendance",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateProgrammeReport = async () => {
    if (!reportProgrammeId) {
      toast({
        title: "Programme required",
        description: "Choose a programme before generating the report.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await getManagedProgrammeReport(reportProgrammeId);
      setReportData(response.data as ProgrammeManagerReportResponse);
      toast({
        title: "Report generated",
        description: "The programme report is ready to export.",
      });
    } catch (error) {
      toast({
        title: "Unable to generate report",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveMarks = async (submissionId: string) => {
    const draft = scoreDrafts[submissionId];
    if (draft === undefined || draft.trim() === "") {
      toast({
        title: "Score required",
        description: "Enter a mark before saving the evaluation.",
        variant: "destructive",
      });
      return;
    }

    try {
      await evaluateProgrammeSubmission(submissionId, Number(draft));
      await loadSubmissions(selectedProgrammeId, selectedAssignmentKey);
      toast({
        title: "Marks saved",
        description: "The scholar submission has been evaluated.",
      });
    } catch (error) {
      toast({
        title: "Unable to save marks",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReplyToQuery = async () => {
    if (!selectedQuery || !queryReplyDraft.trim()) {
      toast({
        title: "Reply required",
        description: "Type a response before sending.",
        variant: "destructive",
      });
      return;
    }

    try {
      await replyToSupportQuery(selectedQuery.id, queryReplyDraft.trim());
      setQueryReplyDraft("");
      await loadQueries(selectedQuery.id);
      toast({
        title: "Reply sent",
        description: "The scholar can now see your response.",
      });
    } catch (error) {
      toast({
        title: "Unable to send reply",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateQueryStatus = async () => {
    if (!selectedQuery) return;

    try {
      await updateSupportQueryStatus(selectedQuery.id, queryStatusDraft);
      await loadQueries(selectedQuery.id);
      toast({
        title: "Query updated",
        description: "The thread status has been updated.",
      });
    } catch (error) {
      toast({
        title: "Unable to update query",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get("section");
    if (section) {
      setActiveSection(section);
    }
  }, [location.search]);

  const dashboardBasePath = location.pathname.startsWith("/tutor")
    ? "/tutor"
    : "/programme-manager";

  return (
    <div className="flex min-h-screen bg-background">
      <ManagerSidebar
        activeSection={activeSection}
        onSelectSection={(section) => {
          setActiveSection(section);
          navigate(`${dashboardBasePath}?section=${section}`);
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 pl-14 backdrop-blur-md lg:px-8 lg:pl-8">
          <div>
            <h1 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Programme Manager
            </h1>
            <p className="text-xs text-muted-foreground">
              Welcome, {user?.name}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void loadProgrammes(selectedProgrammeId)}
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {activeSection === "overview" && (
              <>
                <section className="overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(12,106,204,0.10),rgba(32,201,151,0.06),rgba(255,255,255,0.98))] p-6 shadow-sm sm:p-8">
                  <div className="space-y-5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-vahani-blue">
                        Platform Control
                      </p>
                      <h2 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
                        Manage programmes, content, evaluation, and scholar
                        support
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Work one programme at a time and keep assignment,
                        resource, announcement, and evaluation workflows tidy.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-border bg-card/80 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                          Manager
                        </p>
                        <p className="mt-2 text-base font-semibold text-foreground">
                          {user?.name}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-card/80 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                          Programmes
                        </p>
                        <p className="mt-2 text-base font-semibold text-foreground">
                          {programmes.length}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-card/80 p-4">
                        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                          Scholars
                        </p>
                        <p className="mt-2 text-base font-semibold text-foreground">
                          {totalStudents}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Managed programmes",
                      value: programmes.length,
                      hint: "Courses under your care",
                      icon: BookOpen,
                    },
                    {
                      label: "Study items",
                      value: totalResources,
                      hint: "Resources and meetings published",
                      icon: BellRing,
                    },
                    {
                      label: "Announcements",
                      value: announcements.length,
                      hint: "Messages shared with scholars",
                      icon: MessageSquareText,
                    },
                    {
                      label: "Open queries",
                      value: queries.filter(
                        (query) =>
                          query.status !== "closed" &&
                          query.status !== "resolved",
                      ).length,
                      hint: "Threads that still need attention",
                      icon: CircleHelp,
                    },
                  ].map((stat) => (
                    <Card key={stat.label}>
                      <CardContent className="pt-5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {stat.label}
                          </span>
                          <stat.icon className="h-4 w-4 text-vahani-blue" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          {loading ? "..." : stat.value}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {stat.hint}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {activeSection === "programmes" && (
              <ManagerProgrammesSection
                programmeSearch={programmeSearch}
                onProgrammeSearchChange={setProgrammeSearch}
                programmeDateFrom={programmeDateFrom}
                onProgrammeDateFromChange={setProgrammeDateFrom}
                programmeDateTo={programmeDateTo}
                onProgrammeDateToChange={setProgrammeDateTo}
                programmeStatusFilter={programmeStatusFilter}
                onProgrammeStatusFilterChange={setProgrammeStatusFilter}
                filteredProgrammes={filteredProgrammes}
                onOpenProgramme={(programmeId) =>
                  navigate(`${dashboardBasePath}/programmes/${programmeId}`)
                }
                formatDate={formatDate}
              />
            )}

            {activeSection === "analytics" && (
              <ManagerAnalyticsSection
                programmes={programmes}
                announcements={announcements}
                queries={queries}
              />
            )}

            {activeSection === "announcements" && (
              <Card>
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle>Announcements</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Send programme updates through a dialog and review the
                        history.
                      </p>
                    </div>
                    <Button onClick={() => setShowAnnouncementDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Send announcement
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
                    <Input
                      value={announcementSearch}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setAnnouncementSearch(event.target.value)
                      }
                      placeholder="Search announcements by title, message, or programme"
                    />
                    <Input
                      type="date"
                      value={announcementDateFrom}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setAnnouncementDateFrom(event.target.value)
                      }
                    />
                    <Input
                      type="date"
                      value={announcementDateTo}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setAnnouncementDateTo(event.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-4">
                    {filteredAnnouncements.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No announcements match the current filters.
                      </p>
                    )}
                    {filteredAnnouncements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className="rounded-xl border border-border p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">
                            {announcement.title}
                          </p>
                          <Badge variant="outline">
                            {announcement.programme?.title || "General"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {announcement.message}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{formatDateTime(announcement.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {activeSection === "evaluation" && (
              <ManagerEvaluationSection
                programmes={programmes}
                selectedProgrammeId={selectedProgrammeId}
                onSelectedProgrammeChange={(value) => {
                  setSelectedProgrammeId(value);
                  setSelectedAssignmentId("");
                  setEvaluationSearch("");
                  setEvaluationFilter("all");
                }}
                selectedAssignmentId={selectedAssignmentId}
                onSelectedAssignmentChange={(value) => {
                  setSelectedAssignmentId(value);
                  setEvaluationSearch("");
                  setEvaluationFilter("all");
                }}
                selectedAssignments={selectedAssignments}
                selectedInteractiveSessions={selectedInteractiveSessions}
                selectedAssignmentType={selectedAssignmentType}
                evaluationSearch={evaluationSearch}
                onEvaluationSearchChange={setEvaluationSearch}
                evaluationFilter={evaluationFilter}
                onEvaluationFilterChange={setEvaluationFilter}
                filteredSubmissions={filteredSubmissions}
                filteredSessionStudents={filteredSessionStudents}
                selectedEvaluationSession={selectedEvaluationSession}
                scoreDrafts={scoreDrafts}
                onScoreDraftChange={(submissionId, value) =>
                  setScoreDrafts((current) => ({
                    ...current,
                    [submissionId]: value,
                  }))
                }
                onSaveMarks={(submissionId) => void handleSaveMarks(submissionId)}
                onOpenSubmissionFile={(submission) => {
                  if (submission.assignment.assignmentType === "document") {
                    setPreviewFile({
                      url: submission.fileUrl as string,
                      title: `${submission.student.name} | ${submission.assignment.title}`,
                    });
                    return;
                  }

                  if (submission.fileUrl) {
                    const link = document.createElement("a");
                    link.href = submission.fileUrl;
                    link.target = "_blank";
                    link.rel = "noreferrer";
                    link.download = "";
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  }
                }}
                onEmailPendingAssignments={handleOpenEmailForPendingAssignments}
                onEmailVisibleScholars={() => {
                  const recipients =
                    selectedAssignmentType === "session"
                      ? filteredSessionStudents.map((entry) => ({
                          id: entry.user.id,
                          name: entry.user.name,
                          email: entry.user.email,
                        }))
                      : filteredSubmissions.map((submission) => ({
                          id: submission.student.id,
                          name: submission.student.name,
                          email: submission.student.email,
                        }));
                  openEmailDialogForRecipients(recipients, "currently visible scholars");
                }}
                attendanceSessionMaxScore={selectedEvaluationSession?.maxScore || 0}
                onSessionStatusChange={(userId, status) => {
                  setAttendanceDrafts((current) => ({
                    ...current,
                    [userId]: status,
                  }));
                  setAttendanceScoreDrafts((current) => ({
                    ...current,
                    [userId]:
                      status === "absent"
                        ? "0"
                        : current[userId] || String(selectedEvaluationSession?.maxScore || 0),
                  }));
                }}
                onSessionScoreChange={(userId, value) =>
                  setAttendanceScoreDrafts((current) => ({
                    ...current,
                    [userId]: value,
                  }))
                }
                onSaveSessionEvaluation={() => void handleSaveAttendance()}
                formatDateTime={formatDateTime}
                previewFile={previewFile}
                onPreviewFileChange={setPreviewFile}
              />
            )}

            {activeSection === "reports" && (
              <Card>
                <CardHeader>
                  <CardTitle>Programme reports</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={reportProgrammeId}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        setReportProgrammeId(event.target.value)
                      }
                    >
                      <option value="">Select a programme</option>
                      {programmes.map((programme) => (
                        <option key={programme.id} value={programme.id}>
                          {programme.title}
                        </option>
                      ))}
                    </select>
                    <Button onClick={() => void handleGenerateProgrammeReport()}>
                      Generate report
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        disabled={!reportData || reportData.rows.length === 0}
                        onClick={() =>
                          reportData &&
                          downloadCsvReport(
                            reportData,
                            `programme-report-${reportData.programme.title.replace(/\s+/g, "-").toLowerCase()}`,
                          )
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!reportData || reportData.rows.length === 0}
                        onClick={() =>
                          reportData &&
                          exportReportAsPdf(
                            reportData,
                            `${reportData.programme.title} report`,
                            `programme-report-${reportData.programme.title.replace(/\s+/g, "-").toLowerCase()}`,
                          )
                        }
                      >
                        PDF
                      </Button>
                    </div>
                  </div>

                  {reportData && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border p-4">
                        <p className="font-medium text-foreground">
                          {reportData.programme.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Generated on {formatDateTime(reportData.generatedAt)} with{" "}
                          {reportData.rows.length} scholar row(s).
                        </p>
                      </div>

                      {reportData.rows.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-muted/40">
                              <tr>
                                {Object.keys(reportData.rows[0]).map((key) => (
                                  <th
                                    key={key}
                                    className="px-4 py-3 text-left font-medium text-foreground"
                                  >
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {reportData.rows.map((row, index) => (
                                <tr key={`${reportData.programme.id}-${index}`}>
                                  {Object.keys(reportData.rows[0]).map((key) => (
                                    <td
                                      key={key}
                                      className="px-4 py-3 text-muted-foreground"
                                    >
                                      {String(row[key] ?? "")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No scholar rows were returned for this programme yet.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeSection === "queries" && (
              <>
              <Card>
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquareText className="h-4 w-4 text-vahani-blue" />
                      Query Filters
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {filteredQueries.length} of {queries.length} queries shown
                    </p>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr),repeat(3,minmax(0,1fr))]">
                    <div className="relative">
                      <Input
                        value={querySearch}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setQuerySearch(event.target.value)
                        }
                        placeholder="Search by subject, scholar, programme, or content"
                        className="pl-4"
                      />
                    </div>
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={queryBatchFilter}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        setQueryBatchFilter(event.target.value)
                      }
                    >
                      <option value="all">All batches</option>
                      {queryBatches.map((batch) => (
                        <option key={batch} value={batch}>
                          {batch}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={queryTimeRangeFilter}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        setQueryTimeRangeFilter(
                          event.target.value as QueryTimeRangeFilter,
                        )
                      }
                    >
                      <option value="all">All time</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                    </select>
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={queryStatusFilter}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        setQueryStatusFilter(
                          event.target.value as "all" | QueryStatus,
                        )
                      }
                    >
                      <option value="all">Any status</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </CardHeader>
              </Card>

              <div
                className={`grid gap-6 ${
                  isQueryListCollapsed ? "grid-cols-1" : "lg:grid-cols-[380px,1fr]"
                }`}
              >
                {!isQueryListCollapsed && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle>Scholar queries</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsQueryListCollapsed(true)}
                      >
                        Collapse list
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {filteredQueries.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No queries match the current filters.
                        </p>
                      )}
                      {filteredQueries.map((query) => {
                        const isPinned = pinnedQueryIds.includes(query.id);
                        return (
                          <button
                            key={query.id}
                            type="button"
                            onClick={() => setSelectedQueryId(query.id)}
                            className={`w-full rounded-xl border p-4 text-left transition ${
                              selectedQuery?.id === query.id
                                ? "border-vahani-blue bg-vahani-blue/5"
                                : "border-border hover:bg-muted/30"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground">
                                  {query.subject}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {query.author.name}
                                  {query.author.batch
                                    ? ` - ${query.author.batch}`
                                    : ""}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  togglePinnedQuery(query.id);
                                }}
                              >
                                {isPinned ? (
                                  <>
                                    <PinOff className="mr-2 h-4 w-4" />
                                    Unpin
                                  </>
                                ) : (
                                  <>
                                    <Pin className="mr-2 h-4 w-4" />
                                    Pin
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline">
                                {queryStatusLabels[query.status]}
                              </Badge>
                              {query.programme?.title && (
                                <Badge variant="secondary">
                                  {query.programme.title}
                                </Badge>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                )}

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle>Query thread</CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setIsQueryListCollapsed((current) => !current)
                        }
                      >
                        {isQueryListCollapsed ? "Show query list" : "Hide query list"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!selectedQuery && (
                      <p className="text-sm text-muted-foreground">
                        Select a query to open the scholar conversation.
                      </p>
                    )}

                    {selectedQuery && (
                      <>
                        <div className="rounded-xl border border-border p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold text-foreground">
                              {selectedQuery.subject}
                            </p>
                            <Badge variant="secondary">
                              {queryStatusLabels[selectedQuery.status]}
                            </Badge>
                            {selectedQuery.programme?.title && (
                              <Badge variant="outline">
                                {selectedQuery.programme.title}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            From {selectedQuery.author.name} (
                            {selectedQuery.author.email})
                          </p>
                        </div>

                        <div className="space-y-3">
                          {(selectedQueryDetail?.messages || []).map((message) => (
                            <div
                              key={message.id}
                              className="rounded-xl border p-4"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">
                                  {message.author.id === user?.id
                                    ? "You"
                                    : message.author.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(message.createdAt)}
                                </p>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-foreground/90">
                                {message.message}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="grid gap-4 md:grid-cols-[220px,1fr]">
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <select
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                              value={queryStatusDraft}
                              onChange={(
                                event: ChangeEvent<HTMLSelectElement>,
                              ) =>
                                setQueryStatusDraft(
                                  event.target.value as QueryStatus,
                                )
                              }
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => void handleUpdateQueryStatus()}
                            >
                              Update status
                            </Button>
                          </div>

                          <div className="space-y-3 rounded-xl border border-border p-4">
                            <div className="flex items-center gap-2">
                              <CircleHelp className="h-4 w-4 text-vahani-blue" />
                              <p className="text-sm font-semibold text-foreground">
                                Reply
                              </p>
                            </div>
                            <Textarea
                              rows={4}
                              value={queryReplyDraft}
                              onChange={(
                                event: ChangeEvent<HTMLTextAreaElement>,
                              ) => setQueryReplyDraft(event.target.value)}
                              placeholder="Reply to the scholar or ask for more details."
                            />
                            <Button onClick={() => void handleReplyToQuery()}>
                              <Send className="mr-2 h-4 w-4" />
                              Send reply
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
              </>
            )}

            {activeSection === "students" && (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle>Students</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelectedEmailStudentIds(
                            visibleStudents.map((enrollment) => enrollment.user.id),
                          )
                        }
                        disabled={!selectedProgrammeId || visibleStudents.length === 0}
                      >
                        Select visible
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedEmailStudentIds([])}
                        disabled={selectedEmailStudentIds.length === 0}
                      >
                        Clear selection
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenEmailForSelectedStudents}
                        disabled={selectedEmailRecipients.length === 0}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Proceed to email
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 lg:grid-cols-[280px,1fr]">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={selectedProgrammeId}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                        setSelectedProgrammeId(event.target.value);
                        setStudentSearch("");
                      }}
                    >
                      <option value="">Select a programme</option>
                      {programmes.map((programme) => (
                        <option key={programme.id} value={programme.id}>
                          {programme.title}
                        </option>
                      ))}
                    </select>

                    {selectedProgrammeId && (
                      <Input
                        value={studentSearch}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setStudentSearch(event.target.value)
                        }
                        placeholder="Search scholars by name, email, or batch"
                      />
                    )}
                  </div>

                  {!selectedProgrammeId && (
                    <p className="text-sm text-muted-foreground">
                      Select a programme first to see its scholars.
                    </p>
                  )}

                  {selectedProgrammeId && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {visibleStudents.map((enrollment) => (
                        <button
                          key={enrollment.id}
                          type="button"
                          onClick={() => {
                            setStudentDetailId(enrollment.user.id);
                            setShowStudentDialog(true);
                          }}
                          className="rounded-2xl border border-border p-4 text-left transition hover:border-vahani-blue/40 hover:bg-muted/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedEmailStudentIds.includes(enrollment.user.id)}
                                  onCheckedChange={() => toggleEmailStudent(enrollment.user.id)}
                                  onClick={(event) => event.stopPropagation()}
                                />
                                <p className="font-semibold text-foreground">
                                  {enrollment.user.name}
                                </p>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {enrollment.user.email}
                              </p>
                            </div>
                            <Badge variant="outline">{enrollment.status}</Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>{enrollment.user.batch || "No batch"}</span>
                            <span>
                              Enrolled {formatDate(enrollment.enrolledAt)}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
      <Dialog
        open={showAssignmentDialog}
        onOpenChange={setShowAssignmentDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add assignment</DialogTitle>
            <DialogDescription>
              Create a new assignment for the selected programme.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={assignmentForm.title}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
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
                  {[
                    "document",
                    "audio",
                    "video",
                    "quiz",
                    "archive",
                    "link_submission",
                  ].map((type) => (
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
                    setAssignmentForm((current) => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max score</Label>
                <Input
                  type="number"
                  min="0"
                  value={assignmentForm.maxScore}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      maxScore: event.target.value,
                    }))
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
                  setAssignmentForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Assignment setup</p>
              <p className="mt-2">
                Type:{" "}
                <span className="font-medium text-foreground">
                  {assignmentForm.assignmentType}
                </span>
              </p>
              <p className="mt-1">
                Scholars will upload files for this assignment. Interactive
                sessions are scheduled separately and use attendance instead of
                uploads.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignmentDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleCreateAssignment()}>
              Publish assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule interactive session</DialogTitle>
            <DialogDescription>
              Set the live session details. Scholars will see this in their
              calendar, and you can later mark both attendance and session marks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
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
                <Label>Scheduled date and time</Label>
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
                <Label>Duration in minutes</Label>
                <Input
                  type="number"
                  min="15"
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
                    setSessionForm((current) => ({
                      ...current,
                      maxScore: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Meeting URL</Label>
                <Input
                  value={sessionForm.meetingUrl}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setSessionForm((current) => ({
                      ...current,
                      meetingUrl: event.target.value,
                    }))
                  }
                />
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSessionDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleCreateInteractiveSession()}>
              Schedule session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResourceDialog} onOpenChange={setShowResourceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add resource material</DialogTitle>
            <DialogDescription>
              Publish a study material by URL or upload a file to storage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={resourceForm.title}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setResourceForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={resourceForm.url}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setResourceForm((current) => ({
                    ...current,
                    url: event.target.value,
                  }))
                }
                placeholder="Paste a public resource link if you are not uploading a file"
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
              <Label>Upload file</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.mp3,.wav,.mp4,.mov,.zip"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setResourceForm((current) => ({
                    ...current,
                    file: event.target.files?.[0] || null,
                  }))
                }
              />
              {resourceForm.file && (
                <p className="text-xs text-muted-foreground">
                  Selected file: {resourceForm.file.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResourceDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleAddResource()}>
              Add resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add online meeting</DialogTitle>
            <DialogDescription>
              Publish a class session link for scholars.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={meetingForm.title}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setMeetingForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={meetingForm.url}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setMeetingForm((current) => ({
                    ...current,
                    url: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMeetingDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleAddMeeting()}>Add meeting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAttendanceDialog}
        onOpenChange={setShowAttendanceDialog}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAttendanceSession?.title || "Mark attendance"}
            </DialogTitle>
            <DialogDescription>
              All scholars start as present. Mark absentees, adjust their session marks, and save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {selectedAttendanceSession?.title || "Interactive session"}
              </p>
              <p className="mt-1">
                {formatDateTime(selectedAttendanceSession?.scheduledAt)}
              </p>
              <p className="mt-1">
                Max marks {selectedAttendanceSession?.maxScore ?? 0}
              </p>
            </div>
            <div className="space-y-3">
              {(selectedProgramme?.enrollments || []).map((enrollment) => (
                <div
                  key={enrollment.user.id}
                  className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[1fr_160px_140px] sm:items-center"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {enrollment.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {enrollment.user.email}
                      {enrollment.user.batch
                        ? ` • ${enrollment.user.batch}`
                        : ""}
                    </p>
                  </div>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={attendanceDrafts[enrollment.user.id] || "present"}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      {
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
                              : current[enrollment.user.id] || String(selectedAttendanceSession?.maxScore ?? 0),
                        }));
                      }
                    }
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
                        : attendanceScoreDrafts[enrollment.user.id] || String(selectedAttendanceSession?.maxScore ?? 0)
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAttendanceDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSaveAttendance()}>
              Update attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAnnouncementDialog}
        onOpenChange={setShowAnnouncementDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send announcement</DialogTitle>
            <DialogDescription>
              Choose a programme and send an update to scholars.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Programme</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={announcementForm.programmeId || selectedProgrammeId}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    programmeId: event.target.value,
                  }))
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
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={announcementForm.title}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={5}
                value={announcementForm.message}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAnnouncementDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSendAnnouncement()}>
              Send announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmailComposerDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        recipients={emailRecipients}
        recipientLabel={emailRecipientLabel}
        sending={sendingEmail}
        onSend={handleSendManagerEmail}
      />

      <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
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
    </div>
  );
}
