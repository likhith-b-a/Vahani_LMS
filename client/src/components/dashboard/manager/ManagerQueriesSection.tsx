import type { ChangeEvent } from "react";
import { CircleHelp, MessageSquareText, Pin, PinOff, Send } from "lucide-react";
import { type QueryStatus, type SupportQuery } from "@/api/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/dateFormat";
import { queryStatusLabels, type QueryTimeRangeFilter } from "@/lib/queryFilters";

interface ManagerQueriesSectionProps {
  querySearch: string;
  onQuerySearchChange: (value: string) => void;
  queryBatchFilter: string;
  onQueryBatchFilterChange: (value: string) => void;
  queryBatches: string[];
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

export function ManagerQueriesSection({
  querySearch,
  onQuerySearchChange,
  queryBatchFilter,
  onQueryBatchFilterChange,
  queryBatches,
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
}: ManagerQueriesSectionProps) {
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
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  onQuerySearchChange(event.target.value)
                }
                placeholder="Search by subject, scholar, programme, or content"
                className="pl-4"
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={queryBatchFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                onQueryBatchFilterChange(event.target.value)
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
                onQueryTimeRangeFilterChange(event.target.value as QueryTimeRangeFilter)
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
                onQueryStatusFilterChange(event.target.value as "all" | QueryStatus)
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
                  onClick={() => onSetQueryListCollapsed(true)}
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
                      onClick={() => onSelectQuery(query.id)}
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
                            onTogglePinnedQuery(query.id);
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
                  {(selectedQueryDetail?.messages || []).map((message) => (
                    <div key={message.id} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {message.author.id === currentUserId ? "You" : message.author.name}
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
                        onQueryStatusDraftChange(event.target.value as QueryStatus)
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
                      onClick={() => void onUpdateQueryStatus()}
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
                        onQueryReplyDraftChange(event.target.value)
                      }
                      placeholder="Reply to the scholar or ask for more details."
                    />
                    <Button onClick={() => void onReplyToQuery()}>
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
