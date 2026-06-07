import type { SupportQuery } from "@/api/queries";
import { QueriesSectionContainer } from "@/components/dashboard/shared/QueriesSectionContainer";

interface AdminQueriesSectionProps {
  queries: SupportQuery[];
  scholarBatches: string[];
  reloadQueries: (preferredQueryId?: string) => Promise<void>;
}

export function AdminQueriesSection({
  queries,
  scholarBatches,
  reloadQueries,
}: AdminQueriesSectionProps) {
  return (
    <QueriesSectionContainer
      queries={queries}
      batchOptions={scholarBatches}
      listTitle="Admin queries"
      emptyListMessage="No queries match the current filters."
      emptyThreadMessage="Select a query to read the thread and respond."
      replyPlaceholder="Reply to the scholar or request more context."
      pinnedStorageKey="admin:pinnedQueries"
      replyErrorTitle="Unable to reply"
      updateErrorTitle="Unable to update query"
      reloadQueries={reloadQueries}
    />
  );
}
