import { useMemo, useState } from "react";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { ManagerOverviewSection } from "@/components/dashboard/manager/ManagerOverviewSection";
import { useManagerProgrammes, useManagerProgrammeDetails } from "@/hooks/manager/useManagerProgrammes";
import { useManagerAnnouncements } from "@/hooks/manager/useManagerAnnouncements";
import { useManagerQueries } from "@/hooks/manager/useManagerQueries";

export default function ManagerOverviewPage() {
  const { user } = useAuth();
  const { programmesQuery } = useManagerProgrammes();
  const { announcementsQuery } = useManagerAnnouncements();
  const { queriesQuery } = useManagerQueries();

  const programmes = programmesQuery.data || [];
  const announcements = announcementsQuery.data || [];
  const queries = queriesQuery.data || [];

  const [overviewProgrammeId, setOverviewProgrammeId] = useState("all");
  const [overviewVisibleMonth, setOverviewVisibleMonth] = useState(() => startOfMonth(new Date()));

  const overviewProgrammeDetails = useManagerProgrammeDetails(programmes);

  const totalStudents = useMemo(
    () => programmes.reduce((sum, programme) => sum + programme.scholarsCount, 0),
    [programmes],
  );

  const totalResources = useMemo(
    () =>
      programmes.reduce(
        (sum, programme) => sum + (programme.resourcesCount || 0) + (programme.meetingsCount || 0),
        0,
      ),
    [programmes],
  );

  const overviewProgrammeOptions = useMemo(
    () => overviewProgrammeDetails.map((programme) => ({ id: programme.id, title: programme.title })),
    [overviewProgrammeDetails],
  );

  const displayOverviewCalendarEvents = useMemo(() => {
    const programmesToUse =
      overviewProgrammeId === "all"
        ? overviewProgrammeDetails
        : overviewProgrammeDetails.filter((programme) => programme.id === overviewProgrammeId);

    return programmesToUse
      .flatMap((programme) => {
        const assignmentItems = (programme.assignments || [])
          .filter((assignment) => assignment.dueDate)
          .map((assignment) => ({
            id: `assignment:${programme.id}:${assignment.id}`,
            programmeId: programme.id,
            programmeTitle: programme.title,
            type: "assignment" as const,
            title: assignment.title,
            date: assignment.dueDate as string,
            meta:
              assignment.maxScore !== null && assignment.maxScore !== undefined
                ? `${assignment.maxScore} marks`
                : "Due",
          }));

        const sessionItems = (programme.interactiveSessions || []).flatMap((session) =>
          (session.occurrences || []).map((occurrence) => ({
            id: `session:${programme.id}:${session.id}:${occurrence.id}`,
            programmeId: programme.id,
            programmeTitle: programme.title,
            type: "interactive_session" as const,
            title: session.title,
            date: occurrence.scheduledAt,
            meta: session.maxScore > 0 ? `${session.maxScore} marks` : "Attendance only",
          })),
        );

        return [...assignmentItems, ...sessionItems];
      })
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
  }, [overviewProgrammeDetails, overviewProgrammeId]);

  const overviewMonthEvents = useMemo(
    () =>
      displayOverviewCalendarEvents.filter((event) => isSameMonth(new Date(event.date), overviewVisibleMonth)),
    [displayOverviewCalendarEvents, overviewVisibleMonth],
  );

  const overviewEventsByDay = useMemo(
    () =>
      displayOverviewCalendarEvents.reduce<Record<string, typeof displayOverviewCalendarEvents>>(
        (acc, event) => {
          const key = format(new Date(event.date), "yyyy-MM-dd");
          if (!acc[key]) acc[key] = [];
          acc[key].push(event);
          acc[key].sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime());
          return acc;
        },
        {},
      ),
    [displayOverviewCalendarEvents],
  );

  const overviewCalendarWeeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(overviewVisibleMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(overviewVisibleMonth), { weekStartsOn: 1 });
    const weeks: Date[][] = [];
    let cursor = start;

    while (cursor <= end) {
      const week: Date[] = [];
      for (let index = 0; index < 7; index += 1) {
        week.push(cursor);
        cursor = addDays(cursor, 1);
      }
      weeks.push(week);
    }

    return weeks;
  }, [overviewVisibleMonth]);

  return (
    <ManagerOverviewSection
      managerName={user?.name}
      loading={programmesQuery.isLoading}
      programmes={programmes}
      totalStudents={totalStudents}
      totalResources={totalResources}
      announcementsCount={announcements.length}
      queries={queries}
      overviewProgrammeId={overviewProgrammeId}
      onOverviewProgrammeIdChange={setOverviewProgrammeId}
      overviewProgrammeOptions={overviewProgrammeOptions}
      overviewVisibleMonth={overviewVisibleMonth}
      onOverviewVisibleMonthChange={setOverviewVisibleMonth}
      overviewCalendarWeeks={overviewCalendarWeeks}
      overviewEventsByDay={overviewEventsByDay}
      overviewMonthEvents={overviewMonthEvents}
    />
  );
}
