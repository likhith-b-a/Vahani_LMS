import { useMemo } from "react";
import { BarChart3, BookOpen, Presentation, Users } from "lucide-react";
import type { ManagedProgramme, ManagedProgrammeSummary } from "@/api/programmeManager";
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
  occurrences: { label: "Session dates", color: "#0c6acc" },
  resources: { label: "Resources", color: "#7c3aed" },
  setup: { label: "Setup", color: "#f59e0b" },
  active: { label: "Active", color: "#0c6acc" },
  completed: { label: "Completed", color: "#22c55e" },
  selfEnroll: { label: "Self-enroll", color: "#7c3aed" },
  compulsory: { label: "Compulsory", color: "#14b8a6" },
  graded: { label: "Graded sessions", color: "#f59e0b" },
  attendanceOnly: { label: "Attendance only", color: "#0c6acc" },
} satisfies ChartConfig;

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
  programmeDetails,
}: {
  programmes: ManagedProgrammeSummary[];
  programmeDetails: ManagedProgramme[];
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

  const deliveryModeData = useMemo(() => {
    const selfEnroll = programmeDetails.filter((programme) => programme.selfEnrollmentEnabled).length;
    return [
      { name: "selfEnroll", label: "Self-enroll", value: selfEnroll },
      {
        name: "compulsory",
        label: "Compulsory",
        value: Math.max(programmeDetails.length - selfEnroll, 0),
      },
    ];
  }, [programmeDetails]);

  const sessionDeliveryLoad = useMemo(
    () =>
      programmeDetails
        .map((programme) => ({
          title: programme.title.length > 16 ? `${programme.title.slice(0, 16)}...` : programme.title,
          sessions: programme.interactiveSessions.length,
          occurrences: programme.interactiveSessions.reduce(
            (sum, session) => sum + (session.occurrences?.length || 0),
            0,
          ),
        }))
        .filter((programme) => programme.sessions > 0 || programme.occurrences > 0)
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 6),
    [programmeDetails],
  );

  const sessionEvaluationMode = useMemo(() => {
    let graded = 0;
    let attendanceOnly = 0;
    for (const programme of programmeDetails) {
      for (const session of programme.interactiveSessions) {
        if ((session.maxScore || 0) > 0) {
          graded += 1;
        } else {
          attendanceOnly += 1;
        }
      }
    }
    return [
      { name: "graded", label: "Graded sessions", value: graded },
      { name: "attendanceOnly", label: "Attendance only", value: attendanceOnly },
    ];
  }, [programmeDetails]);

  const totalScholars = programmes.reduce((sum, item) => sum + item.scholarsCount, 0);
  const totalAssignments = programmes.reduce((sum, item) => sum + item.assignmentsCount, 0);
  const totalSessions = programmes.reduce((sum, item) => sum + item.interactiveSessionsCount, 0);
  const completedProgrammes = statusDistribution.find((item) => item.name === "completed")?.value ?? 0;
  const totalOccurrences = programmeDetails.reduce(
    (sum, programme) =>
      sum +
      programme.interactiveSessions.reduce(
        (sessionSum, session) => sessionSum + (session.occurrences?.length || 0),
        0,
      ),
    0,
  );
  const groupedProgrammesCount = programmeDetails.filter(
    (programme) => programme.groupedDeliveryEnabled,
  ).length;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/80 bg-[linear-gradient(135deg,rgba(245,158,11,0.10),rgba(12,106,204,0.08),rgba(255,255,255,0.98))]">
        <CardHeader className="gap-3">
          <Badge className="w-fit bg-vahani-blue/10 text-vahani-blue hover:bg-vahani-blue/10">
            Manager analytics
          </Badge>
          <CardTitle className="text-2xl tracking-tight">Programme quality and delivery view</CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-6">
            Use this space to understand learner load, programme progress, enrollment mode,
            and the overall content mix across the courses you handle.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="xl:col-span-2">
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
              <p className="text-sm text-muted-foreground">Session delivery dates</p>
              <p className="mt-2 text-3xl font-semibold">{totalOccurrences}</p>
            </div>
            <Presentation className="h-10 w-10 text-amber-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Grouped programmes</p>
              <p className="mt-2 text-3xl font-semibold">{groupedProgrammesCount}</p>
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
            <CardTitle>Session delivery load</CardTitle>
            <CardDescription>Compare logical sessions against actual scheduled dates per programme.</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionDeliveryLoad.length ? (
              <ChartContainer className="h-[300px] w-full" config={managerChartConfig}>
                <BarChart data={sessionDeliveryLoad}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="title" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="sessions" stackId="content" fill="var(--color-sessions)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="occurrences" stackId="content" fill="var(--color-occurrences)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="Session delivery analytics will appear once interactive sessions are scheduled." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Enrollment model mix</CardTitle>
            <CardDescription>See how many of your programmes are compulsory versus self-enroll.</CardDescription>
          </CardHeader>
          <CardContent>
            {deliveryModeData.some((item) => item.value > 0) ? (
              <ChartContainer className="h-[280px] w-full" config={managerChartConfig}>
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={deliveryModeData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={102}>
                    {deliveryModeData.map((entry) => (
                      <Cell key={entry.name} fill={managerChartConfig[entry.name]?.color} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="Enrollment model analytics will appear once programme details are loaded." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Session evaluation mode</CardTitle>
            <CardDescription>Understand how many sessions are graded versus attendance-only.</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionEvaluationMode.some((item) => item.value > 0) ? (
              <ChartContainer className="h-[280px] w-full" config={managerChartConfig}>
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={sessionEvaluationMode} dataKey="value" nameKey="name" innerRadius={70} outerRadius={102}>
                    {sessionEvaluationMode.map((entry) => (
                      <Cell key={entry.name} fill={managerChartConfig[entry.name]?.color} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <EmptyChartState message="Session evaluation mode will appear once interactive sessions are created." />
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
      </div>
    </div>
  );
}
