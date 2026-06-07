import { QueriesSectionContainer } from "@/components/dashboard/shared/QueriesSectionContainer";

export function ManagerQueriesSection() {
  return (
    <QueriesSectionContainer
      deriveBatchOptionsFromQueries
      listTitle="Scholar queries"
      emptyListMessage="No queries match the current filters."
      emptyThreadMessage="Select a query to open the scholar conversation."
      replyPlaceholder="Reply to the scholar or ask for more details."
      pinnedStorageKey="manager:pinnedQueries"
      replyRequiredTitle="Reply required"
      replyRequiredDescription="Type a response before sending."
      replySuccessTitle="Reply sent"
      replySuccessDescription="The scholar can now see your response."
      replyErrorTitle="Unable to send reply"
      updateSuccessTitle="Query updated"
      updateSuccessDescription="The thread status has been updated."
      updateErrorTitle="Unable to update query"
    />
  );
}
