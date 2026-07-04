import { useMemo, useState, type ChangeEvent } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  BellRing,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  MessageSquareText,
} from "lucide-react";
import type { ManagedProgramme, ManagedProgrammeSummary } from "@/api/programmeManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnnouncements } from "@/contexts/AnnouncementsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSupportQueries } from "@/contexts/SupportQueriesContext";

const calendarWeekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const managerCalendarEventStyles = {
  assignment: "bg-[#f97316]",
  interactive_session: "bg-[#2563eb]",
} as const;

type OverviewCalendarEvent = {
  id: string;
  programmeId?: string;
  programmeTitle?: string;
  type: "assignment" | "interactive_session";
  title: string;
  date: string;
  meta: string;
};

interface ManagerOverviewSectionProps {
  programmes: ManagedProgrammeSummary[];
  programmeDetails: ManagedProgramme[];
  loading: boolean;
}

export function ManagerOverviewSection({
  programmes,
  programmeDetails,
  loading,
}: ManagerOverviewSectionProps) {
  const { user } = useAuth();
  const { announcementCount } = useAnnouncements();
  const { activeQueryCount } = useSupportQueries();
  const [overviewProgrammeId, setOverviewProgrammeId] = useState("all");
  const [overviewVisibleMonth, setOverviewVisibleMonth] = useState(() =>
    startOfMonth(new Date()),
  );

  const totalStudents = useMemo(
    () => programmes.reduce((sum, programme) => sum + programme.scholarsCount, 0),
    [programmes],
  );

  const totalResources = useMemo(
    () =>
      programmes.reduce(
        (sum, programme) =>
          sum + (programme.resourcesCount || 0) + (programme.meetingsCount || 0),
        0,
      ),
    [programmes],
  );

  const overviewProgrammeOptions = useMemo(
    () =>
      programmeDetails.map((programme) => ({
        id: programme.id,
        title: programme.title,
      })),
    [programmeDetails],
  );

  const displayOverviewCalendarEvents = useMemo(() => {
    if (!programmeDetails.length) {
      return [] as OverviewCalendarEvent[];
    }

    const programmesToUse =
      overviewProgrammeId === "all"
        ? programmeDetails
        : programmeDetails.filter((programme) => programme.id === overviewProgrammeId);

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
      .sort(
        (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
      );
  }, [overviewProgrammeId, programmeDetails]);

  const overviewMonthEvents = useMemo(
    () =>
      displayOverviewCalendarEvents.filter((event) =>
        isSameMonth(new Date(event.date), overviewVisibleMonth),
      ),
    [displayOverviewCalendarEvents, overviewVisibleMonth],
  );

  const overviewEventsByDay = useMemo(
    () =>
      displayOverviewCalendarEvents.reduce<Record<string, OverviewCalendarEvent[]>>(
        (acc, event) => {
          const key = format(new Date(event.date), "yyyy-MM-dd");
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(event);
          acc[key].sort(
            (first, second) =>
              new Date(first.date).getTime() - new Date(second.date).getTime(),
          );
          return acc;
        },
        {},
      ),
    [displayOverviewCalendarEvents],
  );

  const overviewCalendarWeeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(overviewVisibleMonth), {
      weekStartsOn: 1,
    });
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

  const overviewStats = useMemo(
    () => [
      {
        label: "Managed programmes",
        value: programmes.length,
        hint: "Courses under your care",
        icon: BookOpen,
      },
      {
        label: "Study items",
        value: totalResources,
        hint: "Resources and meetings published",
        icon: BellRing,
      },
      {
        label: "Announcements",
        value: announcementCount,
        hint: "Messages shared with scholars",
        icon: MessageSquareText,
      },
      {
        label: "Open queries",
        value: activeQueryCount,
        hint: "Threads that still need attention",
        icon: CircleHelp,
      },
    ],
    [activeQueryCount, announcementCount, programmes.length, totalResources],
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(12,106,204,0.10),rgba(32,201,151,0.06),rgba(255,255,255,0.98))] p-6 shadow-sm sm:p-8">
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-vahani-blue">
              Platform Control
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              Manage programmes, content, evaluation, and scholar support
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Work one programme at a time and keep assignment, resource, announcement,
              and evaluation workflows tidy.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card/80 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Manager
              </p>
              <p className="mt-2 text-base font-semibold text-foreground">{user?.name}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/80 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Programmes
              </p>
              <p className="mt-2 text-base font-semibold text-foreground">
                {programmes.length}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card/80 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Scholars
              </p>
              <p className="mt-2 text-base font-semibold text-foreground">
                {totalStudents}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-vahani-blue" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {loading ? "..." : stat.value}
              </p>
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Programme calendar</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Assignment deadlines and interactive-session dates across your managed programmes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={overviewProgrammeId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setOverviewProgrammeId(event.target.value)
              }
              className="h-10 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All programmes</option>
              {overviewProgrammeOptions.map((programme) => (
                <option key={programme.id} value={programme.id}>
                  {programme.title}
                </option>
              ))}
            </select>
            {overviewProgrammeId === "all" ? (
              <Badge variant="outline">All programmes</Badge>
            ) : (
              <Badge variant="outline">
                {overviewProgrammeOptions.find(
                  (programme) => programme.id === overviewProgrammeId,
                )?.title || "Selected programme"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {overviewProgrammeOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No managed programmes are available yet.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setOverviewVisibleMonth((current) => addMonths(current, -1))
                    }
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    {format(addMonths(overviewVisibleMonth, -1), "MMMM")}
                  </Button>
                  <div className="min-w-[140px] text-center text-lg font-semibold text-foreground">
                    {format(overviewVisibleMonth, "MMMM yyyy")}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setOverviewVisibleMonth((current) => addMonths(current, 1))
                    }
                  >
                    {format(addMonths(overviewVisibleMonth, 1), "MMMM")}
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border">
                <div className="grid grid-cols-7 border-b border-border bg-muted/40">
                  {calendarWeekdays.map((day) => (
                    <div
                      key={day}
                      className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="divide-y divide-border">
                  {overviewCalendarWeeks.map((week, weekIndex) => (
                    <div
                      key={weekIndex}
                      className="grid grid-cols-7 divide-x divide-border"
                    >
                      {week.map((day) => {
                        const dayKey = format(day, "yyyy-MM-dd");
                        const dayEvents = overviewEventsByDay[dayKey] || [];
                        const isToday = isSameDay(day, new Date());

                        return (
                          <div
                            key={dayKey}
                            className={`min-h-[50px] p-2 sm:min-h-[100px] sm:p-3 ${
                              isSameMonth(day, overviewVisibleMonth)
                                ? "bg-background"
                                : "bg-muted/20"
                            }`}
                          >
                            <div className="mb-2 flex justify-end">
                              <span
                                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                                  isToday
                                    ? "bg-vahani-blue text-white"
                                    : isSameMonth(day, overviewVisibleMonth)
                                      ? "text-foreground"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {format(day, "d")}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {dayEvents.slice(0, 3).map((event) => (
                                <div
                                  key={event.id}
                                  className="flex items-start gap-1.5 text-[11px] leading-4 text-foreground"
                                >
                                  <span
                                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${managerCalendarEventStyles[event.type]}`}
                                  />
                                  <span className="line-clamp-2">{event.title}</span>
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <div className="pl-4 text-[11px] text-muted-foreground">
                                  +{dayEvents.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
                  Assignment deadline
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
                  Interactive session
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">This month at a glance</p>
                {overviewMonthEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No calendar events for this month.
                  </p>
                ) : (
                  overviewMonthEvents.slice(0, 8).map((event) => (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-border p-3"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${managerCalendarEventStyles[event.type]}`}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {event.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{event.meta}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.date), "dd MMM yyyy")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
