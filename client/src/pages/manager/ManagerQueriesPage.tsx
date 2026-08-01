import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ManagerQueriesSection } from "@/components/dashboard/manager/ManagerQueriesSection";
import { usePinnedQueries } from "@/hooks/usePinnedQueries";
import { useManagerQueries, useManagerQueryDetail } from "@/hooks/manager/useManagerQueries";
import { type QueryStatus } from "@/api/queries";
import { isWithinTimeRange, type QueryTimeRangeFilter } from "@/lib/queryFilters";

export default function ManagerQueriesPage() {
  const { user } = useAuth();
  const { queriesQuery, replyToQuery, updateQueryStatus } = useManagerQueries();
  const { pinnedQueryIds, togglePinnedQuery } = usePinnedQueries("manager:pinnedQueries");

  const queries = queriesQuery.data || [];

  const [querySearch, setQuerySearch] = useState("");
  const [queryStatusFilter, setQueryStatusFilter] = useState<"all" | QueryStatus>("all");
  const [queryBatchFilter, setQueryBatchFilter] = useState("all");
  const [queryTimeRangeFilter, setQueryTimeRangeFilter] = useState<QueryTimeRangeFilter>("all");
  const [selectedQueryId, setSelectedQueryId] = useState("");
  const [queryReplyDraft, setQueryReplyDraft] = useState("");
  const [queryStatusDraft, setQueryStatusDraft] = useState<QueryStatus>("open");
  const [isQueryListCollapsed, setIsQueryListCollapsed] = useState(false);

  useEffect(() => {
    if (!selectedQueryId && queries.length > 0) {
      setSelectedQueryId(queries[0].id);
    }
  }, [queries, selectedQueryId]);

  const { data: selectedQueryDetail } = useManagerQueryDetail(selectedQueryId);

  const queryBatches = useMemo(
    () =>
      Array.from(
        new Set(queries.map((query) => query.author.batch).filter((value): value is string => Boolean(value))),
      ),
    [queries],
  );

  const filteredQueries = useMemo(() => {
    const filtered = queries.filter((query) => {
      const matchesSearch = `${query.subject} ${query.message} ${query.author.name} ${query.author.email} ${query.programme?.title || ""}`
        .toLowerCase()
        .includes(querySearch.toLowerCase());
      const matchesStatus = queryStatusFilter === "all" || query.status === queryStatusFilter;
      const matchesBatch = queryBatchFilter === "all" || query.author.batch === queryBatchFilter;
      const matchesTimeRange = isWithinTimeRange(query.updatedAt || query.createdAt, queryTimeRangeFilter);
      return matchesSearch && matchesStatus && matchesBatch && matchesTimeRange;
    });

    return [...filtered].sort((left, right) => {
      const leftPinned = pinnedQueryIds.includes(left.id);
      const rightPinned = pinnedQueryIds.includes(right.id);
      if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  }, [pinnedQueryIds, queries, queryBatchFilter, querySearch, queryStatusFilter, queryTimeRangeFilter]);

  const selectedQuery = selectedQueryDetail || queries.find((query) => query.id === selectedQueryId) || null;

  useEffect(() => {
    if (selectedQuery) setQueryStatusDraft(selectedQuery.status);
  }, [selectedQuery]);

  const handleReplyToQuery = async () => {
    if (!selectedQuery || !queryReplyDraft.trim()) return;
    try {
      await replyToQuery.mutateAsync({ queryId: selectedQuery.id, message: queryReplyDraft.trim() });
      setQueryReplyDraft("");
    } catch {
      // toast handled by mutation's onError
    }
  };

  const handleUpdateQueryStatus = async () => {
    if (!selectedQuery) return;
    try {
      await updateQueryStatus.mutateAsync({ queryId: selectedQuery.id, status: queryStatusDraft });
    } catch {
      // toast handled by mutation's onError
    }
  };

  return (
    <ManagerQueriesSection
      querySearch={querySearch}
      onQuerySearchChange={setQuerySearch}
      queryBatchFilter={queryBatchFilter}
      onQueryBatchFilterChange={setQueryBatchFilter}
      queryBatches={queryBatches}
      queryTimeRangeFilter={queryTimeRangeFilter}
      onQueryTimeRangeFilterChange={setQueryTimeRangeFilter}
      queryStatusFilter={queryStatusFilter}
      onQueryStatusFilterChange={setQueryStatusFilter}
      queries={queries}
      filteredQueries={filteredQueries}
      selectedQuery={selectedQuery}
      selectedQueryDetail={selectedQueryDetail ?? null}
      onSelectQuery={setSelectedQueryId}
      pinnedQueryIds={pinnedQueryIds}
      onTogglePinnedQuery={togglePinnedQuery}
      isQueryListCollapsed={isQueryListCollapsed}
      onSetQueryListCollapsed={setIsQueryListCollapsed}
      onToggleQueryListCollapsed={() => setIsQueryListCollapsed((current) => !current)}
      currentUserId={user?.id}
      queryStatusDraft={queryStatusDraft}
      onQueryStatusDraftChange={setQueryStatusDraft}
      onUpdateQueryStatus={() => void handleUpdateQueryStatus()}
      queryReplyDraft={queryReplyDraft}
      onQueryReplyDraftChange={setQueryReplyDraft}
      onReplyToQuery={() => void handleReplyToQuery()}
    />
  );
}
