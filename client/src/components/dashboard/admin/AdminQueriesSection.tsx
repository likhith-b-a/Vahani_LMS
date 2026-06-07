import { QueriesSectionContainer } from "@/components/dashboard/shared/QueriesSectionContainer";

interface AdminQueriesSectionProps {
  scholarBatches?: string[];
}

export function AdminQueriesSection({ scholarBatches }: AdminQueriesSectionProps) {
  return (
    <QueriesSectionContainer
      batchOptions={scholarBatches}
      listTitle="Admin queries"
      emptyListMessage="No queries match the current filters."
      emptyThreadMessage="Select a query to read the thread and respond."
      replyPlaceholder="Reply to the scholar or request more context."
      pinnedStorageKey="admin:pinnedQueries"
      replyErrorTitle="Unable to reply"
      updateErrorTitle="Unable to update query"
    />
  );
}
