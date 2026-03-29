import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  Filter,
  LifeBuoy,
  MessageSquareText,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { AppSidebar } from "../components/dashboard/AppSidebar";
import { TopNavbar } from "../components/dashboard/TopNavbar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import {
  createSupportQuery,
  getMyQueries,
  getSupportQueryDetail,
  replyToSupportQuery,
  type QueryStatus,
  type QueryTargetType,
  type SupportQuery,
} from "../api/queries";

const statusTone: Record<QueryStatus, string> = {
  open: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  resolved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  closed: "bg-slate-500/10 text-slate-700 border-slate-500/20",
};

const statusLabel: Record<QueryStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

type RecipientFilter = "all" | QueryTargetType;
type TimeRangeFilter = "all" | "7d" | "30d" | "90d";

const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not available";

const getRecipientLabel = (query: Pick<SupportQuery, "targetType">) =>
  query.targetType === "admin" ? "Admin" : "Programme Manager";

const isWithinTimeRange = (value: string, timeRange: TimeRangeFilter) => {
  if (timeRange === "all") {
    return true;
  }

  const date = new Date(value).getTime();
  if (Number.isNaN(date)) {
    return false;
  }

  const dayMap: Record<Exclude<TimeRangeFilter, "all">, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };

  const diff = Date.now() - date;
  return diff <= dayMap[timeRange] * 24 * 60 * 60 * 1000;
};

export default function Queries() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQueryId, setSelectedQueryId] = useState("");
  const [selectedQueryDetail, setSelectedQueryDetail] = useState<SupportQuery | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | QueryStatus>("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>("all");
  const [createForm, setCreateForm] = useState({
    targetType: "programme_manager" as QueryTargetType,
    programmeId: "",
    subject: "",
    message: "",
  });
  const [replyDraft, setReplyDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const [replying, setReplying] = useState(false);
  const [isQueryListCollapsed, setIsQueryListCollapsed] = useState(false);

  const loadQueries = useCallback(
    async (preferredId?: string) => {
      try {
        setLoading(true);
        const response = await getMyQueries();
        const nextQueries = Array.isArray(response?.data?.queries)
          ? (response.data.queries as SupportQuery[])
          : [];
        setQueries(nextQueries);
        setSelectedQueryDetail(null);
        setSelectedQueryId((current) => preferredId || current || nextQueries[0]?.id || "");
      } catch (error) {
        toast({
          title: "Unable to load queries",
          description: error instanceof Error ? error.message : "Please try again shortly.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    void loadQueries();
  }, [loadQueries]);

  useEffect(() => {
    const loadQueryDetail = async () => {
      if (!selectedQueryId) {
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
  }, [selectedQueryId]);

  const activeProgrammes = useMemo(
    () => (user?.enrollments || []).filter((programme) => programme.status !== "dropped"),
    [user?.enrollments],
  );

  const filteredQueries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return queries.filter((query) => {
      const searchTarget = [
        query.subject,
        query.message,
        query.programme?.title || "",
        query.assignedTo?.name || "",
        getRecipientLabel(query),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || searchTarget.includes(normalizedSearch);
      const matchesRecipient =
        recipientFilter === "all" || query.targetType === recipientFilter;
      const matchesStatus = statusFilter === "all" || query.status === statusFilter;
      const matchesTimeRange = isWithinTimeRange(
        query.updatedAt || query.createdAt,
        timeRangeFilter,
      );

      return matchesSearch && matchesRecipient && matchesStatus && matchesTimeRange;
    });
  }, [queries, recipientFilter, searchTerm, statusFilter, timeRangeFilter]);

  useEffect(() => {
    if (!filteredQueries.length) {
      return;
    }

    const selectedStillVisible = filteredQueries.some((query) => query.id === selectedQueryId);
    if (!selectedQueryId || !selectedStillVisible) {
      setSelectedQueryId(filteredQueries[0].id);
    }
  }, [filteredQueries, selectedQueryId]);

  const selectedQuery = useMemo(
    () =>
      selectedQueryDetail ||
      filteredQueries.find((query) => query.id === selectedQueryId) ||
      queries.find((query) => query.id === selectedQueryId) ||
      filteredQueries[0] ||
      queries[0] ||
      null,
    [filteredQueries, queries, selectedQueryDetail, selectedQueryId],
  );

  const handleCreateQuery = async () => {
    if (!createForm.subject.trim() || !createForm.message.trim()) {
      toast({
        title: "Missing query details",
        description: "Subject and message are required.",
        variant: "destructive",
      });
      return;
    }

    if (createForm.targetType === "programme_manager" && !createForm.programmeId) {
      toast({
        title: "Choose a programme",
        description: "Programme manager queries must be tied to one of your programmes.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const response = await createSupportQuery({
        targetType: createForm.targetType,
        programmeId:
          createForm.targetType === "programme_manager"
            ? createForm.programmeId
            : undefined,
        subject: createForm.subject.trim(),
        message: createForm.message.trim(),
      });

      toast({
        title: "Query submitted",
        description: "Your message has been shared successfully.",
      });

      setCreateForm({
        targetType: "programme_manager",
        programmeId: "",
        subject: "",
        message: "",
      });
      setIsCreateDialogOpen(false);
      await loadQueries(response?.data?.id);
    } catch (error) {
      toast({
        title: "Could not create query",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async () => {
    if (!selectedQuery || !replyDraft.trim()) {
      return;
    }

    try {
      setReplying(true);
      await replyToSupportQuery(selectedQuery.id, replyDraft.trim());
      setReplyDraft("");
      await loadQueries(selectedQuery.id);
      toast({
        title: "Reply sent",
        description: "Your follow-up has been added to the query thread.",
      });
    } catch (error) {
      toast({
        title: "Could not send reply",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activePage="Queries" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <section className="overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(12,106,204,0.12),rgba(255,140,92,0.08),rgba(255,255,255,0.98))] p-6 shadow-sm sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-vahani-blue">
                    Scholar Support
                  </p>
                  <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                    Ask questions and track every reply in one place
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Raise course issues to a programme manager or send platform-level questions to
                    admin. You can search, filter, monitor status, and continue the same thread
                    whenever you need.
                  </p>
                  <div className="mt-6">
                    <Button
                      className="bg-vahani-blue hover:bg-vahani-blue/90"
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Query
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-2xl border border-border bg-card/80 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      Open
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {queries.filter((query) => query.status === "open").length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/80 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      In Progress
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {queries.filter((query) => query.status === "in_progress").length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/80 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      Resolved
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {queries.filter((query) => query.status === "resolved").length}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <Card>
              <CardHeader className="gap-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-vahani-blue" />
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
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search by subject, message, programme, or conversation"
                      className="pl-10"
                    />
                  </div>

                  <Select
                    value={recipientFilter}
                    onValueChange={(value: RecipientFilter) => setRecipientFilter(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sent to" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Sent to anyone</SelectItem>
                      <SelectItem value="programme_manager">Programme Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={timeRangeFilter}
                    onValueChange={(value: TimeRangeFilter) => setTimeRangeFilter(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Time range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All time</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={(value: "all" | QueryStatus) => setStatusFilter(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
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
              <Card className="min-h-[520px]">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Your Queries</CardTitle>
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
                <CardContent className="space-y-3">
                  {loading && (
                    <p className="text-sm text-muted-foreground">Loading your query history...</p>
                  )}

                  {!loading && queries.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center">
                      <CircleAlert className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-3 text-sm font-medium text-foreground">No queries yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Click Add Query to raise your first support request.
                      </p>
                    </div>
                  )}

                  {!loading && queries.length > 0 && filteredQueries.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center">
                      <CircleAlert className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-3 text-sm font-medium text-foreground">
                        No queries match these filters
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Try changing the search text, recipient, time range, or status.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {filteredQueries.map((query) => (
                      <button
                        key={query.id}
                        type="button"
                        onClick={() => setSelectedQueryId(query.id)}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          selectedQuery?.id === query.id
                            ? "border-vahani-blue bg-vahani-blue/5"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{query.subject}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {query.programme?.title || "Platform support"} |{" "}
                              {formatDate(query.createdAt)}
                            </p>
                          </div>
                          <Badge className={statusTone[query.status]}>
                            {statusLabel[query.status]}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{getRecipientLabel(query)}</span>
                          {query.assignedTo && <span>Assigned to {query.assignedTo.name}</span>}
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                          {query.message}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
              )}

              <Card className="min-h-[520px]">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Conversation</CardTitle>
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
                <CardContent className="space-y-5">
                  {!selectedQuery && (
                    <p className="text-sm text-muted-foreground">
                      Select a query to view the full conversation and status.
                    </p>
                  )}

                  {selectedQuery && (
                    <>
                      <div className="rounded-2xl border border-border p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-foreground">
                            {selectedQuery.subject}
                          </h2>
                          <Badge className={statusTone[selectedQuery.status]}>
                            {statusLabel[selectedQuery.status]}
                          </Badge>
                          <Badge variant="outline">{getRecipientLabel(selectedQuery)}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>Created {formatDate(selectedQuery.createdAt)}</span>
                          <span>Updated {formatDate(selectedQuery.updatedAt)}</span>
                          {selectedQuery.programme && <span>{selectedQuery.programme.title}</span>}
                          {selectedQuery.assignedTo && (
                            <span>Assigned to {selectedQuery.assignedTo.name}</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {(selectedQueryDetail?.messages || []).map((message) => {
                          const isScholar = message.author.id === user?.id;

                          return (
                            <div
                              key={message.id}
                              className={`rounded-2xl border p-4 ${
                                isScholar
                                  ? "border-vahani-blue/20 bg-vahani-blue/5"
                                  : "border-border bg-card"
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">
                                  {isScholar ? "You" : message.author.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(message.createdAt)}
                                </p>
                              </div>
                              <p className="mt-3 text-sm leading-6 text-foreground/90">
                                {message.message}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-3 rounded-2xl border border-border p-4">
                        <div className="flex items-center gap-2">
                          <MessageSquareText className="h-4 w-4 text-vahani-blue" />
                          <p className="text-sm font-semibold text-foreground">Add a reply</p>
                        </div>
                        <Textarea
                          rows={4}
                          value={replyDraft}
                          onChange={(event) => setReplyDraft(event.target.value)}
                          placeholder="Add more context, clarify the issue, or respond to the latest update."
                        />
                        <Button
                          onClick={() => void handleReply()}
                          disabled={replying || !replyDraft.trim()}
                          className="bg-vahani-blue hover:bg-vahani-blue/90"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {replying ? "Sending..." : "Send Reply"}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-vahani-blue" />
              Raise a New Query
            </DialogTitle>
            <DialogDescription>
              Choose who the query should go to, then describe your issue clearly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Raise this to</Label>
              <Select
                value={createForm.targetType}
                onValueChange={(value: QueryTargetType) =>
                  setCreateForm((current) => ({
                    ...current,
                    targetType: value,
                    programmeId: value === "admin" ? "" : current.programmeId,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose recipient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="programme_manager">Programme Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createForm.targetType === "programme_manager" && (
              <div className="space-y-2">
                <Label>Programme</Label>
                <Select
                  value={createForm.programmeId}
                  onValueChange={(value) =>
                    setCreateForm((current) => ({
                      ...current,
                      programmeId: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a programme" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProgrammes.map((programme) => (
                      <SelectItem key={programme.id} value={programme.id}>
                        {programme.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={createForm.subject}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    subject: event.target.value,
                  }))
                }
                placeholder="Example: Need help with assignment upload"
              />
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={5}
                value={createForm.message}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                placeholder="Describe your issue clearly so the team can help quickly."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-vahani-blue hover:bg-vahani-blue/90"
              onClick={() => void handleCreateQuery()}
              disabled={creating}
            >
              <Plus className="mr-2 h-4 w-4" />
              {creating ? "Submitting..." : "Submit Query"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
