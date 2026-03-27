import { useEffect, useMemo, useState } from "react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAssignments } from "@/contexts/AssignmentsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMyProgrammes, type Programme } from "@/api/programmes";
import { useToast } from "@/hooks/use-toast";

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  programmeId: string;
  programmeTitle: string;
  type: "assignment" | "interactive_session";
};

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const eventStyles: Record<CalendarEvent["type"], string> = {
  assignment: "bg-[#f97316]",
  interactive_session: "bg-[#2563eb]",
};

export function SmartCalendar() {
  const { toast } = useToast();
  const { assignments, loading } = useAssignments();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("all");
  const [programmes, setProgrammes] = useState<Programme[]>([]);

  useEffect(() => {
    const loadProgrammes = async () => {
      try {
        const response = await getMyProgrammes();
        const nextProgrammes = Array.isArray(response?.data?.programmes)
          ? (response.data.programmes as Programme[])
          : [];
        setProgrammes(nextProgrammes);
      } catch (error) {
        toast({
          title: "Unable to load interactive sessions",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    };

    void loadProgrammes();
  }, [toast]);

  const programmeOptions = useMemo(
    () =>
      Array.from(
        new Map(
          [
            ...assignments.map((assignment) => [
              assignment.programme.id,
              assignment.programme,
            ]),
            ...programmes.map((programme) => [
              programme.id,
              {
                id: programme.id,
                title: programme.title,
              },
            ]),
          ],
        ).values(),
      ),
    [assignments, programmes],
  );

  const calendarEvents = useMemo<CalendarEvent[]>(
    () => [
      ...assignments
        .filter(
          (assignment) =>
            assignment.dueDate && assignment.assignmentType !== "interactive_session",
        )
        .map((assignment) => ({
          id: assignment.id,
          title: assignment.title,
          date: assignment.dueDate,
          programmeId: assignment.programme.id,
          programmeTitle: assignment.programme.title,
          type: "assignment",
        })),
      ...programmes.flatMap((programme) =>
        (programme.interactiveSessions || []).map((session) => ({
          id: session.id,
          title: session.title,
          date: session.scheduledAt,
          programmeId: programme.id,
          programmeTitle: programme.title,
          type: "interactive_session" as const,
        })),
      ),
    ],
    [assignments, programmes],
  );

  const filteredEvents = useMemo(
    () =>
      calendarEvents.filter(
        (event) =>
          selectedProgrammeId === "all" || event.programmeId === selectedProgrammeId,
      ),
    [calendarEvents, selectedProgrammeId],
  );

  const eventsByDay = useMemo(() => {
    return filteredEvents.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
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
    }, {});
  }, [filteredEvents]);

  const monthEvents = useMemo(
    () =>
      filteredEvents.filter((event) =>
        isSameMonth(new Date(event.date), visibleMonth),
      ),
    [filteredEvents, visibleMonth],
  );

  const calendarWeeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });
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
  }, [visibleMonth]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={selectedProgrammeId}
              onChange={(event) => setSelectedProgrammeId(event.target.value)}
              className="h-10 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All courses</option>
              {programmeOptions.map((programme) => (
                <option key={programme.id} value={programme.id}>
                  {programme.title}
                </option>
              ))}
            </select>
            <br></br>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {format(addMonths(visibleMonth, -1), "MMMM")}
              </Button>
              <div className="min-w-[140px] text-center text-lg font-semibold text-foreground">
                {format(visibleMonth, "MMMM yyyy")}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              >
                {format(addMonths(visibleMonth, 1), "MMMM")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {weekdays.map((day) => (
              <div
                key={day}
                className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="divide-y divide-border">
            {calendarWeeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 divide-x divide-border">
                {week.map((day) => {
                  const dayKey = format(day, "yyyy-MM-dd");
                  const dayEvents = eventsByDay[dayKey] || [];
                  const isToday = isSameDay(day, new Date());

                  return (
                    <div
                      key={dayKey}
                      className={`min-h-[50px] p-2 sm:min-h-[100px] sm:p-3 ${
                        isSameMonth(day, visibleMonth) ? "bg-background" : "bg-muted/20"
                      }`}
                    >
                      <div className="mb-2 flex justify-end">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                            isToday
                              ? "bg-vahani-blue text-white"
                              : isSameMonth(day, visibleMonth)
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
                              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${eventStyles[event.type]}`}
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

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
            Assignment deadline
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
            Interactive session
          </div>
          {loading && <span>Loading calendar events...</span>}
        </div>
      </section>

      <Card className="rounded-[2rem] border border-border shadow-sm">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-foreground">This month at a glance</p>
          <div className="mt-4 space-y-3">
            {monthEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No calendar events for this month.
              </p>
            ) : (
              monthEvents.slice(0, 8).map((event) => (
                <div key={event.id} className="rounded-2xl border border-border p-3">
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${eventStyles[event.type]}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {event.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.programmeTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.date), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
