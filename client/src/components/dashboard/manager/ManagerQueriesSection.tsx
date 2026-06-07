import { useMemo } from "react";
import type { SupportQuery } from "@/api/queries";
import { QueriesSectionContainer } from "@/components/dashboard/shared/QueriesSectionContainer";

interface ManagerQueriesSectionProps {
  queries: SupportQuery[];
  reloadQueries: (preferredQueryId?: string) => Promise<void>;
}

export function ManagerQueriesSection({
  queries,
  reloadQueries,
}: ManagerQueriesSectionProps) {
  const batchOptions = useMemo(
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

  return (
    <QueriesSectionContainer
      queries={queries}
      batchOptions={batchOptions}
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
      reloadQueries={reloadQueries}
    />
  );
}
