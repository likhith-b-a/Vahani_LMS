import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  BellRing,
  BookOpen,
  CircleHelp,
  MessageSquareText,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Send,
} from "lucide-react";
import { createAnnouncement, getAnnouncements, type Announcement } from "@/api/announcements";
import {
  addProgrammeMeetingLink,
  addProgrammeResource,
  createProgrammeAssignment,
  evaluateProgrammeSubmission,
  getManagedAssignmentSubmissions,
  getManagedProgrammes,
  type ManagedProgramme,
  type ManagedSubmission,
} from "@/api/programmeManager";
import {
  getSupportQueries,
  replyToSupportQuery,
  updateSupportQueryStatus,
  type QueryStatus,
  type SupportQuery,
} from "@/api/queries";
import { ManagerSidebar } from "@/components/dashboard/ManagerSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const emptyAnnouncementForm = {
  title: "",
  message: "",
  programmeId: "",
};

const queryStatusLabels: Record<QueryStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

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
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [programmes, setProgrammes] = useState<ManagedProgramme[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [queries, setQueries] = useState<SupportQuery[]>([]);

  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("all");
  const [selectedQueryId, setSelectedQueryId] = useState("");

  const [programmeSearch, setProgrammeSearch] = useState("");
  const [programmeDateFrom, setProgrammeDateFrom] = useState("");
  const [programmeDateTo, setProgrammeDateTo] = useState("");
  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [announcementDateFrom, setAnnouncementDateFrom] = useState("");
  const [announcementDateTo, setAnnouncementDateTo] = useState("");
  const [querySearch, setQuerySearch] = useState("");
  const [queryStatusFilter, setQueryStatusFilter] = useState<"all" | QueryStatus>("all");
  const [queryBatchFilter, setQueryBatchFilter] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");

  const [submissions, setSubmissions] = useState<ManagedSubmission[]>([]);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [queryReplyDraft, setQueryReplyDraft] = useState("");
  const [queryStatusDraft, setQueryStatusDraft] = useState<QueryStatus>("open");
  const [pinnedQueryIds, setPinnedQueryIds] = useState<string[]>([]);

  const [programmeDetailId, setProgrammeDetailId] = useState<string | null>(null);
  const [studentDetailId, setStudentDetailId] = useState<string | null>(null);
  const [showProgrammeDialog, setShowProgrammeDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [showStudentDialog, setShowStudentDialog] = useState(false);

  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [resourceForm, setResourceForm] = useState(emptyLinkForm);
  const [meetingForm, setMeetingForm] = useState(emptyLinkForm);
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncementForm);

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

  const loadProgrammes = useCallback(
    async (preferredProgrammeId?: string) => {
      try {
        setLoading(true);
        const response = await getManagedProgrammes();
        const nextProgrammes = Array.isArray(response?.data?.programmes)
          ? (response.data.programmes as ManagedProgramme[])
          : [];
        setProgrammes(nextProgrammes);
        setSelectedProgrammeId((current) => preferredProgrammeId || current || nextProgrammes[0]?.id || "");
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
    [toast],
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
    void Promise.all([loadProgrammes(), loadAnnouncements(), loadQueries()]);
  }, [loadAnnouncements, loadProgrammes, loadQueries]);

  const selectedProgramme =
    programmes.find((programme) => programme.id === selectedProgrammeId) || null;
  const programmeDetail =
    programmes.find((programme) => programme.id === programmeDetailId) || null;
  const selectedAssignments = useMemo(
    () => selectedProgramme?.assignments || [],
    [selectedProgramme],
  );
  const selectedQuery = queries.find((query) => query.id === selectedQueryId) || null;

  const totalStudents = useMemo(
    () =>
      new Set(
        programmes.flatMap((programme) =>
          programme.enrollments.map((enrollment) => enrollment.user.id),
        ),
      ).size,
    [programmes],
  );

  const totalResources = useMemo(
    () =>
      programmes.reduce(
        (sum, programme) =>
          sum + (programme.resources?.length || 0) + (programme.meetingLinks?.length || 0),
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
        return (
          matchesSearch &&
          matchesDateRange(programme.createdAt, programmeDateFrom, programmeDateTo)
        );
      }),
    [programmeDateFrom, programmeDateTo, programmeSearch, programmes],
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
      return matchesSearch && matchesStatus && matchesBatch;
    });

    return [...filtered].sort((left, right) => {
      const leftPinned = pinnedQueryIds.includes(left.id);
      const rightPinned = pinnedQueryIds.includes(right.id);
      if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [pinnedQueryIds, queries, queryBatchFilter, querySearch, queryStatusFilter]);

  const visibleStudents = selectedProgramme
    ? selectedProgramme.enrollments.filter((enrollment) =>
        `${enrollment.user.name} ${enrollment.user.email} ${enrollment.user.batch || ""}`
          .toLowerCase()
          .includes(studentSearch.toLowerCase()),
      )
    : [];

  const selectedStudentDetail =
    selectedProgramme?.enrollments.find(
      (enrollment) => enrollment.user.id === studentDetailId,
    ) || null;

  const filteredSubmissions =
    selectedStudentId === "all"
      ? submissions
      : submissions.filter((submission) => submission.student.id === selectedStudentId);

  useEffect(() => {
    if (!selectedProgrammeId && programmes[0]) {
      setSelectedProgrammeId(programmes[0].id);
    }
  }, [programmes, selectedProgrammeId]);

  useEffect(() => {
    setSelectedAssignmentId((current) => {
      if (!selectedAssignments.length) return "";
      return selectedAssignments.some((assignment) => assignment.id === current)
        ? current
        : selectedAssignments[0].id;
    });
  }, [selectedAssignments]);

  useEffect(() => {
    if (selectedQuery) {
      setQueryStatusDraft(selectedQuery.status);
    }
  }, [selectedQuery]);

  useEffect(() => {
    void loadSubmissions(selectedProgrammeId, selectedAssignmentId);
  }, [loadSubmissions, selectedAssignmentId, selectedProgrammeId]);

  const openProgrammeDialog = (programmeId: string) => {
    setProgrammeDetailId(programmeId);
    setSelectedProgrammeId(programmeId);
    setShowProgrammeDialog(true);
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

  const handleAddResource = async () => {
    if (!selectedProgrammeId || !resourceForm.title.trim() || !resourceForm.url.trim()) {
      toast({
        title: "Resource details required",
        description: "Add both a title and a URL for the study material.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addProgrammeResource(selectedProgrammeId, resourceForm);
      setResourceForm(emptyLinkForm);
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
      await loadSubmissions(selectedProgrammeId, selectedAssignmentId);
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

  return (
    <div className="flex min-h-screen bg-background">
      <ManagerSidebar activeSection={activeSection} onSelectSection={setActiveSection} />

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
          <Button variant="outline" onClick={() => void loadProgrammes(selectedProgrammeId)}>
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
                        Manage programmes, content, evaluation, and scholar support
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Work one programme at a time and keep assignment, resource,
                        announcement, and evaluation workflows tidy.
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
                          query.status !== "closed" && query.status !== "resolved",
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
                        <p className="text-xs text-muted-foreground">{stat.hint}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {activeSection === "programmes" && (
              <Card>
                <CardHeader>
                  <CardTitle>Programmes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
                    <Input
                      value={programmeSearch}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setProgrammeSearch(event.target.value)
                      }
                      placeholder="Search programmes by title or description"
                    />
                    <Input
                      type="date"
                      value={programmeDateFrom}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setProgrammeDateFrom(event.target.value)
                      }
                    />
                    <Input
                      type="date"
                      value={programmeDateTo}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setProgrammeDateTo(event.target.value)
                      }
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredProgrammes.map((programme) => (
                      <button
                        key={programme.id}
                        type="button"
                        onClick={() => openProgrammeDialog(programme.id)}
                        className="rounded-2xl border border-border p-5 text-left transition hover:border-vahani-blue/40 hover:bg-muted/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">
                              {programme.title}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {programme.description || "No description added yet."}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {programme.enrollments.length} scholars
                          </Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{programme.assignments.length} assignments</span>
                          <span>{programme.resources?.length || 0} resources</span>
                          <span>{programme.meetingLinks?.length || 0} meetings</span>
                          <span>Created {formatDate(programme.createdAt)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === "announcements" && (
              <Card>
                <CardHeader className="gap-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle>Announcements</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Send programme updates through a dialog and review the history.
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
                      <div key={announcement.id} className="rounded-xl border border-border p-4">
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
              <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Evaluation Filters</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select programme</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={selectedProgrammeId}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                          setSelectedProgrammeId(event.target.value);
                          setSelectedAssignmentId("");
                          setSelectedStudentId("all");
                        }}
                      >
                        <option value="">Select a programme</option>
                        {programmes.map((programme) => (
                          <option key={programme.id} value={programme.id}>
                            {programme.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedProgrammeId && (
                      <div className="space-y-2">
                        <Label>Select assignment</Label>
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={selectedAssignmentId}
                          onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                            setSelectedAssignmentId(event.target.value);
                            setSelectedStudentId("all");
                          }}
                        >
                          <option value="">Select an assignment</option>
                          {selectedAssignments.map((assignment) => (
                            <option key={assignment.id} value={assignment.id}>
                              {assignment.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedAssignmentId && (
                      <div className="space-y-2">
                        <Label>Select scholar</Label>
                        <select
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={selectedStudentId}
                          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                            setSelectedStudentId(event.target.value)
                          }
                        >
                          <option value="all">All scholars</option>
                          {Array.from(
                            new Map(
                              submissions.map((submission) => [
                                submission.student.id,
                                submission.student,
                              ]),
                            ).values(),
                          ).map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Scholar submissions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!selectedProgrammeId && (
                      <p className="text-sm text-muted-foreground">
                        Choose a programme to begin evaluation.
                      </p>
                    )}
                    {selectedProgrammeId && !selectedAssignmentId && (
                      <p className="text-sm text-muted-foreground">
                        Choose an assignment to load scholar submissions.
                      </p>
                    )}
                    {selectedAssignmentId && filteredSubmissions.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No submissions match the selected filters yet.
                      </p>
                    )}
                    {filteredSubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="space-y-3 rounded-lg border border-border p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {submission.student.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {submission.student.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Submitted {formatDateTime(submission.submittedAt)}
                            </p>
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
                              setScoreDrafts((current) => ({
                                ...current,
                                [submission.id]: event.target.value,
                              }))
                            }
                            className="sm:max-w-[180px]"
                          />
                          <Button onClick={() => void handleSaveMarks(submission.id)}>
                            Save marks
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === "queries" && (
              <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Scholar queries</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      value={querySearch}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setQuerySearch(event.target.value)
                      }
                      placeholder="Search by subject, scholar, programme, or content"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={queryStatusFilter}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                          setQueryStatusFilter(event.target.value as "all" | QueryStatus)
                        }
                      >
                        <option value="all">All statuses</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
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
                    </div>

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
                                  {query.author.batch ? ` - ${query.author.batch}` : ""}
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
                                <Badge variant="secondary">{query.programme.title}</Badge>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Query thread</CardTitle>
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
                              <Badge variant="outline">{selectedQuery.programme.title}</Badge>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            From {selectedQuery.author.name} ({selectedQuery.author.email})
                          </p>
                        </div>

                        <div className="space-y-3">
                          {selectedQuery.messages.map((message) => (
                            <div key={message.id} className="rounded-xl border p-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">
                                  {message.author.id === user?.id ? "You" : message.author.name}
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
                              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                setQueryStatusDraft(event.target.value as QueryStatus)
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
                              <p className="text-sm font-semibold text-foreground">Reply</p>
                            </div>
                            <Textarea
                              rows={4}
                              value={queryReplyDraft}
                              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                                setQueryReplyDraft(event.target.value)
                              }
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
            )}

            {activeSection === "students" && (
              <Card>
                <CardHeader>
                  <CardTitle>Students</CardTitle>
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
                              <p className="font-semibold text-foreground">
                                {enrollment.user.name}
                              </p>
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
      <Dialog open={showProgrammeDialog} onOpenChange={setShowProgrammeDialog}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{programmeDetail?.title || "Programme details"}</DialogTitle>
            <DialogDescription>
              Review this course and publish assignments, resources, and meetings from one place.
            </DialogDescription>
          </DialogHeader>

          {programmeDetail && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Scholars</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {programmeDetail.enrollments.length}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Assignments</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {programmeDetail.assignments.length}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Resources</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {programmeDetail.resources?.length || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Meetings</p>
                  <p className="mt-1 font-semibold text-foreground">
                    {programmeDetail.meetingLinks?.length || 0}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    setSelectedProgrammeId(programmeDetail.id);
                    setShowAssignmentDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add assignment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedProgrammeId(programmeDetail.id);
                    setShowResourceDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Resource material
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedProgrammeId(programmeDetail.id);
                    setShowMeetingDialog(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Online meeting
                </Button>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Assignments</h3>
                  {programmeDetail.assignments.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No assignments published for this programme yet.
                    </p>
                  )}
                  {programmeDetail.assignments.map((assignment) => (
                    <button
                      key={assignment.id}
                      type="button"
                      onClick={() => {
                        setSelectedProgrammeId(programmeDetail.id);
                        setSelectedAssignmentId(assignment.id);
                        setSelectedStudentId("all");
                        setActiveSection("evaluation");
                        setShowProgrammeDialog(false);
                      }}
                      className="w-full rounded-xl border border-border p-4 text-left transition hover:bg-muted/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Due {formatDate(assignment.dueDate)}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {assignment.submissions.length}/{programmeDetail.enrollments.length} submitted
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="space-y-5">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground">Study materials</h3>
                    {(programmeDetail.resources || []).length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No resource materials added yet.
                      </p>
                    )}
                    {(programmeDetail.resources || []).map((resource) => (
                      <div key={resource.id} className="rounded-xl border border-border p-4">
                        <p className="font-medium text-foreground">{resource.title}</p>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block text-sm text-vahani-blue underline-offset-4 hover:underline"
                        >
                          {resource.url}
                        </a>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-foreground">Meeting sessions</h3>
                    {(programmeDetail.meetingLinks || []).length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No online meetings added yet.
                      </p>
                    )}
                    {(programmeDetail.meetingLinks || []).map((meeting) => (
                      <div key={meeting.id} className="rounded-xl border border-border p-4">
                        <p className="font-medium text-foreground">{meeting.title}</p>
                        <a
                          href={meeting.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block text-sm text-vahani-blue underline-offset-4 hover:underline"
                        >
                          {meeting.url}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
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
                  {["document", "audio", "video", "quiz", "archive"].map((type) => (
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateAssignment()}>
              Publish assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showResourceDialog} onOpenChange={setShowResourceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add resource material</DialogTitle>
            <DialogDescription>
              Publish a new study material link for scholars.
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
            <Button variant="outline" onClick={() => setShowMeetingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleAddMeeting()}>Add meeting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
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
            <Button variant="outline" onClick={() => setShowAnnouncementDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSendAnnouncement()}>
              Send announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedStudentDetail?.user.name || "Scholar details"}</DialogTitle>
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
