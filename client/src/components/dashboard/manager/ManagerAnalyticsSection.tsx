import { useMemo } from "react";
import { BarChart3, BookOpen, Presentation, Users } from "lucide-react";
import type { Announcement } from "@/api/announcements";
import type { ManagedProgrammeSummary } from "@/api/programmeManager";
import type { SupportQuery } from "@/api/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

const palette = ["#0c6acc", "#14b8a6", "#f59e0b", "#7c3aed", "#ef4444", "#22c55e"];

const managerChartConfig = {
  scholars: { label: "Scholars", color: "#0c6acc" },
  assignments: { label: "Assignments", color: "#f59e0b" },
  sessions: { label: "Sessions", color: "#14b8a6" },
  resources: { label: "Resources", color: "#7c3aed" },
  setup: { label: "Setup", color: "#f59e0b" },
  active: { label: "Active", color: "#0c6acc" },
  completed: { label: "Completed", color: "#22c55e" },
  open: { label: "Open", color: "#ef4444" },
  in_progress: { label: "In progress", color: "#f59e0b" },
  resolved: { label: "Resolved", color: "#22c55e" },
  closed: { label: "Closed", color: "#7c3aed" },
} satisfies ChartConfig;

const formatMonth = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

const getProgrammeStatus = (programme: ManagedProgrammeSummary) => {
  if (programme.resultsPublishedAt) return "completed";
  if (
    programme.scholarsCount === 0 &&
    programme.assignmentsCount === 0 &&
    programme.interactiveSessionsCount === 0 &&
    programme.resourcesCount === 0
  ) {
    return "setup";
  }
  return "active";
};

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function ManagerAnalyticsSection({
  programmes,
  announcements,
  queries,
}: {
  programmes: ManagedProgrammeSummary[];
  announcements: Announcement[];
  queries: SupportQuery[];
}) {
  const statusDistribution = useMemo(() => {
    const counts = { setup: 0, active: 0, completed: 0 };
    for (const programme of programmes) {
      counts[getProgrammeStatus(programme)] += 1;
    }
    return [
      { name: "setup", label: "Setup", value: counts.setup },
      { name: "active", label: "Active", value: counts.active },
      { name: "completed", label: "Completed", value: counts.completed },
    ];
  }, [programmes]);

  const scholarLoadData = useMemo(
    () =>
      programmes
        .map((programme) => ({
          title: programme.title.length > 18 ? `${programme.title.slice(0, 18)}...` : programme.title,
          scholars: programme.scholarsCount,
        }))
        .sort((a, b) => b.scholars - a.scholars)
        .slice(0, 6),
    [programmes],
  );

  const contentMixData = useMemo(
    () =>
      programmes
        .map((programme) => ({
          title: programme.title.length > 16 ? `${programme.title.slice(0, 16)}...` : programme.title,
          assignments: programme.assignmentsCount,
          sessions: programme.interactiveSessionsCount,
          resources: programme.resourcesCount,
        }))
        .sort(
          (a, b) =>
            b.assignments + b.sessions + b.resources - (a.assignments + a.sessions + a.resources),
        )
        .slice(0, 5),
    [programmes],
  );

  const queryStatusData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const query of queries) {
      counts.set(query.status, (counts.get(query.status) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({
      name,
      label: name.replace(/_/g, " "),
      value,
    }));
  }, [queries]);

  const announcementTrend = useMemo(() => {
    const counts = new Map<string, { period: string; total: number }>();
    for (const announcement of announcements) {
      const date = new Date(announcement.createdAt);
      if (Number.isNaN(date.getTime())) continue;
      const periodKey = `${date.getFullYear()}-${date.getMonth()}`;
      const current = counts.get(periodKey) ?? {
        period: formatMonth(announcement.createdAt),
        total: 0,
      };
      current.total += 1;
      counts.set(periodKey, current);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([, value]) => value);
  }, [announcements]);

  const totalScholars = programmes.reduce((sum, item) => sum + item.scholarsCount, 0);
  const totalAssignments = programmes.reduce((sum, item) => sum + item.assignmentsCount, 0);
  const totalSessions = programmes.reduce((sum, item) => sum + item.interactiveSessionsCount, 0);
  const completedProgrammes = statusDistribution.find((item) => item.name === "completed")?.value ?? 0;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/80 bg-[linear-gradient(135deg,rgba(245,158,11,0.10),rgba(12,106,204,0.08),rgba(255,255,255,0.98))]">
        <CardHeader className="gap-3">
          <Badge className="w-fit bg-vahani-blue/10 text-vahani-blue hover:bg-vahani-blue/10">
            Manager analytics
          </Badge>
          <CardTitle className="text-2xl tracking-tight">Programme quality and delivery view</CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-6">
            Use this space to understand learner load, programme progress, communication patterns,
            and the overall content mix across the courses you handle.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Managed programmes</p>
              <p className="mt-2 text-3xl font-semibold">{programmes.length}</p>
            </div>
            <BookOpen className="h-10 w-10 text-vahani-blue" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Scholars served</p>
              <p className="mt-2 text-3xl font-semibold">{totalScholars}</p>
            </div>
            <Users className="h-10 w-10 text-emerald-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Assignments + sessions</p>
              <p className="mt-2 text-3xl font-semibold">{totalAssignments + totalSessions}</p>
            </div>
            <Presentation className="h-10 w-10 text-amber-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Completed programmes</p>
              <p className="mt-2 text-3xl font-semibold">{completedProgrammes}</p>
            </div>
            <BarChart3 className="h-10 w-10 text-violet-500" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Programme status</CardTitle>
            <CardDescription>See how your programmes are distributed across setup, active, and completed.</CardDescription>
          </CardHeader>
          <CardContent>
            {statusDistribution.some((item) => item.value > 0) ? (
              <ChartContainer className="h-[280px] w-full" config={managerChartConfig}>
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={68} outerRadius={102}>
                    {statusDistribution.map((entry, index) => (
                      <Cell key={entry.name} fill={palette[index % palette.length]} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="Programme status will appear once programmes are available." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scholar load by programme</CardTitle>
            <CardDescription>Top programmes by enrolled scholars.</CardDescription>
          </CardHeader>
          <CardContent>
            {scholarLoadData.length ? (
              <ChartContainer
                className="h-[280px] w-full"
                config={{ scholars: { label: "Scholars", color: "#0c6acc" } }}
              >
                <BarChart data={scholarLoadData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="title" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="scholars" fill="var(--color-scholars)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="Scholar distribution will appear once programmes are loaded." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Programme content mix</CardTitle>
            <CardDescription>Compare assignments, interactive sessions, and resources per programme.</CardDescription>
          </CardHeader>
          <CardContent>
            {contentMixData.length ? (
              <ChartContainer className="h-[300px] w-full" config={managerChartConfig}>
                <BarChart data={contentMixData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="title" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="assignments" stackId="content" fill="var(--color-assignments)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="sessions" stackId="content" fill="var(--color-sessions)" />
                  <Bar dataKey="resources" stackId="content" fill="var(--color-resources)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="Content mix will appear once programme content exists." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support query status</CardTitle>
            <CardDescription>Follow how scholar issues are moving through your queue.</CardDescription>
          </CardHeader>
          <CardContent>
            {queryStatusData.length ? (
              <ChartContainer className="h-[300px] w-full" config={managerChartConfig}>
                <BarChart data={queryStatusData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {queryStatusData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={
                          managerChartConfig[entry.name as keyof typeof managerChartConfig]?.color ||
                          palette[index % palette.length]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="Query analytics will appear once conversations are available." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Announcement cadence</CardTitle>
          <CardDescription>Volume of announcements sent across recent periods.</CardDescription>
        </CardHeader>
        <CardContent>
          {announcementTrend.length ? (
            <ChartContainer
              className="h-[280px] w-full"
              config={{ announcements: { label: "Announcements", color: "#14b8a6" } }}
            >
              <BarChart data={announcementTrend}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="period" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-announcements)" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyChartState message="Announcement activity will appear here once posts are available." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
