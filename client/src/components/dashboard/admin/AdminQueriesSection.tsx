import type { ChangeEvent } from "react";
import { MessageSquareText, Pin, PinOff, Send } from "lucide-react";
import { type QueryStatus, type SupportQuery } from "@/api/queries";
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
import { formatDateTime } from "@/lib/dateFormat";
import { queryStatusLabels, type QueryTimeRangeFilter } from "@/lib/queryFilters";

interface AdminQueriesSectionProps {
  querySearch: string;
  onQuerySearchChange: (value: string) => void;
  queryBatchFilter: string;
  onQueryBatchFilterChange: (value: string) => void;
  scholarBatches: string[];
  queryTimeRangeFilter: QueryTimeRangeFilter;
  onQueryTimeRangeFilterChange: (value: QueryTimeRangeFilter) => void;
  queryStatusFilter: "all" | QueryStatus;
  onQueryStatusFilterChange: (value: "all" | QueryStatus) => void;
  queries: SupportQuery[];
  filteredQueries: SupportQuery[];
  selectedQuery: SupportQuery | null;
  selectedQueryDetail: SupportQuery | null;
  onSelectQuery: (queryId: string) => void;
  pinnedQueryIds: string[];
  onTogglePinnedQuery: (queryId: string) => void;
  isQueryListCollapsed: boolean;
  onSetQueryListCollapsed: (collapsed: boolean) => void;
  onToggleQueryListCollapsed: () => void;
  currentUserId?: string;
  queryStatusDraft: QueryStatus;
  onQueryStatusDraftChange: (value: QueryStatus) => void;
  onUpdateQueryStatus: () => void;
  queryReplyDraft: string;
  onQueryReplyDraftChange: (value: string) => void;
  onReplyToQuery: () => void;
}

export function AdminQueriesSection({
  querySearch,
  onQuerySearchChange,
  queryBatchFilter,
  onQueryBatchFilterChange,
  scholarBatches,
  queryTimeRangeFilter,
  onQueryTimeRangeFilterChange,
  queryStatusFilter,
  onQueryStatusFilterChange,
  queries,
  filteredQueries,
  selectedQuery,
  selectedQueryDetail,
  onSelectQuery,
  pinnedQueryIds,
  onTogglePinnedQuery,
  isQueryListCollapsed,
  onSetQueryListCollapsed,
  onToggleQueryListCollapsed,
  currentUserId,
  queryStatusDraft,
  onQueryStatusDraftChange,
  onUpdateQueryStatus,
  queryReplyDraft,
  onQueryReplyDraftChange,
  onReplyToQuery,
}: AdminQueriesSectionProps) {
  return (
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
                onChange={(event: ChangeEvent<HTMLInputElement>) => onQuerySearchChange(event.target.value)}
                placeholder="Search by subject, scholar, programme, or content"
                className="pl-9"
              />
            </div>
            <Select value={queryBatchFilter} onValueChange={onQueryBatchFilterChange}>
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
              onValueChange={(value: QueryTimeRangeFilter) => onQueryTimeRangeFilterChange(value)}
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
              onValueChange={(value: "all" | QueryStatus) => onQueryStatusFilterChange(value)}
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
                  onClick={() => onSetQueryListCollapsed(true)}
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
                    onClick={() => onSelectQuery(query.id)}
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
                          onTogglePinnedQuery(query.id);
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
                onClick={onToggleQueryListCollapsed}
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
                    const mine = message.author.id === currentUserId;
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
                    <Select value={queryStatusDraft} onValueChange={(value: QueryStatus) => onQueryStatusDraftChange(value)}>
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
                    <Button variant="outline" className="w-full" onClick={() => void onUpdateQueryStatus()}>
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
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onQueryReplyDraftChange(event.target.value)}
                      placeholder="Reply to the scholar or request more context."
                    />
                    <Button className="bg-vahani-blue hover:bg-vahani-blue/90" onClick={() => void onReplyToQuery()}>
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
