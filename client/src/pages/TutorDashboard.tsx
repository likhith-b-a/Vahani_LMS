import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  Download,
  Mail,
  Plus,
  RefreshCw,
} from "lucide-react";
import { sendRoleBasedEmail, type EmailRecipient } from "@/api/emails";
import {
  addProgrammeMeetingLink,
  addProgrammeResource,
  bulkEvaluateInteractiveSession,
  createProgrammeAssignment,
  createInteractiveSession,
  downloadInteractiveSessionBulkTemplate,
  downloadProgrammeAssignmentBulkTemplate,
  evaluateProgrammeSubmission,
  getManagedAssignmentSubmissions,
  getManagedProgrammeDetail,
  getManagedProgrammes,
  getManagedProgrammeReport,
  markInteractiveSessionAttendance,
  bulkEvaluateProgrammeAssignment,
  type ProgrammeManagerReportResponse,
  type ManagedProgramme,
  type ManagedProgrammeSummary,
  type ManagedSubmission,
} from "@/api/programmeManager";
import {
  getManagerSectionFromPath,
  getManagerSectionRoute,
  ManagerSidebar,
} from "@/components/dashboard/ManagerSidebar";
import { EmailComposerDialog } from "@/components/dashboard/EmailComposerDialog";
import { ManagerEvaluationSection } from "@/components/dashboard/manager/ManagerEvaluationSection";
import { ManagerAnalyticsSection } from "@/components/dashboard/manager/ManagerAnalyticsSection";
import { ManagerAnnouncementsSection } from "@/components/dashboard/manager/ManagerAnnouncementsSection";
import { ManagerOverviewSection } from "@/components/dashboard/manager/ManagerOverviewSection";
import { ManagerProgrammesSection } from "@/components/dashboard/manager/ManagerProgrammesSection";
import { ManagerQueriesSection } from "@/components/dashboard/manager/ManagerQueriesSection";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { AnnouncementsProvider } from "@/contexts/AnnouncementsContext";
import { SupportQueriesProvider } from "@/contexts/SupportQueriesContext";
import { useToast } from "@/hooks/use-toast";
import { downloadCsvReport, exportReportAsPdf, getReportHeaders } from "@/lib/reportExport";
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

const emptySessionForm = {
  title: "",
  description: "",
  scheduledAt: "",
  durationMinutes: "60",
  maxScore: "0",
  meetingUrl: "",
};

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

const getSubmissionPreviewConfig = (fileUrl?: string | null) => {
  if (!fileUrl) {
    return null;
  }

  const normalizedUrl = fileUrl.split("?")[0].toLowerCase();

  if (
    normalizedUrl.endsWith(".pdf") ||
    normalizedUrl.endsWith(".png") ||
    normalizedUrl.endsWith(".jpg") ||
    normalizedUrl.endsWith(".jpeg") ||
    normalizedUrl.endsWith(".gif") ||
    normalizedUrl.endsWith(".webp") ||
    normalizedUrl.endsWith(".txt")
  ) {
    return {
      viewerUrl: fileUrl,
      openUrl: fileUrl,
    };
  }

  if (
    normalizedUrl.endsWith(".doc") ||
    normalizedUrl.endsWith(".docx") ||
    normalizedUrl.endsWith(".ppt") ||
    normalizedUrl.endsWith(".pptx") ||
    normalizedUrl.endsWith(".xls") ||
    normalizedUrl.endsWith(".xlsx")
  ) {
    return {
      viewerUrl: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`,
      openUrl: fileUrl,
    };
  }

  return null;
};

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

export default function TutorDashboard() {
  return (
    <SupportQueriesProvider loadErrorTitle="Unable to load scholar queries">
      <AnnouncementsProvider loadErrorTitle="Unable to load announcements">
        <TutorDashboardPage />
      </AnnouncementsProvider>
    </SupportQueriesProvider>
  );
}

function TutorDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardBasePath = location.pathname.startsWith("/tutor")
    ? "/tutor"
    : "/programme-manager";
  const activeSection = getManagerSectionFromPath(location.pathname, dashboardBasePath);
  const [loading, setLoading] = useState(true);
  const [programmes, setProgrammes] = useState<ManagedProgrammeSummary[]>([]);
  const [selectedProgramme, setSelectedProgramme] = useState<ManagedProgramme | null>(null);

  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");

  const [programmeSearch, setProgrammeSearch] = useState("");
  const [programmeDateFrom, setProgrammeDateFrom] = useState("");
  const [programmeDateTo, setProgrammeDateTo] = useState("");
  const [programmeStatusFilter, setProgrammeStatusFilter] =
    useState<ManagerProgrammeStatusFilter>("all");
  const [reportProgrammeId, setReportProgrammeId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [evaluationSearch, setEvaluationSearch] = useState("");
  const [evaluationFilter, setEvaluationFilter] = useState("all");

  const [submissions, setSubmissions] = useState<ManagedSubmission[]>([]);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});

  const [studentDetailId, setStudentDetailId] = useState<string | null>(null);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    viewerUrl: string;
    openUrl: string;
    title: string;
  } | null>(null);

  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [resourceForm, setResourceForm] = useState(emptyResourceForm);
  const [meetingForm, setMeetingForm] = useState(emptyLinkForm);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [attendanceDrafts, setAttendanceDrafts] = useState<Record<string, "present" | "absent">>({});
  const [attendanceScoreDrafts, setAttendanceScoreDrafts] = useState<Record<string, string>>({});
  const [reportData, setReportData] = useState<ProgrammeManagerReportResponse | null>(null);
  const reportHeaders = useMemo(
    () => (reportData ? getReportHeaders(reportData.rows) : []),
    [reportData],
  );
  const [selectedEmailStudentIds, setSelectedEmailStudentIds] = useState<string[]>([]);
  const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([]);
  const [emailRecipientLabel, setEmailRecipientLabel] = useState("selected scholars");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [bulkEvaluationProcessing, setBulkEvaluationProcessing] = useState(false);
  const [overviewProgrammeDetails, setOverviewProgrammeDetails] = useState<ManagedProgramme[]>([]);

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
        const detailResponses = await Promise.all(
          nextProgrammes.map(async (programme) => {
            const detailResponse = await getManagedProgrammeDetail(programme.id);
            return (detailResponse?.data?.programme as ManagedProgramme) || null;
          }),
        );
        setOverviewProgrammeDetails(
          detailResponses.filter((programme): programme is ManagedProgramme => Boolean(programme)),
        );
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
  const selectedAttendanceSession = useMemo(
    () =>
      selectedProgramme?.interactiveSessions.find(
        (session) => session.id === attendanceSessionId,
      ) || null,
    [attendanceSessionId, selectedProgramme],
  );
  const selectedEvaluationSession =
    selectedInteractiveSessions.find((session) => session.id === selectedSessionKey) || null;
  const [selectedEvaluationOccurrenceId, setSelectedEvaluationOccurrenceId] = useState("");
  const selectedEvaluationOccurrence = useMemo(
    () =>
      selectedEvaluationSession?.occurrences.find(
        (occurrence) => occurrence.id === selectedEvaluationOccurrenceId,
      ) || null,
    [selectedEvaluationOccurrenceId, selectedEvaluationSession],
  );
  const isSelectedEvaluationOccurrenceOpen = useMemo(() => {
    if (!selectedEvaluationOccurrence) {
      return false;
    }

    return new Date(selectedEvaluationOccurrence.scheduledAt).getTime() <= Date.now();
  }, [selectedEvaluationOccurrence]);
  const selectedEvaluationAudience = useMemo(() => {
    if (!selectedProgramme || !selectedEvaluationOccurrence) {
      return [];
    }
    const assignedUserIds = new Set(
      selectedEvaluationOccurrence.assignments.map((assignment) => assignment.userId),
    );
    return selectedProgramme.enrollments.filter(
      (enrollment) => assignedUserIds.has(enrollment.user.id),
    );
  }, [selectedEvaluationOccurrence, selectedProgramme]);

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


  const visibleStudents = selectedProgramme
    ? selectedProgramme.enrollments.filter((enrollment) =>
        `${enrollment.user.name} ${enrollment.user.email} ${enrollment.user.batch || ""} ${enrollment.trackGroup || ""}`
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
    return submissions
      .filter((submission) => {
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
      })
      .map((submission) => {
        const matchingEnrollment = selectedProgramme?.enrollments.find(
          (enrollment) => enrollment.user.id === submission.student.id,
        );

        return {
          ...submission,
          student: {
            ...submission.student,
            batch: matchingEnrollment?.user.batch || submission.student.batch || null,
            trackGroup: matchingEnrollment?.trackGroup || null,
          },
        };
      });
  }, [evaluationFilter, evaluationSearch, submissions]);
  const filteredSessionStudents = useMemo(() => {
    if (!selectedProgramme || !selectedEvaluationSession || !selectedEvaluationOccurrence) {
      return [];
    }

    return selectedEvaluationAudience
      .filter((enrollment) => {
        const matchesSearch =
          !evaluationSearch.trim() ||
          `${enrollment.user.name} ${enrollment.user.email} ${enrollment.user.batch || ""} ${enrollment.trackGroup || ""}`
            .toLowerCase()
            .includes(evaluationSearch.toLowerCase());

        const attendance = selectedEvaluationSession.attendances.find(
          (entry) =>
            entry.userId === enrollment.user.id &&
            entry.interactiveSessionOccurrenceId === selectedEvaluationOccurrence.id,
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
          (entry) =>
            entry.userId === enrollment.user.id &&
            entry.interactiveSessionOccurrenceId === selectedEvaluationOccurrence.id,
        );

        return {
          user: {
            ...enrollment.user,
            trackGroup: enrollment.trackGroup || null,
          },
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
    selectedEvaluationAudience,
    selectedEvaluationOccurrence,
    selectedEvaluationSession,
  ]);

  const pendingAssignmentRecipients = useMemo<EmailRecipient[]>(() => {
    if (!selectedProgramme || selectedAssignmentType !== "assignment" || !selectedAssignmentKey) {
      return [];
    }

    const submittedStudentIds = new Set(submissions.map((submission) => submission.student.id));
    const selectedAssignment = selectedAssignments.find(
      (assignment) => assignment.id === selectedAssignmentKey,
    );
    const eligibleEnrollments =
      selectedProgramme.groupedDeliveryEnabled &&
      selectedAssignment?.targetTrackGroups?.length
        ? selectedProgramme.enrollments.filter(
            (enrollment) =>
              enrollment.trackGroup &&
              selectedAssignment.targetTrackGroups.includes(enrollment.trackGroup),
          )
        : selectedProgramme.enrollments;

    return eligibleEnrollments
      .filter((enrollment) => !submittedStudentIds.has(enrollment.user.id))
      .map((enrollment) => ({
        id: enrollment.user.id,
        name: enrollment.user.name,
        email: enrollment.user.email,
      }));
  }, [
    selectedAssignments,
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
    setSelectedEvaluationOccurrenceId((current) => {
      if (
        current &&
        selectedEvaluationSession?.occurrences.some(
          (occurrence) => occurrence.id === current,
        )
      ) {
        return current;
      }

      return selectedEvaluationSession?.occurrences[0]?.id || "";
    });
  }, [selectedEvaluationSession]);

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
    if (!selectedProgramme || !selectedEvaluationSession || !selectedEvaluationOccurrence) {
      return;
    }

    setAttendanceSessionId(selectedEvaluationSession.id);
    setAttendanceDrafts(
      Object.fromEntries(
        selectedEvaluationAudience.map((enrollment) => {
          const attendance = selectedEvaluationSession.attendances.find(
            (entry) =>
              entry.userId === enrollment.user.id &&
              entry.interactiveSessionOccurrenceId === selectedEvaluationOccurrence.id,
          );
          return [enrollment.user.id, attendance?.status || "present"];
        }),
      ) as Record<string, "present" | "absent">,
    );
    setAttendanceScoreDrafts(
      Object.fromEntries(
        selectedEvaluationAudience.map((enrollment) => {
          const attendance = selectedEvaluationSession.attendances.find(
            (entry) =>
              entry.userId === enrollment.user.id &&
              entry.interactiveSessionOccurrenceId === selectedEvaluationOccurrence.id,
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
  }, [
    selectedEvaluationAudience,
    selectedEvaluationOccurrence,
    selectedEvaluationSession,
    selectedProgramme,
  ]);

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
        maxScore: Number(sessionForm.maxScore || 0),
        occurrences: [
          {
            scheduledAt: sessionForm.scheduledAt,
            durationMinutes: Number(sessionForm.durationMinutes || 60),
            meetingUrl: sessionForm.meetingUrl.trim() || undefined,
            assignedUserIds:
              selectedProgramme?.enrollments.map((enrollment) => enrollment.user.id) || [],
          },
        ],
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

  const handleSaveAttendance = async () => {
    if (!attendanceSessionId || !selectedProgramme || !selectedEvaluationOccurrence) {
      return;
    }

    if (!isSelectedEvaluationOccurrenceOpen) {
      toast({
        title: "Evaluation not open yet",
        description: `You can evaluate this session after ${formatDateTime(
          selectedEvaluationOccurrence.scheduledAt,
        )}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await markInteractiveSessionAttendance(
        attendanceSessionId,
        selectedEvaluationOccurrence.id,
        selectedEvaluationAudience.map((enrollment) => ({
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

  const handleDownloadBulkEvaluationSheet = async () => {
    if (!selectedAssignmentId) {
      toast({
        title: "Select an item first",
        description: "Choose an assignment or interactive session before downloading the sheet.",
        variant: "destructive",
      });
      return;
    }

    if (selectedAssignmentType === "session" && !selectedEvaluationOccurrence) {
      toast({
        title: "Select a session date first",
        description: "Choose which scheduled date you want to evaluate before downloading the sheet.",
        variant: "destructive",
      });
      return;
    }

    if (selectedAssignmentType === "session" && !isSelectedEvaluationOccurrenceOpen) {
      toast({
        title: "Evaluation not open yet",
        description: `This session can be evaluated after ${formatDateTime(
          selectedEvaluationOccurrence?.scheduledAt,
        )}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const blob =
        selectedAssignmentType === "session"
          ? await downloadInteractiveSessionBulkTemplate(
              selectedSessionKey,
              selectedEvaluationOccurrence?.id || "",
            )
          : await downloadProgrammeAssignmentBulkTemplate(selectedAssignmentKey);

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        selectedAssignmentType === "session"
          ? `${selectedEvaluationSession?.title || "interactive-session"}-marks-template.xlsx`
          : `${submissions[0]?.assignment.title || "assignment"}-marks-template.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Unable to download marks sheet",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUploadBulkEvaluationSheet = async (file: File) => {
    if (!selectedAssignmentId || !selectedProgramme) {
      toast({
        title: "Select an item first",
        description: "Choose an assignment or interactive session before uploading marks.",
        variant: "destructive",
      });
      return;
    }

    if (selectedAssignmentType === "session" && !selectedEvaluationOccurrence) {
      toast({
        title: "Select a session date first",
        description: "Choose which scheduled date you want to evaluate before uploading marks.",
        variant: "destructive",
      });
      return;
    }

    if (selectedAssignmentType === "session" && !isSelectedEvaluationOccurrenceOpen) {
      toast({
        title: "Evaluation not open yet",
        description: `This session can be evaluated after ${formatDateTime(
          selectedEvaluationOccurrence?.scheduledAt,
        )}.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setBulkEvaluationProcessing(true);

      if (selectedAssignmentType === "session") {
        await bulkEvaluateInteractiveSession(
          selectedSessionKey,
          selectedEvaluationOccurrence?.id || "",
          file,
        );
        await loadProgrammes(selectedProgramme.id);
        toast({
          title: "Session marks updated",
          description: "The uploaded sheet has been applied to present scholars.",
        });
      } else {
        await bulkEvaluateProgrammeAssignment(selectedAssignmentKey, file);
        await loadSubmissions(selectedProgramme.id, selectedAssignmentKey);
        await loadProgrammes(selectedProgramme.id);
        toast({
          title: "Assignment marks updated",
          description: "The uploaded sheet has been applied to submitted scholars.",
        });
      }
    } catch (error) {
      toast({
        title: "Unable to upload marks sheet",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBulkEvaluationProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <ManagerSidebar
        activeSection={activeSection}
        onSelectSection={(section) => navigate(getManagerSectionRoute(dashboardBasePath, section))}
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
              <ManagerOverviewSection
                programmes={programmes}
                programmeDetails={overviewProgrammeDetails}
                loading={loading}
              />
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
                onClearProgrammeFilters={() => {
                  setProgrammeSearch("");
                  setProgrammeDateFrom("");
                  setProgrammeDateTo("");
                  setProgrammeStatusFilter("all");
                }}
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
                programmeDetails={overviewProgrammeDetails}
              />
            )}

            {activeSection === "announcements" && (
              <ManagerAnnouncementsSection
                programmes={programmes}
                defaultProgrammeId={selectedProgrammeId}
              />
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
                selectedEvaluationOccurrence={selectedEvaluationOccurrence}
                isSelectedEvaluationOccurrenceOpen={isSelectedEvaluationOccurrenceOpen}
                onSelectedEvaluationOccurrenceChange={setSelectedEvaluationOccurrenceId}
                scoreDrafts={scoreDrafts}
                onScoreDraftChange={(submissionId, value) =>
                  setScoreDrafts((current) => ({
                    ...current,
                    [submissionId]: value,
                  }))
                }
                onSaveMarks={(submissionId) => void handleSaveMarks(submissionId)}
                onOpenSubmissionFile={(submission) => {
                  if (
                    submission.assignment.assignmentType === "document" &&
                    submission.fileUrl
                  ) {
                    const previewConfig = getSubmissionPreviewConfig(submission.fileUrl);

                    if (previewConfig) {
                      setPreviewFile({
                        viewerUrl: previewConfig.viewerUrl,
                        openUrl: previewConfig.openUrl,
                        title: `${submission.student.name} | ${submission.assignment.title}`,
                      });
                      return;
                    }
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
                onDownloadBulkSheet={() => void handleDownloadBulkEvaluationSheet()}
                onUploadBulkSheet={(file) => void handleUploadBulkEvaluationSheet(file)}
                bulkProcessing={bulkEvaluationProcessing}
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
                                {reportHeaders.map((key) => (
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
                                  {reportHeaders.map((key) => (
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

            {activeSection === "queries" && <ManagerQueriesSection />}

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
                            (selectedProgramme?.enrollments || []).map(
                              (enrollment) => enrollment.user.id,
                            ),
                          )
                        }
                        disabled={!selectedProgrammeId || (selectedProgramme?.enrollments || []).length === 0}
                      >
                        Select all
                      </Button>
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
                    <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card">
                      <Table className="text-[15px]">
                        <TableHeader className="bg-muted/20">
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="h-14 w-[56px] px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                              Select
                            </TableHead>
                            <TableHead className="h-14 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                              Scholar
                            </TableHead>
                            <TableHead className="h-14 px-6 text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                              Batch
                            </TableHead>
                            {selectedProgramme?.groupedDeliveryEnabled ? (
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
                          {visibleStudents.length === 0 ? (
                            <TableRow className="border-border/80 hover:bg-transparent">
                              <TableCell
                                colSpan={selectedProgramme?.groupedDeliveryEnabled ? 6 : 5}
                                className="px-6 py-6 text-sm text-muted-foreground"
                              >
                                No scholars match the current filter.
                              </TableCell>
                            </TableRow>
                          ) : (
                            visibleStudents.map((enrollment) => (
                              <TableRow
                                key={enrollment.id}
                                className="cursor-pointer border-border/80 hover:bg-muted/20"
                                onClick={() => {
                                  setStudentDetailId(enrollment.user.id);
                                  setShowStudentDialog(true);
                                }}
                              >
                                <TableCell
                                  className="px-6 py-5"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={selectedEmailStudentIds.includes(enrollment.user.id)}
                                    onCheckedChange={() => toggleEmailStudent(enrollment.user.id)}
                                  />
                                </TableCell>
                                <TableCell className="px-6 py-5">
                                  <div>
                                    <p className="text-[15px] font-semibold text-foreground">
                                      {enrollment.user.name}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {enrollment.user.email}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="px-6 py-5 text-[15px] text-muted-foreground">
                                  {enrollment.user.batch || "No batch"}
                                </TableCell>
                                {selectedProgramme?.groupedDeliveryEnabled ? (
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
                            ))
                          )}
                        </TableBody>
                      </Table>
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
    </div>
  );
}
