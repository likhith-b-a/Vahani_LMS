import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquareText, Pin, PinOff, Search, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSupportQueries } from "@/contexts/SupportQueriesContext";
import { useToast } from "@/hooks/use-toast";
import {
  getSupportQueryDetail,
  replyToSupportQuery,
  updateSupportQueryStatus,
  type QueryStatus,
  type SupportQuery,
  type SupportQueryMessage,
} from "@/api/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type QueryTimeRangeFilter = "all" | "7d" | "30d" | "90d";

interface QueriesSectionContainerProps {
  batchOptions?: string[];
  deriveBatchOptionsFromQueries?: boolean;
  listTitle: string;
  emptyListMessage: string;
  emptyThreadMessage: string;
  replyPlaceholder: string;
  pinnedStorageKey: string;
  replyRequiredTitle?: string;
  replyRequiredDescription?: string;
  replySuccessTitle?: string;
  replySuccessDescription?: string;
  replyErrorTitle: string;
  updateSuccessTitle?: string;
  updateSuccessDescription?: string;
  updateErrorTitle: string;
}

const queryStatusLabels: Record<QueryStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
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

export function QueriesSectionContainer({
  batchOptions = [],
  deriveBatchOptionsFromQueries = false,
  listTitle,
  emptyListMessage,
  emptyThreadMessage,
  replyPlaceholder,
  pinnedStorageKey,
  replyRequiredTitle,
  replyRequiredDescription,
  replySuccessTitle,
  replySuccessDescription,
  replyErrorTitle,
  updateSuccessTitle,
  updateSuccessDescription,
  updateErrorTitle,
}: QueriesSectionContainerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { queries, loading, reloadQueries } = useSupportQueries();
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

  const resolvedBatchOptions = useMemo(() => {
    if (deriveBatchOptionsFromQueries) {
      return Array.from(
        new Set(
          queries
            .map((query) => query.author.batch)
            .filter((value): value is string => Boolean(value)),
        ),
      );
    }
    return batchOptions;
  }, [batchOptions, deriveBatchOptionsFromQueries, queries]);

  const refreshSelectedQueryDetail = async (queryId: string) => {
    try {
      const response = await getSupportQueryDetail(queryId);
      setSelectedQueryDetail((response?.data?.query as SupportQuery) || null);
    } catch {
      setSelectedQueryDetail(null);
    }
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(pinnedStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setPinnedQueryIds(parsed.filter((item): item is string => typeof item === "string"));
      }
    } catch {
      setPinnedQueryIds([]);
    }
  }, [pinnedStorageKey]);

  useEffect(() => {
    window.localStorage.setItem(pinnedStorageKey, JSON.stringify(pinnedQueryIds));
  }, [pinnedQueryIds, pinnedStorageKey]);

  useEffect(() => {
    setSelectedQueryId((current) => {
      if (!queries.length) {
        return "";
      }
      if (current && queries.some((query) => query.id === current)) {
        return current;
      }
      return queries[0]?.id || "";
    });
  }, [queries]);

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

  const togglePinnedQuery = (queryId: string) => {
    setPinnedQueryIds((current) =>
      current.includes(queryId)
        ? current.filter((item) => item !== queryId)
        : [queryId, ...current],
    );
  };

  const handleReplyToQuery = async () => {
    if (!selectedQuery || !queryReplyDraft.trim()) {
      if (replyRequiredTitle) {
        toast({
          title: replyRequiredTitle,
          description: replyRequiredDescription,
          variant: "destructive",
        });
      }
      return;
    }

    try {
      await replyToSupportQuery(selectedQuery.id, queryReplyDraft.trim());
      setQueryReplyDraft("");
      await reloadQueries(selectedQuery.id);
      await refreshSelectedQueryDetail(selectedQuery.id);
      if (replySuccessTitle) {
        toast({
          title: replySuccessTitle,
          description: replySuccessDescription,
        });
      }
    } catch (error) {
      toast({
        title: replyErrorTitle,
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateQueryStatus = async () => {
    if (!selectedQuery) return;

    try {
      await updateSupportQueryStatus(selectedQuery.id, queryStatusDraft);
      await reloadQueries(selectedQuery.id);
      await refreshSelectedQueryDetail(selectedQuery.id);
      if (updateSuccessTitle) {
        toast({
          title: updateSuccessTitle,
          description: updateSuccessDescription,
        });
      }
    } catch (error) {
      toast({
        title: updateErrorTitle,
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {loading && queries.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading queries...
        </p>
      )}
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
                onChange={(event) => setQuerySearch(event.target.value)}
                placeholder="Search by subject, scholar, programme, or content"
                className="pl-9"
              />
            </div>
            <Select value={queryBatchFilter} onValueChange={setQueryBatchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {resolvedBatchOptions.map((batch) => (
                  <SelectItem key={batch} value={batch}>
                    {batch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={queryTimeRangeFilter}
              onValueChange={(value: QueryTimeRangeFilter) => setQueryTimeRangeFilter(value)}
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
              onValueChange={(value: "all" | QueryStatus) => setQueryStatusFilter(value)}
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
                <CardTitle>{listTitle}</CardTitle>
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
                  <p className="text-sm text-muted-foreground">{emptyListMessage}</p>
                )}
                {filteredQueries.map((query) => {
                  const isPinned = pinnedQueryIds.includes(query.id);

                  return (
                    <button
                      key={query.id}
                      type="button"
                      onClick={() => setSelectedQueryId(query.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selectedQueryId === query.id
                          ? "border-vahani-blue bg-vahani-blue/5"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{query.subject}</p>
                            {isPinned && <Badge variant="secondary">Pinned</Badge>}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {query.author.name}
                            {query.author.batch ? ` - ${query.author.batch}` : ""}
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
                          {isPinned ? (
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
                onClick={() => setIsQueryListCollapsed((current) => !current)}
              >
                {isQueryListCollapsed ? "Show query list" : "Hide query list"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedQuery ? (
              <p className="text-sm text-muted-foreground">{emptyThreadMessage}</p>
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
                  {(selectedQueryDetail?.messages || []).map((message: SupportQueryMessage) => {
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
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(message.createdAt)}
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-foreground/90">{message.message}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-4 md:grid-cols-[220px,1fr]">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={queryStatusDraft}
                      onValueChange={(value: QueryStatus) => setQueryStatusDraft(value)}
                    >
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
                    <Button variant="outline" className="w-full" onClick={handleUpdateQueryStatus}>
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
                      onChange={(event) => setQueryReplyDraft(event.target.value)}
                      placeholder={replyPlaceholder}
                    />
                    <Button onClick={handleReplyToQuery}>
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
  );
}
