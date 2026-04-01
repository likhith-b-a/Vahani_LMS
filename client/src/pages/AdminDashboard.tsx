import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  BellRing,
  BookOpen,
  Download,
  MessageSquareText,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import vahaniLogo from "@/assets/vahani-logo.png";
import {
  assignScholarsToProgramme,
  bulkCreateAdminUsers,
  createAdminProgramme,
  createAdminUser,
  deleteAdminAssignment,
  deleteAdminProgramme,
  deleteAdminUser,
  downloadAdminUserTemplate,
  getAdminProgrammes,
  getAdminReport,
  getAdminSettings,
  getAdminSummary,
  getAdminUsers,
  removeScholarFromProgramme,
  updateAdminProgramme,
  updateAdminSettings,
  updateAdminUser,
  type AdminProgramme,
  type AdminReportResponse,
  type AdminSettings,
  type AdminSummary,
  type AdminUser,
  type AdminUserRole,
} from "@/api/admin";
import { getAdminWishlist } from "@/api/wishlist";
import { sendRoleBasedEmail, type EmailRecipient } from "@/api/emails";
import {
  createAnnouncement,
  getAnnouncements,
  type Announcement,
} from "@/api/announcements";
import {
  getSupportQueryDetail,
  getSupportQueries,
  replyToSupportQuery,
  updateSupportQueryStatus,
  type QueryStatus,
  type SupportQuery,
} from "@/api/queries";
import { AdminSidebar } from "@/components/dashboard/AdminSidebar";
import { AdminUsersSection } from "@/components/dashboard/admin/AdminUsersSection";
import {
  AdminUserDialog,
  BulkUserImportDialog,
} from "@/components/dashboard/admin/AdminUserDialogs";
import { EmailComposerDialog } from "@/components/dashboard/EmailComposerDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { downloadCsvReport, exportReportAsPdf } from "@/lib/reportExport";

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "scholar" as AdminUserRole,
  batch: "",
  phoneNumber: "",
  creditsEarned: "0",
};

const emptyProgrammeForm = {
  title: "",
  description: "",
  credits: "",
  programmeManagerId: "",
  selfEnrollmentEnabled: false,
  spotlightTitle: "",
  spotlightMessage: "",
};

const emptyAnnouncementForm = {
  title: "",
  message: "",
  programmeId: "",
  targetBatch: "",
  targetRoles: ["scholar"] as string[],
  userIds: [] as string[],
};

const reportLabels = {
  scholar: "Scholar report",
  programme: "Programme report",
  wishlist: "Wishlist report",
} as const;

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

const matchesDateRange = (value: string | null | undefined, from: string, to: string) => {
  if (!value) return !from && !to;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return false;
  if (from && target < new Date(from).getTime()) return false;
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    if (target > toDate.getTime()) return false;
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

const roleLabel = (role: AdminUserRole) =>
  role === "programme_manager"
    ? "Programme manager"
    : role === "admin"
      ? "Admin"
      : "Scholar";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [programmes, setProgrammes] = useState<AdminProgramme[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(
    (location.state as { section?: string } | null)?.section || "overview",
  );

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<AdminUserRole>("scholar");
  const [userBatchFilter, setUserBatchFilter] = useState("all");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isBulkUserDialogOpen, setIsBulkUserDialogOpen] = useState(false);
  const [bulkUserFile, setBulkUserFile] = useState<File | null>(null);
  const [isDownloadingUserTemplate, setIsDownloadingUserTemplate] = useState(false);
  const [isImportingUsers, setIsImportingUsers] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<AdminUser | null>(null);
  const [selectedEmailUserIds, setSelectedEmailUserIds] = useState<string[]>([]);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [programmeSearch, setProgrammeSearch] = useState("");
  const [programmeDateFrom, setProgrammeDateFrom] = useState("");
  const [programmeDateTo, setProgrammeDateTo] = useState("");
  const [editingProgrammeId, setEditingProgrammeId] = useState<string | null>(null);
  const [programmeForm, setProgrammeForm] = useState(emptyProgrammeForm);
  const [isProgrammeDialogOpen, setIsProgrammeDialogOpen] = useState(false);
  const [programmeDialogBatchFilter, setProgrammeDialogBatchFilter] = useState("all");
  const [programmeDialogScholarIds, setProgrammeDialogScholarIds] = useState<string[]>([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [isProgrammeDetailOpen, setIsProgrammeDetailOpen] = useState(false);
  const [selectedScholarIds, setSelectedScholarIds] = useState<string[]>([]);
  const [programmeDetailBatchFilter, setProgrammeDetailBatchFilter] = useState("all");
  const [pendingDeleteProgramme, setPendingDeleteProgramme] =
    useState<AdminProgramme | null>(null);
  const [pendingDeleteAssignmentId, setPendingDeleteAssignmentId] = useState<string | null>(null);

  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [announcementDateFrom, setAnnouncementDateFrom] = useState("");
  const [announcementDateTo, setAnnouncementDateTo] = useState("");
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncementForm);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);

  const [querySearch, setQuerySearch] = useState("");
  const [queryStatusFilter, setQueryStatusFilter] = useState<"all" | QueryStatus>("all");
  const [queryBatchFilter, setQueryBatchFilter] = useState("all");
  const [queryTimeRangeFilter, setQueryTimeRangeFilter] =
    useState<QueryTimeRangeFilter>("all");
  const [selectedQueryId, setSelectedQueryId] = useState("");
  const [selectedQueryDetail, setSelectedQueryDetail] = useState<SupportQuery | null>(null);
  const [queryReplyDraft, setQueryReplyDraft] = useState("");
  const [queryStatusDraft, setQueryStatusDraft] = useState<QueryStatus>("open");
  const [pinnedQueryIds, setPinnedQueryIds] = useState<string[]>([]);
  const [isQueryListCollapsed, setIsQueryListCollapsed] = useState(false);

  const [reportType, setReportType] =
    useState<keyof typeof reportLabels>("scholar");
  const [reportData, setReportData] = useState<AdminReportResponse | null>(null);
  const [reportBatchFilter, setReportBatchFilter] = useState("all");
  const [reportManagerFilter, setReportManagerFilter] = useState("all");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<AdminSettings | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("admin:pinnedQueries");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setPinnedQueryIds(parsed.filter((item): item is string => typeof item === "string"));
      }
    } catch {
      setPinnedQueryIds([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("admin:pinnedQueries", JSON.stringify(pinnedQueryIds));
  }, [pinnedQueryIds]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAdminSummary();
      const nextSummary = response.data as AdminSummary;
      setSummary(nextSummary);
      setSelectedProgrammeId((current) => current || nextSummary.programmes[0]?.id || "");
    } catch (error) {
      toast({
        title: "Failed to load admin dashboard",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadUsers = useCallback(async () => {
    try {
      const response = await getAdminUsers();
      setUsers(Array.isArray(response?.data?.users) ? (response.data.users as AdminUser[]) : []);
    } catch (error) {
      toast({
        title: "Unable to load users",
        description: error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadProgrammes = useCallback(async () => {
    try {
      const response = await getAdminProgrammes();
      const nextProgrammes = Array.isArray(response?.data?.programmes)
        ? (response.data.programmes as AdminProgramme[])
        : [];
      setProgrammes(nextProgrammes);
      setSelectedProgrammeId((current) => current || nextProgrammes[0]?.id || "");
    } catch (error) {
      toast({
        title: "Unable to load programmes",
        description: error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadSettings = useCallback(async () => {
    try {
      const response = await getAdminSettings();
      setSettingsDraft(response.data as AdminSettings);
    } catch (error) {
      toast({
        title: "Unable to load settings",
        description: error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      });
    }
  }, [toast]);

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
        description: error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadQueries = useCallback(async (preferredQueryId?: string) => {
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
        title: "Unable to load support queries",
        description: error instanceof Error ? error.message : "Please try again shortly.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (activeTab === "users") {
      void loadUsers();
    }
    if (activeTab === "programmes") {
      void loadProgrammes();
    }
  }, [activeTab, loadProgrammes, loadUsers]);

  useEffect(() => {
    if (activeTab === "announcements") {
      void loadAnnouncements();
    }
  }, [activeTab, loadAnnouncements]);

  useEffect(() => {
    if (activeTab === "settings" && !settingsDraft) {
      void loadSettings();
    }
  }, [activeTab, loadSettings, settingsDraft]);

  useEffect(() => {
    if (activeTab === "queries") {
      void loadQueries();
    }
  }, [activeTab, loadQueries]);

  useEffect(() => {
    const loadQueryDetail = async () => {
      if (activeTab !== "queries" || !selectedQueryId) {
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
  }, [activeTab, selectedQueryId]);

  const scholars = users.filter((entry) => entry.role === "scholar");
  const programmeManagers = users.filter((entry) => entry.role === "programme_manager");
  const overviewProgrammes = useMemo(() => summary?.programmes ?? [], [summary?.programmes]);

  const scholarBatches = useMemo(
    () =>
      Array.from(
        new Set(
          scholars
            .map((entry) => entry.batch)
            .filter((entry): entry is string => Boolean(entry)),
        ),
      ).sort(),
    [scholars],
  );

  const selectedProgramme =
    programmes.find((programme) => programme.id === selectedProgrammeId) ||
    programmes[0] ||
    null;

  const filteredUsers = useMemo(
    () =>
      users.filter((entry) => {
        const searchTarget =
          `${entry.name} ${entry.email} ${entry.phoneNumber || ""} ${entry.batch || ""}`.toLowerCase();
        const matchesSearch = !userSearch.trim() || searchTarget.includes(userSearch.toLowerCase());
        const matchesRole = entry.role === userRoleFilter;
        const matchesBatch =
          userRoleFilter !== "scholar" ||
          userBatchFilter === "all" ||
          entry.batch === userBatchFilter;
        return matchesSearch && matchesRole && matchesBatch;
      }),
    [userBatchFilter, userRoleFilter, userSearch, users],
  );

  const selectedEmailRecipients = useMemo<EmailRecipient[]>(
    () =>
      users
        .filter((entry) => selectedEmailUserIds.includes(entry.id))
        .map((entry) => ({
          id: entry.id,
          name: entry.name,
          email: entry.email,
        })),
    [selectedEmailUserIds, users],
  );

  const filteredProgrammes = useMemo(
    () =>
      programmes.filter((programme) => {
        const searchTarget =
          `${programme.title} ${programme.description || ""} ${programme.programmeManager?.name || ""}`.toLowerCase();
        const matchesSearch =
          !programmeSearch.trim() || searchTarget.includes(programmeSearch.toLowerCase());
        const matchesTimeline = matchesDateRange(
          programme.createdAt,
          programmeDateFrom,
          programmeDateTo,
        );
        return matchesSearch && matchesTimeline;
      }),
    [programmeDateFrom, programmeDateTo, programmeSearch, programmes],
  );

  const availableScholars = useMemo(
    () =>
      scholars.filter(
        (scholar) =>
          !selectedProgramme?.enrollments.some(
            (enrollment) => enrollment.user.id === scholar.id,
          ),
      ),
    [scholars, selectedProgramme],
  );

  const filteredProgrammeDialogScholars = useMemo(
    () =>
      scholars.filter(
        (scholar) =>
          programmeDialogBatchFilter === "all" || scholar.batch === programmeDialogBatchFilter,
      ),
    [programmeDialogBatchFilter, scholars],
  );

  const filteredAvailableScholars = useMemo(
    () =>
      availableScholars.filter(
        (scholar) =>
          programmeDetailBatchFilter === "all" || scholar.batch === programmeDetailBatchFilter,
      ),
    [availableScholars, programmeDetailBatchFilter],
  );

  const announcementAudienceUsers = useMemo(
    () =>
      users.filter((entry) => {
        const roleMatch =
          announcementForm.targetRoles.length === 0 ||
          announcementForm.targetRoles.includes(entry.role);
        const batchMatch =
          !announcementForm.targetBatch ||
          entry.role !== "scholar" ||
          entry.batch === announcementForm.targetBatch;
        const programmeMatch =
          !announcementForm.programmeId ||
          (entry.role === "scholar" &&
            entry.enrollments.some(
              (enrollment) => enrollment.programme.id === announcementForm.programmeId,
            )) ||
          (entry.role === "programme_manager" &&
            entry.programmes.some((programme) => programme.id === announcementForm.programmeId));
        return roleMatch && batchMatch && programmeMatch;
      }),
    [announcementForm.programmeId, announcementForm.targetBatch, announcementForm.targetRoles, users],
  );

  const filteredAnnouncements = useMemo(
    () =>
      announcements.filter((announcement) => {
        const searchTarget =
          `${announcement.title} ${announcement.message} ${announcement.programme?.title || ""}`.toLowerCase();
        const matchesSearch =
          !announcementSearch.trim() ||
          searchTarget.includes(announcementSearch.toLowerCase());
        const matchesTimeline = matchesDateRange(
          announcement.createdAt,
          announcementDateFrom,
          announcementDateTo,
        );
        return matchesSearch && matchesTimeline;
      }),
    [announcementDateFrom, announcementDateTo, announcementSearch, announcements],
  );

  const filteredQueries = useMemo(() => {
    const nextQueries = queries.filter((query) => {
      const searchTarget =
        `${query.subject} ${query.message} ${query.author.name} ${query.author.email} ${query.programme?.title || ""}`.toLowerCase();
      const matchesSearch = !querySearch.trim() || searchTarget.includes(querySearch.toLowerCase());
      const matchesStatus = queryStatusFilter === "all" || query.status === queryStatusFilter;
      const matchesBatch = queryBatchFilter === "all" || query.author.batch === queryBatchFilter;
      const matchesTimeRange = isWithinTimeRange(
        query.updatedAt || query.createdAt,
        queryTimeRangeFilter,
      );
      return matchesSearch && matchesStatus && matchesBatch && matchesTimeRange;
    });
    return [...nextQueries].sort((left, right) => {
      const leftPinned = pinnedQueryIds.includes(left.id) ? 1 : 0;
      const rightPinned = pinnedQueryIds.includes(right.id) ? 1 : 0;
      if (leftPinned !== rightPinned) return rightPinned - leftPinned;
      return (
        new Date(right.updatedAt || right.createdAt).getTime() -
        new Date(left.updatedAt || left.createdAt).getTime()
      );
    });
  }, [
    pinnedQueryIds,
    queries,
    queryBatchFilter,
    querySearch,
    queryStatusFilter,
    queryTimeRangeFilter,
  ]);

  const selectedQuery =
    selectedQueryDetail ||
    filteredQueries.find((query) => query.id === selectedQueryId) ||
    queries.find((query) => query.id === selectedQueryId) ||
    filteredQueries[0] ||
    null;

  useEffect(() => {
    if (selectedQuery) {
      setQueryStatusDraft(selectedQuery.status);
    }
  }, [selectedQuery]);

  const overviewStats = [
    {
      label: "Total users",
      value: summary?.stats.totalUsers ?? 0,
      hint: `${summary?.stats.scholars ?? 0} scholars, ${summary?.stats.programmeManagers ?? 0} managers`,
      icon: Users,
    },
    {
      label: "Open programmes",
      value: summary?.stats.programmes ?? 0,
      hint: `${summary?.stats.activeEnrollments ?? 0} active enrollments`,
      icon: BookOpen,
    },
    {
      label: "Self-enroll enabled",
      value: programmes.filter((programme) => programme.selfEnrollmentEnabled).length,
      hint: "Programmes open for scholar-choice registration",
      icon: BellRing,
    },
    {
      label: "Open queries",
      value: queries.filter((query) => query.status === "open").length,
      hint: `${announcements.length} announcements sent`,
      icon: MessageSquareText,
    },
  ];

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserForm(emptyUserForm);
  };

  const resetProgrammeForm = () => {
    setEditingProgrammeId(null);
    setProgrammeForm(emptyProgrammeForm);
    setProgrammeDialogBatchFilter("all");
    setProgrammeDialogScholarIds([]);
  };

  const openEditUserDialog = (member: AdminUser) => {
    setEditingUserId(member.id);
    setUserForm({
      name: member.name,
      email: member.email,
      password: "",
      role: member.role,
      batch: member.batch || "",
      phoneNumber: member.phoneNumber || "",
      creditsEarned: String(member.creditsEarned ?? 0),
    });
    setIsUserDialogOpen(true);
  };

  const openEditProgrammeDialog = (programme: AdminProgramme) => {
    setEditingProgrammeId(programme.id);
    setProgrammeForm({
      title: programme.title,
      description: programme.description || "",
      credits:
        programme.credits !== null && programme.credits !== undefined
          ? String(programme.credits)
          : "",
      programmeManagerId: programme.programmeManagerId || "",
      selfEnrollmentEnabled: programme.selfEnrollmentEnabled,
      spotlightTitle: programme.spotlightTitle || "",
      spotlightMessage: programme.spotlightMessage || "",
    });
    setIsProgrammeDialogOpen(true);
  };

  const toggleEmailUser = (userId: string) => {
    setSelectedEmailUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const handleSelectMatchedUsersForEmail = () => {
    setSelectedEmailUserIds(filteredUsers.map((entry) => entry.id));
  };

  const handleSendSelectedUsersEmail = async (payload: {
    subject: string;
    body: string;
    cc: string;
    bcc: string;
    attachments: File[];
  }) => {
    if (!selectedEmailRecipients.length) {
      toast({
        title: "No recipients selected",
        description: "Select at least one user before composing an email.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingEmail(true);
      await sendRoleBasedEmail({
        userIds: selectedEmailRecipients.map((recipient) => recipient.id),
        subject: payload.subject,
        body: payload.body,
        cc: payload.cc,
        bcc: payload.bcc,
        attachments: payload.attachments,
      });
      setIsEmailDialogOpen(false);
      setSelectedEmailUserIds([]);
      toast({
        title: "Email sent",
        description: `Sent to ${selectedEmailRecipients.length} recipient${selectedEmailRecipients.length === 1 ? "" : "s"}.`,
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

  const handleUserSubmit = async () => {
    if (!userForm.name || !userForm.email || (!editingUserId && !userForm.password)) {
      toast({
        title: "Missing user details",
        description: "Name, email, role and password are required for new users.",
        variant: "destructive",
      });
      return;
    }

    try {
      let responseMessage = "The user record has been saved.";
      if (editingUserId) {
        const response = await updateAdminUser(editingUserId, {
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          batch: userForm.role === "scholar" ? userForm.batch : "",
          phoneNumber: userForm.phoneNumber,
          creditsEarned: Number(userForm.creditsEarned || 0),
          ...(userForm.password ? { password: userForm.password } : {}),
        });
        responseMessage = response?.message || responseMessage;
      } else {
        const response = await createAdminUser({
          name: userForm.name,
          email: userForm.email,
          password: userForm.password,
          role: userForm.role,
          batch: userForm.role === "scholar" ? userForm.batch : "",
          phoneNumber: userForm.phoneNumber,
          creditsEarned: Number(userForm.creditsEarned || 0),
        });
        responseMessage = response?.message || responseMessage;
      }
      setIsUserDialogOpen(false);
      resetUserForm();
      await Promise.all([loadSummary(), loadUsers()]);
      toast({
        title: editingUserId ? "User updated" : "User created",
        description: responseMessage,
      });
    } catch (error) {
      toast({
        title: "Unable to save user",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadUserTemplate = async () => {
    try {
      setIsDownloadingUserTemplate(true);
      const templateBlob = await downloadAdminUserTemplate();
      const url = URL.createObjectURL(templateBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "admin-user-import-template.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Unable to download template",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingUserTemplate(false);
    }
  };

  const handleBulkUserImport = async () => {
    if (!bulkUserFile) {
      toast({
        title: "Select a file first",
        description: "Choose the filled template before importing users.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsImportingUsers(true);
      const response = await bulkCreateAdminUsers(bulkUserFile);
      const result = response.data;
      setIsBulkUserDialogOpen(false);
      setBulkUserFile(null);
      await Promise.all([loadSummary(), loadProgrammes()]);
      toast({
        title: "Bulk import completed",
        description:
          `${result.createdCount} user(s) created, ${result.skippedCount} skipped.` +
          (result.emailFailureCount > 0
            ? ` ${result.emailFailureCount} credentials email(s) could not be sent.`
            : ""),
      });
    } catch (error) {
      toast({
        title: "Unable to import users",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImportingUsers(false);
    }
  };

  const handleProgrammeSubmit = async () => {
    if (!programmeForm.title.trim()) {
      toast({
        title: "Programme title required",
        description: "Add a title before saving the programme.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        title: programmeForm.title.trim(),
        description: programmeForm.description.trim(),
        credits: programmeForm.credits !== "" ? Number(programmeForm.credits) : null,
        programmeManagerId: programmeForm.programmeManagerId,
        selfEnrollmentEnabled: programmeForm.selfEnrollmentEnabled,
        spotlightTitle: programmeForm.spotlightTitle.trim(),
        spotlightMessage: programmeForm.spotlightMessage.trim(),
      };
      if (editingProgrammeId) {
        await updateAdminProgramme(editingProgrammeId, payload);
      } else {
        const response = await createAdminProgramme(payload);
        const createdProgramme = response?.data as AdminProgramme | undefined;

        if (createdProgramme?.id && programmeDialogScholarIds.length > 0) {
          await assignScholarsToProgramme(createdProgramme.id, programmeDialogScholarIds);
        }
      }
      setIsProgrammeDialogOpen(false);
      resetProgrammeForm();
      await Promise.all([loadSummary(), loadUsers()]);
      toast({
        title: editingProgrammeId ? "Programme updated" : "Programme created",
        description: "The programme details have been saved.",
      });
    } catch (error) {
      toast({
        title: "Unable to save programme",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!pendingDeleteUser) return;
    try {
      await deleteAdminUser(pendingDeleteUser.id);
      setPendingDeleteUser(null);
      await Promise.all([loadSummary(), loadUsers()]);
      toast({ title: "User deleted", description: "The user has been removed." });
    } catch (error) {
      toast({
        title: "Unable to delete user",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDeleteProgramme = async () => {
    if (!pendingDeleteProgramme) return;
    try {
      await deleteAdminProgramme(pendingDeleteProgramme.id);
      setPendingDeleteProgramme(null);
      await Promise.all([loadSummary(), loadProgrammes()]);
      toast({ title: "Programme deleted", description: "The programme has been removed." });
    } catch (error) {
      toast({
        title: "Unable to delete programme",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConfirmDeleteAssignment = async () => {
    if (!pendingDeleteAssignmentId) return;
    try {
      await deleteAdminAssignment(pendingDeleteAssignmentId);
      setPendingDeleteAssignmentId(null);
      await Promise.all([loadSummary(), loadProgrammes()]);
      toast({ title: "Assignment deleted", description: "The assignment has been removed." });
    } catch (error) {
      toast({
        title: "Unable to delete assignment",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAssignScholars = async () => {
    if (!selectedProgramme || selectedScholarIds.length === 0) return;
    try {
      await assignScholarsToProgramme(selectedProgramme.id, selectedScholarIds);
      setSelectedScholarIds([]);
      setProgrammeDetailBatchFilter("all");
      await Promise.all([loadSummary(), loadProgrammes()]);
      toast({
        title: "Scholars added",
        description: "Selected scholars were enrolled in the programme.",
      });
    } catch (error) {
      toast({
        title: "Unable to add scholars",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveScholar = async (programmeId: string, scholarId: string) => {
    try {
      await removeScholarFromProgramme(programmeId, scholarId);
      await Promise.all([loadSummary(), loadProgrammes()]);
      toast({ title: "Scholar removed", description: "Enrollment was removed." });
    } catch (error) {
      toast({
        title: "Unable to remove scholar",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      toast({
        title: "Announcement details required",
        description: "Fill in the announcement title and message.",
        variant: "destructive",
      });
      return;
    }
    try {
      await createAnnouncement({
        title: announcementForm.title.trim(),
        message: announcementForm.message.trim(),
        programmeId: announcementForm.programmeId || undefined,
        targetBatch: announcementForm.targetBatch || undefined,
        targetRoles: announcementForm.targetRoles,
        userIds: announcementForm.userIds.length ? announcementForm.userIds : undefined,
      });
      setAnnouncementForm(emptyAnnouncementForm);
      setIsAnnouncementDialogOpen(false);
      await loadAnnouncements();
      toast({ title: "Announcement sent", description: "Recipients will see it now." });
    } catch (error) {
      toast({
        title: "Could not send announcement",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReplyToQuery = async () => {
    if (!selectedQuery || !queryReplyDraft.trim()) return;
    try {
      await replyToSupportQuery(selectedQuery.id, queryReplyDraft.trim());
      setQueryReplyDraft("");
      await loadQueries(selectedQuery.id);
    } catch (error) {
      toast({
        title: "Unable to reply",
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
    } catch (error) {
      toast({
        title: "Unable to update query",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReport = async () => {
    if (reportType === "wishlist") {
      await handleGenerateWishlistReport();
      return;
    }

    try {
      const response = await getAdminReport(
        reportType,
        reportType === "scholar"
          ? {
              batch: reportBatchFilter !== "all" ? reportBatchFilter : undefined,
            }
          : reportType === "programme"
            ? {
              from: reportDateFrom || undefined,
              to: reportDateTo || undefined,
              managerId: reportManagerFilter !== "all" ? reportManagerFilter : undefined,
            }
            : undefined,
      );
      setReportData(response.data as AdminReportResponse);
    } catch (error) {
      toast({
        title: "Unable to generate report",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateWishlistReport = async () => {
    try {
      const response = await getAdminWishlist(
        reportBatchFilter !== "all" ? reportBatchFilter : undefined,
      );
      const rows = Array.isArray(response?.data?.rows) ? response.data.rows : [];
      setReportData({
        type: "wishlist",
        generatedAt: new Date().toISOString(),
        rows,
      });
    } catch (error) {
      toast({
        title: "Unable to generate wishlist report",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveSettings = async () => {
    if (!settingsDraft) return;
    try {
      await updateAdminSettings(settingsDraft);
      await loadSummary();
      toast({ title: "Settings saved", description: "Admin settings were updated." });
    } catch (error) {
      toast({
        title: "Unable to save settings",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const togglePinnedQuery = (queryId: string) => {
    setPinnedQueryIds((current) =>
      current.includes(queryId)
        ? current.filter((item) => item !== queryId)
        : [queryId, ...current],
    );
  };

  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-background px-6 py-10 text-sm text-muted-foreground">
        Loading admin dashboard...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar activeSection={activeTab} onSelectSection={setActiveTab} />
      <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 pl-14 sm:px-6 lg:px-8 lg:pl-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card/80 px-5 py-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <img src={vahaniLogo} alt="Vahani" className="h-10 w-10 rounded-xl" />
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Admin Console
                </p>
                <h1 className="text-base font-semibold text-foreground">
                  Platform operations
                </h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </header>

          {activeTab === "overview" && (
            <>
              <section className="mb-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-vahani-blue/10 via-background to-vahani-gold/10">
                <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-vahani-blue">
                      Platform Control
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                      Coordinate users, programmes, announcements, and support from one place
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Manage access, keep programmes organized, review support quickly, and keep
                      communication moving without leaving the admin workspace.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-2xl border border-border bg-card/80 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        Admin
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{user?.name}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card/80 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        Live scope
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        {summary?.stats.programmes ?? overviewProgrammes.length} programmes
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {queries.filter((query) => query.status === "open").length} open support
                        queries
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {overviewStats.map((stat) => (
                  <Card key={stat.label}>
                    <CardContent className="pt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{stat.label}</span>
                        <stat.icon className="h-4 w-4 text-vahani-blue" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.hint}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Programmes overview</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {overviewProgrammes.map((programme) => (
                    <button
                      key={programme.id}
                      type="button"
                      onClick={() => {
                        navigate(`/admin/programmes/${programme.id}`);
                      }}
                      className="rounded-xl border border-border p-4 text-left transition hover:border-vahani-blue/40 hover:bg-muted/40"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{programme.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {programme.programmeManager?.name || "Unassigned manager"}
                          </p>
                        </div>
                        <Badge variant="secondary">{programme.enrollmentsCount} scholars</Badge>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {programme.description || "No programme description added yet."}
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <AdminUsersSection
                userSearch={userSearch}
                onUserSearchChange={setUserSearch}
                userRoleFilter={userRoleFilter}
                onUserRoleFilterChange={(value) => {
                  setUserRoleFilter(value);
                  if (value !== "scholar") setUserBatchFilter("all");
                }}
                userBatchFilter={userBatchFilter}
                onUserBatchFilterChange={setUserBatchFilter}
                scholarBatches={scholarBatches}
                filteredUsers={filteredUsers}
                selectedEmailUserIds={selectedEmailUserIds}
                onToggleEmailUser={toggleEmailUser}
                onSelectMatchedUsersForEmail={handleSelectMatchedUsersForEmail}
                onClearSelectedUsers={() => setSelectedEmailUserIds([])}
                onProceedToEmail={() => setIsEmailDialogOpen(true)}
                onOpenBulkImport={() => {
                  setBulkUserFile(null);
                  setIsBulkUserDialogOpen(true);
                }}
                onOpenCreateUser={() => {
                  resetUserForm();
                  setIsUserDialogOpen(true);
                }}
                onOpenUserDetails={(selectedUser) =>
                  navigate(`/admin/users/${selectedUser.id}`)
                }
                onOpenEditUser={openEditUserDialog}
                onRequestDeleteUser={setPendingDeleteUser}
              />
            </TabsContent>

            <TabsContent value="programmes" className="space-y-6">
              <Card>
                  <CardHeader className="gap-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <CardTitle>Programmes</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Search, filter by timeline, and open a programme to manage scholars and assignments.
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          resetProgrammeForm();
                          setIsProgrammeDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create programme
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={programmeSearch}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => setProgrammeSearch(event.target.value)}
                          placeholder="Search programmes by title, description, or manager"
                          className="pl-9"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input type="date" value={programmeDateFrom} onChange={(event: ChangeEvent<HTMLInputElement>) => setProgrammeDateFrom(event.target.value)} />
                        <Input type="date" value={programmeDateTo} onChange={(event: ChangeEvent<HTMLInputElement>) => setProgrammeDateTo(event.target.value)} />
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                      {filteredProgrammes.map((programme) => (
                        <button
                          key={programme.id}
                          type="button"
                          onClick={() => navigate(`/admin/programmes/${programme.id}`)}
                          className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-[28px] border border-border bg-card text-left transition hover:border-vahani-blue/40 hover:shadow-md"
                        >
                          <div className="h-2 bg-gradient-to-r from-[#11173f] via-[#7a5600] to-[#f5aa00]" />
                          <div className="flex h-full flex-col gap-5 p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xl font-semibold leading-tight text-foreground lg:text-2xl">
                                  {programme.title}
                                </p>
                                <p className="mt-3 line-clamp-3 text-sm leading-7 text-muted-foreground">
                                  {programme.description || "No description added for this programme yet."}
                                </p>
                              </div>
                              <Badge variant={programme.enrollments.some((entry) => entry.status === "completed") ? "default" : "secondary"}>
                                {programme.enrollments.some((entry) => entry.status === "completed")
                                  ? "Completed"
                                  : "Active"}
                              </Badge>
                            </div>

                            <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                              <div className="space-y-3">
                                <p>Handled by: {programme.programmeManager?.name || "Unassigned manager"}</p>
                                <p>{programme.assignments.filter((assignment) => assignment.pendingCount > 0).length} pending</p>
                              </div>
                              <div className="space-y-3">
                                <p>Enrolled {formatDate(programme.createdAt)}</p>
                                <p>
                                  {programme.assignments.some((assignment) => assignment.dueDate && new Date(assignment.dueDate) > new Date())
                                    ? "Upcoming assignment available"
                                    : "No upcoming assignment"}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span>{programme.selfEnrollmentEnabled ? "Self-enrollable" : "Mandatory"}</span>
                              <span>{programme.enrollments.length} scholars</span>
                              <span>{programme.assignments.length} assignments</span>
                              <span>{programme.resources?.length ?? 0} resources</span>
                            </div>

                            <div className="mt-auto grid gap-3 sm:grid-cols-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate(`/admin/programmes/${programme.id}`);
                                }}
                              >
                                View details
                              </Button>
                              <Button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate(`/admin/programmes/${programme.id}`);
                                }}
                                className="bg-amber-500 text-black hover:bg-amber-400"
                              >
                                Continue
                              </Button>
                            </div>

                            <div className="flex justify-between gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditProgrammeDialog(programme);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setPendingDeleteProgramme(programme);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="announcements" className="space-y-6">
              <Card>
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle>Announcements</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Send filtered announcements and review sent messages by time range.
                      </p>
                    </div>
                    <Button onClick={() => setIsAnnouncementDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Send announcement
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 lg:grid-cols-[1.2fr_200px_200px]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={announcementSearch}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setAnnouncementSearch(event.target.value)}
                        placeholder="Search announcements by title, message, or programme"
                        className="pl-9"
                      />
                    </div>
                    <Input type="date" value={announcementDateFrom} onChange={(event: ChangeEvent<HTMLInputElement>) => setAnnouncementDateFrom(event.target.value)} />
                    <Input type="date" value={announcementDateTo} onChange={(event: ChangeEvent<HTMLInputElement>) => setAnnouncementDateTo(event.target.value)} />
                  </div>

                  <div className="space-y-4">
                    {filteredAnnouncements.map((announcement) => (
                      <div key={announcement.id} className="rounded-2xl border border-border p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{announcement.title}</p>
                          <Badge variant="outline">{announcement.programme?.title || "General"}</Badge>
                          <Badge variant="secondary">
                            {announcement.recipients?.length || announcement.recipientCount || 0} recipients
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{announcement.message}</p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{formatDateTime(announcement.createdAt)}</span>
                          {announcement.targetBatch && <span>Batch {announcement.targetBatch}</span>}
                          {announcement.targetRoles?.length ? (
                            <span>Roles: {announcement.targetRoles.join(", ")}</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="queries" className="space-y-6">
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
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={querySearch}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setQuerySearch(event.target.value)}
                        placeholder="Search by subject, scholar, programme, or content"
                        className="pl-9"
                      />
                    </div>
                    <Select
                      value={queryBatchFilter}
                      onValueChange={setQueryBatchFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All batches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All batches</SelectItem>
                        {scholarBatches.map((batch) => (
                          <SelectItem key={batch} value={batch}>
                            {batch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={queryTimeRangeFilter}
                      onValueChange={(value: QueryTimeRangeFilter) =>
                        setQueryTimeRangeFilter(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={queryStatusFilter}
                      onValueChange={(value: "all" | QueryStatus) =>
                        setQueryStatusFilter(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
              </Card>

              <div
                className={`grid gap-6 ${
                  isQueryListCollapsed ? "grid-cols-1" : "xl:grid-cols-[360px,1fr]"
                }`}
              >
                {!isQueryListCollapsed && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle>Admin queries</CardTitle>
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
                      {filteredQueries.map((query) => (
                        <button
                          key={query.id}
                          type="button"
                          onClick={() => setSelectedQueryId(query.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            selectedQuery?.id === query.id
                              ? "border-vahani-blue bg-vahani-blue/5"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-foreground">{query.subject}</p>
                                {pinnedQueryIds.includes(query.id) && <Badge variant="secondary">Pinned</Badge>}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {query.author.name}
                                {query.author.batch ? ` • ${query.author.batch}` : ""}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                togglePinnedQuery(query.id);
                              }}
                            >
                              {pinnedQueryIds.includes(query.id) ? (
                                <PinOff className="h-4 w-4" />
                              ) : (
                                <Pin className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{queryStatusLabels[query.status]}</Badge>
                            {query.programme && <Badge variant="outline">{query.programme.title}</Badge>}
                            <span>{formatDateTime(query.updatedAt || query.createdAt)}</span>
                          </div>
                        </button>
                      ))}
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
                    {!selectedQuery ? (
                      <p className="text-sm text-muted-foreground">Select a query to read the thread and respond.</p>
                    ) : (
                      <>
                        <div className="rounded-2xl border border-border p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold text-foreground">{selectedQuery.subject}</p>
                            <Badge variant="secondary">{queryStatusLabels[selectedQuery.status]}</Badge>
                            {selectedQuery.programme && <Badge variant="outline">{selectedQuery.programme.title}</Badge>}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span>
                              From {selectedQuery.author.name} ({selectedQuery.author.email})
                            </span>
                            {selectedQuery.author.batch && <span>Batch {selectedQuery.author.batch}</span>}
                          </div>
                        </div>

                        <div className="space-y-3">
                          {(selectedQueryDetail?.messages || []).map((message) => {
                            const mine = message.author.id === user?.id;
                            return (
                              <div
                                key={message.id}
                                className={`rounded-2xl border p-4 ${
                                  mine ? "border-vahani-blue/20 bg-vahani-blue/5" : "border-border bg-card"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-foreground">
                                    {mine ? "You" : message.author.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{formatDateTime(message.createdAt)}</p>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-foreground/90">{message.message}</p>
                              </div>
                            );
                          })}
                        </div>

                        <div className="grid gap-4 md:grid-cols-[220px,1fr]">
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={queryStatusDraft} onValueChange={(value: QueryStatus) => setQueryStatusDraft(value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="outline" className="w-full" onClick={() => void handleUpdateQueryStatus()}>
                              Update status
                            </Button>
                          </div>
                          <div className="space-y-3 rounded-2xl border border-border p-4">
                            <div className="flex items-center gap-2">
                              <MessageSquareText className="h-4 w-4 text-vahani-blue" />
                              <p className="text-sm font-semibold text-foreground">Reply</p>
                            </div>
                            <Textarea
                              rows={4}
                              value={queryReplyDraft}
                              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setQueryReplyDraft(event.target.value)}
                              placeholder="Reply to the scholar or request more context."
                            />
                            <Button className="bg-vahani-blue hover:bg-vahani-blue/90" onClick={() => void handleReplyToQuery()}>
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
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Export reports</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 lg:grid-cols-4">
                    <Select value={reportType} onValueChange={(value: keyof typeof reportLabels) => setReportType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(reportLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(reportType === "scholar" || reportType === "wishlist") && (
                      <Select value={reportBatchFilter} onValueChange={setReportBatchFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All batches" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All batches</SelectItem>
                          {scholarBatches.map((batch) => (
                            <SelectItem key={batch} value={batch}>
                              {batch}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {reportType === "programme" && (
                      <>
                        <Input type="date" value={reportDateFrom} onChange={(event: ChangeEvent<HTMLInputElement>) => setReportDateFrom(event.target.value)} />
                        <Input type="date" value={reportDateTo} onChange={(event: ChangeEvent<HTMLInputElement>) => setReportDateTo(event.target.value)} />
                        <Select value={reportManagerFilter} onValueChange={setReportManagerFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All managers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All managers</SelectItem>
                            {programmeManagers.map((manager) => (
                              <SelectItem key={manager.id} value={manager.id}>
                                {manager.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button onClick={() => void (reportType === "wishlist" ? handleGenerateWishlistReport() : handleGenerateReport())}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      {reportType === "wishlist" ? "Generate wishlist report" : "Generate report"}
                    </Button>
                    <Button variant="outline" disabled={!reportData || reportData.rows.length === 0} onClick={() => reportData && downloadCsvReport(reportData, `${reportType}-report`)}>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button variant="outline" disabled={!reportData || reportData.rows.length === 0} onClick={() => reportData && exportReportAsPdf(reportData, reportLabels[reportType], `${reportType}-report`)}>
                      Export PDF
                    </Button>
                  </div>
                  {reportData && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border p-4">
                        <p className="text-sm font-medium text-foreground">{reportLabels[reportType]}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Generated on {formatDateTime(reportData.generatedAt)} with {reportData.rows.length} row(s).
                        </p>
                      </div>
                      {reportData.rows.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-muted/40">
                              <tr>
                                {Object.keys(reportData.rows[0]).map((key) => (
                                  <th key={key} className="px-4 py-3 text-left font-medium text-foreground">
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {reportData.rows.slice(0, 10).map((row, index) => (
                                <tr key={`${reportData.type}-${index}`}>
                                  {Object.keys(reportData.rows[0]).map((key) => (
                                    <td key={key} className="px-4 py-3 text-muted-foreground">
                                      {String(row[key] ?? "")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No rows matched the selected filters.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>System settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {settingsDraft?.featureAccess &&
                      Object.entries(settingsDraft.featureAccess).map(([key, enabled]) => (
                        <div key={key} className="flex items-center justify-between rounded-lg border border-border p-4">
                          <div>
                            <p className="font-medium text-foreground">{key}</p>
                            <p className="text-xs text-muted-foreground">
                              Control whether this capability is available in the platform.
                            </p>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(value) =>
                              setSettingsDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      featureAccess: { ...current.featureAccess, [key]: value },
                                    }
                                  : current,
                              )
                            }
                          />
                        </div>
                      ))}

                    <Button onClick={() => void handleSaveSettings()}>Save settings</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Access summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {settingsDraft?.featureAccess &&
                        Object.entries(settingsDraft.featureAccess).map(([key, enabled]) => (
                          <Badge key={key} variant={enabled ? "default" : "outline"}>
                            {key}
                          </Badge>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <BulkUserImportDialog
        open={isBulkUserDialogOpen}
        onOpenChange={(open) => {
          setIsBulkUserDialogOpen(open);
          if (!open) {
            setBulkUserFile(null);
          }
        }}
        bulkUserFile={bulkUserFile}
        onBulkUserFileChange={setBulkUserFile}
        isDownloadingUserTemplate={isDownloadingUserTemplate}
        isImportingUsers={isImportingUsers}
        onDownloadTemplate={() => void handleDownloadUserTemplate()}
        onImportUsers={() => void handleBulkUserImport()}
      />
      <AdminUserDialog
        open={isUserDialogOpen}
        onOpenChange={(open) => {
          setIsUserDialogOpen(open);
          if (!open) resetUserForm();
        }}
        editingUserId={editingUserId}
        userForm={userForm}
        onUserFormChange={setUserForm}
        onSubmit={() => void handleUserSubmit()}
      />

      <Dialog
        open={isProgrammeDialogOpen}
        onOpenChange={(open: boolean) => {
          setIsProgrammeDialogOpen(open);
          if (!open) resetProgrammeForm();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProgrammeId ? "Edit programme" : "Create programme"}</DialogTitle>
            <DialogDescription>Add programme details and assign a manager.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Title</Label>
                <Input value={programmeForm.title} onChange={(event: ChangeEvent<HTMLInputElement>) => setProgrammeForm((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={programmeForm.description} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setProgrammeForm((current) => ({ ...current, description: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Credits</Label>
                <Input type="number" min="0" value={programmeForm.credits} onChange={(event: ChangeEvent<HTMLInputElement>) => setProgrammeForm((current) => ({ ...current, credits: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Programme manager</Label>
                <Select value={programmeForm.programmeManagerId || "unassigned"} onValueChange={(value: string) => setProgrammeForm((current) => ({ ...current, programmeManagerId: value === "unassigned" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {programmeManagers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4 sm:col-span-2">
                <div>
                  <p className="font-medium text-foreground">Scholar self-enrollment</p>
                  <p className="text-xs text-muted-foreground">Allow scholars to enroll themselves.</p>
                </div>
                <Switch checked={programmeForm.selfEnrollmentEnabled} onCheckedChange={(value) => setProgrammeForm((current) => ({ ...current, selfEnrollmentEnabled: value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Spotlight title</Label>
                <Input value={programmeForm.spotlightTitle} onChange={(event: ChangeEvent<HTMLInputElement>) => setProgrammeForm((current) => ({ ...current, spotlightTitle: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Spotlight message</Label>
                <Textarea value={programmeForm.spotlightMessage} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setProgrammeForm((current) => ({ ...current, spotlightMessage: event.target.value }))} />
              </div>
            </div>

            {!editingProgrammeId && (
              <div className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">Add scholars while creating</h3>
                    <p className="text-xs text-muted-foreground">
                      Optionally pre-enroll scholars now. You can still add more later.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select value={programmeDialogBatchFilter} onValueChange={setProgrammeDialogBatchFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All batches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All batches</SelectItem>
                        {scholarBatches.map((batch) => (
                          <SelectItem key={batch} value={batch}>
                            {batch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setProgrammeDialogScholarIds(
                          filteredProgrammeDialogScholars.map((scholar) => scholar.id),
                        )
                      }
                      disabled={filteredProgrammeDialogScholars.length === 0}
                    >
                      Select matched
                    </Button>
                  </div>
                </div>

                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {filteredProgrammeDialogScholars.map((scholar) => (
                    <label key={scholar.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <Checkbox
                        checked={programmeDialogScholarIds.includes(scholar.id)}
                        onCheckedChange={() =>
                          setProgrammeDialogScholarIds((current) =>
                            current.includes(scholar.id)
                              ? current.filter((id) => id !== scholar.id)
                              : [...current, scholar.id],
                          )
                        }
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{scholar.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {scholar.email}
                          {scholar.batch ? ` • ${scholar.batch}` : ""}
                        </p>
                      </div>
                    </label>
                  ))}
                  {filteredProgrammeDialogScholars.length === 0 && (
                    <p className="text-sm text-muted-foreground">No scholars match this batch filter.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProgrammeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleProgrammeSubmit()}>
              {editingProgrammeId ? "Update programme" : "Create programme"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isProgrammeDetailOpen} onOpenChange={setIsProgrammeDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedProgramme?.title || "Programme details"}</DialogTitle>
            <DialogDescription>
              Review programme details, published assignments, and enrolled scholars.
            </DialogDescription>
          </DialogHeader>
          {selectedProgramme && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Manager</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {selectedProgramme.programmeManager?.name || "Not assigned"}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Enrolled scholars</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {selectedProgramme.enrollments.length}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Assignments</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {selectedProgramme.assignments.length}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {formatDate(selectedProgramme.createdAt)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">Add scholars</h3>
                    <p className="text-xs text-muted-foreground">
                      Filter by batch to quickly select and enroll large groups.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select value={programmeDetailBatchFilter} onValueChange={setProgrammeDetailBatchFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All batches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All batches</SelectItem>
                        {scholarBatches.map((batch) => (
                          <SelectItem key={batch} value={batch}>
                            {batch}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedScholarIds(filteredAvailableScholars.map((scholar) => scholar.id))
                      }
                      disabled={filteredAvailableScholars.length === 0}
                    >
                      Select matched
                    </Button>
                    <Button size="sm" onClick={() => void handleAssignScholars()} disabled={selectedScholarIds.length === 0}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add scholars
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredAvailableScholars.map((scholar) => (
                    <label key={scholar.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                      <Checkbox
                        checked={selectedScholarIds.includes(scholar.id)}
                        onCheckedChange={() =>
                          setSelectedScholarIds((current) =>
                            current.includes(scholar.id)
                              ? current.filter((id) => id !== scholar.id)
                              : [...current, scholar.id],
                          )
                        }
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{scholar.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{scholar.email}</p>
                      </div>
                    </label>
                  ))}
                  {filteredAvailableScholars.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground sm:col-span-2">
                      No available scholars match this batch filter.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Enrolled scholars</h3>
                {selectedProgramme.enrollments.map((enrollment) => (
                  <div key={enrollment.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-foreground">{enrollment.user.name}</p>
                      <p className="text-xs text-muted-foreground">{enrollment.user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{enrollment.status}</Badge>
                      <Button variant="outline" size="sm" onClick={() => void handleRemoveScholar(selectedProgramme.id, enrollment.user.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Published assignments</h3>
                {selectedProgramme.assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{assignment.title}</p>
                          <Badge variant="secondary">{assignment.assignmentType}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">Due {formatDate(assignment.dueDate)}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{assignment.submissionCount} / {assignment.totalScholars} submitted</span>
                          <span>{assignment.pendingCount} pending</span>
                          <span>{assignment.gradedCount} graded</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setPendingDeleteAssignmentId(assignment.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAnnouncementDialogOpen}
        onOpenChange={(open: boolean) => {
          setIsAnnouncementDialogOpen(open);
          if (!open) setAnnouncementForm(emptyAnnouncementForm);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send announcement</DialogTitle>
            <DialogDescription>Target users by programme, role, batch, or specific people.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Programme filter</Label>
                <Select value={announcementForm.programmeId || "all"} onValueChange={(value: string) => setAnnouncementForm((current) => ({ ...current, programmeId: value === "all" ? "" : value, userIds: [] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All programmes</SelectItem>
                    {programmes.map((programme) => (
                      <SelectItem key={programme.id} value={programme.id}>
                        {programme.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Batch filter</Label>
                <Select value={announcementForm.targetBatch || "all"} onValueChange={(value: string) => setAnnouncementForm((current) => ({ ...current, targetBatch: value === "all" ? "" : value, userIds: [] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All batches</SelectItem>
                    {scholarBatches.map((batch) => (
                      <SelectItem key={batch} value={batch}>
                        {batch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role filters</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {(["scholar", "programme_manager", "admin"] as const).map((role) => (
                  <label key={role} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                    <Checkbox
                      checked={announcementForm.targetRoles.includes(role)}
                      onCheckedChange={() =>
                        setAnnouncementForm((current) => ({
                          ...current,
                          targetRoles: current.targetRoles.includes(role)
                            ? current.targetRoles.filter((item) => item !== role)
                            : [...current.targetRoles, role],
                          userIds: [],
                        }))
                      }
                    />
                    <span>{roleLabel(role)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Specific users</Label>
              <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
                {announcementAudienceUsers.map((member) => (
                  <label key={member.id} className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={announcementForm.userIds.includes(member.id)}
                      onCheckedChange={() =>
                        setAnnouncementForm((current) => ({
                          ...current,
                          userIds: current.userIds.includes(member.id)
                            ? current.userIds.filter((id) => id !== member.id)
                            : [...current.userIds, member.id],
                        }))
                      }
                    />
                    <span>
                      {member.name} • {roleLabel(member.role)}
                      {member.batch ? ` • ${member.batch}` : ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={announcementForm.title} onChange={(event: ChangeEvent<HTMLInputElement>) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea rows={5} value={announcementForm.message} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setAnnouncementForm((current) => ({ ...current, message: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSendAnnouncement()}>Send announcement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmailComposerDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        recipients={selectedEmailRecipients}
        recipientLabel={`${selectedEmailRecipients.length} selected user${selectedEmailRecipients.length === 1 ? "" : "s"}`}
        sending={sendingEmail}
        onSend={handleSendSelectedUsersEmail}
      />

      <AlertDialog open={!!pendingDeleteUser} onOpenChange={(open: boolean) => !open && setPendingDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteUser ? `This will permanently remove ${pendingDeleteUser.name} from the platform.` : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmDeleteUser()}>
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDeleteProgramme} onOpenChange={(open: boolean) => !open && setPendingDeleteProgramme(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete programme?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteProgramme ? `This will permanently remove ${pendingDeleteProgramme.title}.` : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmDeleteProgramme()}>
              Delete programme
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDeleteAssignmentId} onOpenChange={(open: boolean) => !open && setPendingDeleteAssignmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete assignment?</AlertDialogTitle>
            <AlertDialogDescription>This assignment will be removed from the programme.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmDeleteAssignment()}>
              Delete assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
