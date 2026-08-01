import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminQueriesSection } from "@/components/dashboard/admin/AdminQueriesSection";
import { usePinnedQueries } from "@/hooks/usePinnedQueries";
import { useToast } from "@/hooks/use-toast";
import { useAdminQueries, useAdminQueryDetail } from "@/hooks/admin/useAdminQueries";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { type QueryStatus } from "@/api/queries";
import { isWithinTimeRange, type QueryTimeRangeFilter } from "@/lib/queryFilters";

export default function AdminQueriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { queriesQuery, replyToQuery, updateQueryStatus } = useAdminQueries();
  const { usersQuery } = useAdminUsers();
  const { pinnedQueryIds, togglePinnedQuery } = usePinnedQueries("admin:pinnedQueries");

  const queries = queriesQuery.data || [];
  const scholars = (usersQuery.data?.users || []).filter((entry) => entry.role === "scholar");
  const scholarBatches = useMemo(
    () =>
      Array.from(
        new Set(scholars.map((entry) => entry.batch).filter((entry): entry is string => Boolean(entry))),
      ).sort(),
    [scholars],
  );

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

  const { data: selectedQueryDetail } = useAdminQueryDetail(selectedQueryId);

  const filteredQueries = useMemo(() => {
    const nextQueries = queries.filter((query) => {
      const searchTarget =
        `${query.subject} ${query.message} ${query.author.name} ${query.author.email} ${query.programme?.title || ""}`.toLowerCase();
      const matchesSearch = !querySearch.trim() || searchTarget.includes(querySearch.toLowerCase());
      const matchesStatus = queryStatusFilter === "all" || query.status === queryStatusFilter;
      const matchesBatch = queryBatchFilter === "all" || query.author.batch === queryBatchFilter;
      const matchesTimeRange = isWithinTimeRange(query.updatedAt || query.createdAt, queryTimeRangeFilter);
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
  }, [pinnedQueryIds, queries, queryBatchFilter, querySearch, queryStatusFilter, queryTimeRangeFilter]);

  const selectedQuery =
    selectedQueryDetail ||
    filteredQueries.find((query) => query.id === selectedQueryId) ||
    queries.find((query) => query.id === selectedQueryId) ||
    filteredQueries[0] ||
    null;

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
    <AdminQueriesSection
      querySearch={querySearch}
      onQuerySearchChange={setQuerySearch}
      queryBatchFilter={queryBatchFilter}
      onQueryBatchFilterChange={setQueryBatchFilter}
      scholarBatches={scholarBatches}
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
