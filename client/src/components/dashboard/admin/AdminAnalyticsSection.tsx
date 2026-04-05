import { useMemo } from "react";
import { BookOpen, GraduationCap, Users } from "lucide-react";
import type { AdminProgramme, AdminSummary, AdminUser } from "@/api/admin";
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

const chartPalette = ["#0c6acc", "#f59e0b", "#14b8a6", "#7c3aed", "#ef4444", "#22c55e"];

const adminChartConfig = {
  scholars: { label: "Scholars", color: "#0c6acc" },
  programmeManagers: { label: "Programme managers", color: "#f59e0b" },
  admins: { label: "Admins", color: "#14b8a6" },
  setup: { label: "Setup", color: "#f59e0b" },
  active: { label: "Active", color: "#0c6acc" },
  completed: { label: "Completed", color: "#22c55e" },
  selfEnroll: { label: "Self-enrollable", color: "#7c3aed" },
  compulsory: { label: "Compulsory", color: "#f59e0b" },
} satisfies ChartConfig;

const getProgrammeStatus = (programme: AdminProgramme | AdminSummary["programmes"][number]) => {
  const enrollmentsCount =
    "enrollments" in programme ? programme.enrollments.length : programme.enrollmentsCount;
  const assignmentsCount =
    "assignments" in programme ? programme.assignments.length : programme.assignmentsCount;
  const resourcesCount =
    "resources" in programme ? (programme.resources?.length ?? 0) : 0;
  const hasCompletedScholars =
    "enrollments" in programme
      ? programme.enrollments.some((entry) => entry.status === "completed")
      : false;

  if (hasCompletedScholars) return "completed";
  if (enrollmentsCount === 0 && assignmentsCount === 0 && resourcesCount === 0) return "setup";
  return "active";
};

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function AdminAnalyticsSection({
  summary,
  users,
  programmes,
}: {
  summary: AdminSummary | null;
  users: AdminUser[];
  programmes: AdminProgramme[];
}) {
  const scholarUsers = useMemo(
    () => users.filter((user) => user.role === "scholar"),
    [users],
  );

  const roleDistribution = useMemo(
    () =>
      summary
        ? [
            { name: "scholars", label: "Scholars", value: summary.stats.scholars },
            {
              name: "programmeManagers",
              label: "Programme managers",
              value: summary.stats.programmeManagers,
            },
            { name: "admins", label: "Admins", value: summary.stats.admins },
          ]
        : [],
    [summary],
  );

  const batchDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const user of scholarUsers) {
      const batch = user.batch?.trim() || "Unassigned";
      counts.set(batch, (counts.get(batch) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([batch, scholars]) => ({ batch, scholars }))
      .sort((a, b) => b.scholars - a.scholars)
      .slice(0, 8);
  }, [scholarUsers]);

  const genderDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const user of scholarUsers) {
      const gender = user.gender?.trim() || "Unspecified";
      counts.set(gender, (counts.get(gender) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([gender, scholars]) => ({ gender, scholars }))
      .sort((a, b) => b.scholars - a.scholars);
  }, [scholarUsers]);

  const programmeStatusData = useMemo(() => {
    const source = programmes.length ? programmes : summary?.programmes ?? [];
    const counts = { setup: 0, active: 0, completed: 0 };
    for (const programme of source) {
      counts[getProgrammeStatus(programme)] += 1;
    }
    return [
      { name: "setup", label: "Setup", value: counts.setup },
      { name: "active", label: "Active", value: counts.active },
      { name: "completed", label: "Completed", value: counts.completed },
    ];
  }, [programmes, summary]);

  const managerLoadData = useMemo(() => {
    const source = programmes.length ? programmes : summary?.programmes ?? [];
    const counts = new Map<string, number>();
    for (const programme of source) {
      const manager = programme.programmeManager?.name || "Unassigned";
      counts.set(manager, (counts.get(manager) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([manager, programmesCount]) => ({ manager, programmes: programmesCount }))
      .sort((a, b) => b.programmes - a.programmes)
      .slice(0, 6);
  }, [programmes, summary]);

  const selfEnrollProgrammes = useMemo(
    () => programmes.filter((programme) => programme.selfEnrollmentEnabled),
    [programmes],
  );

  const deliveryModeData = useMemo(
    () => [
      { name: "selfEnroll", label: "Self-enrollable", value: selfEnrollProgrammes.length },
      {
        name: "compulsory",
        label: "Compulsory",
        value: Math.max(programmes.length - selfEnrollProgrammes.length, 0),
      },
    ],
    [programmes.length, selfEnrollProgrammes.length],
  );

  const selfEnrollProgrammeLoad = useMemo(
    () =>
      selfEnrollProgrammes
        .map((programme) => ({
          title:
            programme.title.length > 18 ? `${programme.title.slice(0, 18)}...` : programme.title,
          scholars: programme.enrollments.length,
        }))
        .sort((a, b) => b.scholars - a.scholars)
        .slice(0, 6),
    [selfEnrollProgrammes],
  );

  const selfEnrollBatchData = useMemo(() => {
    const selfEnrollIds = new Set(selfEnrollProgrammes.map((programme) => programme.id));
    const counts = new Map<string, number>();

    for (const user of scholarUsers) {
      const matchesSelfEnroll = user.enrollments.some((entry) =>
        selfEnrollIds.has(entry.programme.id),
      );
      if (!matchesSelfEnroll) continue;

      const batch = user.batch?.trim() || "Unassigned";
      counts.set(batch, (counts.get(batch) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([batch, scholars]) => ({ batch, scholars }))
      .sort((a, b) => b.scholars - a.scholars)
      .slice(0, 8);
  }, [scholarUsers, selfEnrollProgrammes]);

  const completionSnapshot = summary
    ? Math.round(
        ((summary.stats.gradedSubmissions || 0) /
          Math.max(summary.stats.submissions || 1, 1)) *
          100,
      )
    : 0;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/80 bg-[linear-gradient(135deg,rgba(12,106,204,0.10),rgba(20,184,166,0.06),rgba(255,255,255,0.98))]">
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <Badge className="w-fit bg-vahani-blue/10 text-vahani-blue hover:bg-vahani-blue/10">
                Admin analytics
              </Badge>
              <CardTitle className="text-2xl tracking-tight">Operational quality at a glance</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-6">
                Track user growth, scholar distribution, manager load, and self-enrollment demand
                from one visual surface.
              </CardDescription>
            </div>
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:w-[330px]">
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-vahani-blue">Submissions graded</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{completionSnapshot}%</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-vahani-blue">Live programmes</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {programmeStatusData.find((item) => item.name === "active")?.value ?? 0}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Total users</p>
              <p className="mt-2 text-3xl font-semibold">{summary?.stats.totalUsers ?? users.length}</p>
            </div>
            <Users className="h-10 w-10 text-vahani-blue" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Programmes</p>
              <p className="mt-2 text-3xl font-semibold">{summary?.stats.programmes ?? programmes.length}</p>
            </div>
            <BookOpen className="h-10 w-10 text-amber-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Active enrolments</p>
              <p className="mt-2 text-3xl font-semibold">{summary?.stats.activeEnrollments ?? 0}</p>
            </div>
            <GraduationCap className="h-10 w-10 text-emerald-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Self-enroll enabled</p>
              <p className="mt-2 text-3xl font-semibold">{selfEnrollProgrammes.length}</p>
            </div>
            <GraduationCap className="h-10 w-10 text-violet-500" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User role mix</CardTitle>
            <CardDescription>Distribution of scholars, programme managers, and admins.</CardDescription>
          </CardHeader>
          <CardContent>
            {roleDistribution.some((item) => item.value > 0) ? (
              <ChartContainer className="h-[280px] w-full" config={adminChartConfig}>
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={roleDistribution} dataKey="value" nameKey="name" innerRadius={72} outerRadius={102}>
                    {roleDistribution.map((entry, index) => (
                      <Cell key={entry.name} fill={chartPalette[index % chartPalette.length]} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="User distribution will appear once users are loaded." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scholars by batch</CardTitle>
            <CardDescription>Top batches by current scholar count.</CardDescription>
          </CardHeader>
          <CardContent>
            {batchDistribution.length ? (
              <ChartContainer
                className="h-[280px] w-full"
                config={{ scholars: { label: "Scholars", color: "#0c6acc" } }}
              >
                <BarChart data={batchDistribution}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="batch" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="scholars" fill="var(--color-scholars)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="Batch-based scholar analytics will appear here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scholars by gender</CardTitle>
            <CardDescription>Gender distribution across scholar profiles.</CardDescription>
          </CardHeader>
          <CardContent>
            {genderDistribution.length ? (
              <ChartContainer
                className="h-[280px] w-full"
                config={{ scholars: { label: "Scholars", color: "#14b8a6" } }}
              >
                <BarChart data={genderDistribution}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="gender" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="scholars" fill="var(--color-scholars)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="Gender analytics will appear once user profiles are updated." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Programme status</CardTitle>
            <CardDescription>How many programmes are in setup, active, and completed states.</CardDescription>
          </CardHeader>
          <CardContent>
            {programmeStatusData.some((item) => item.value > 0) ? (
              <ChartContainer className="h-[280px] w-full" config={adminChartConfig}>
                <BarChart data={programmeStatusData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {programmeStatusData.map((entry) => (
                      <Cell key={entry.name} fill={adminChartConfig[entry.name]?.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="Programme status analytics will appear here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Programmes by manager</CardTitle>
            <CardDescription>Who is currently handling the highest programme load.</CardDescription>
          </CardHeader>
          <CardContent>
            {managerLoadData.length ? (
              <ChartContainer
                className="h-[280px] w-full"
                config={{ programmes: { label: "Programmes", color: "#14b8a6" } }}
              >
                <BarChart data={managerLoadData} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="manager"
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="programmes" fill="var(--color-programmes)" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="Manager workload analytics will appear here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Programme delivery mode</CardTitle>
            <CardDescription>Compare self-enrollable programmes with compulsory cohorts.</CardDescription>
          </CardHeader>
          <CardContent>
            {deliveryModeData.some((item) => item.value > 0) ? (
              <ChartContainer className="h-[280px] w-full" config={adminChartConfig}>
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={deliveryModeData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={102}>
                    {deliveryModeData.map((entry) => (
                      <Cell key={entry.name} fill={adminChartConfig[entry.name]?.color} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="Programme delivery mode will appear once programme data is loaded." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Self-enroll uptake</CardTitle>
            <CardDescription>Top self-enrollable programmes by current scholar participation.</CardDescription>
          </CardHeader>
          <CardContent>
            {selfEnrollProgrammeLoad.length ? (
              <ChartContainer
                className="h-[280px] w-full"
                config={{ scholars: { label: "Scholars", color: "#7c3aed" } }}
              >
                <BarChart data={selfEnrollProgrammeLoad}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="title" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="scholars" fill="var(--color-scholars)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="No self-enrollable programmes are active yet." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Batch participation in self-enroll programmes</CardTitle>
            <CardDescription>Which scholar batches are opting into self-enrollable courses most often.</CardDescription>
          </CardHeader>
          <CardContent>
            {selfEnrollBatchData.length ? (
              <ChartContainer
                className="h-[280px] w-full"
                config={{ scholars: { label: "Scholars", color: "#0c6acc" } }}
              >
                <BarChart data={selfEnrollBatchData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="batch" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="scholars" fill="var(--color-scholars)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="Batch-wise self-enroll participation will appear here." />
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
