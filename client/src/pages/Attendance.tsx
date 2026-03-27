import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock3, XCircle } from "lucide-react";

import { getMyProgrammes, type Programme } from "../api/programmes";
import { AppSidebar } from "../components/dashboard/AppSidebar";
import { TopNavbar } from "../components/dashboard/TopNavbar";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useToast } from "../hooks/use-toast";

type SessionAttendanceStatus = "present" | "absent" | "unmarked" | "upcoming";

type SessionRecord = {
  id: string;
  programmeId: string;
  programmeTitle: string;
  title: string;
  description?: string | null;
  scheduledAt: string;
  durationMinutes?: number | null;
  meetingUrl?: string | null;
  status: SessionAttendanceStatus;
  markedAt?: string | null;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const getStatusBadge = (status: SessionAttendanceStatus) => {
  if (status === "present") {
    return <Badge className="border-green-500/30 bg-green-500/10 text-green-600">Present</Badge>;
  }
  if (status === "absent") {
    return <Badge className="border-red-500/30 bg-red-500/10 text-red-600">Absent</Badge>;
  }
  if (status === "unmarked") {
    return <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-700">Awaiting mark</Badge>;
  }
  return <Badge variant="secondary">Upcoming</Badge>;
};

function SessionCard({ session }: { session: SessionRecord }) {
  return (
    <Card className="border border-border shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground sm:text-base">{session.title}</h3>
              {getStatusBadge(session.status)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{session.programmeTitle}</p>
            {session.description ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{session.description}</p>
            ) : null}
          </div>
          <div className="space-y-1 text-sm text-muted-foreground sm:min-w-56 sm:text-right">
            <p>{formatDateTime(session.scheduledAt)}</p>
            <p>{session.durationMinutes ? `${session.durationMinutes} mins` : "Duration not set"}</p>
            {session.markedAt ? <p>Marked on {formatDate(session.markedAt)}</p> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Attendance() {
  const { toast } = useToast();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [programmeFilter, setProgrammeFilter] = useState("all");

  useEffect(() => {
    const loadProgrammes = async () => {
      try {
        const response = await getMyProgrammes();
        setProgrammes(Array.isArray(response?.data?.programmes) ? (response.data.programmes as Programme[]) : []);
      } catch (error) {
        toast({
          title: "Unable to load attendance",
          description: error instanceof Error ? error.message : "Please try again shortly.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadProgrammes();
  }, [toast]);

  const sessions = useMemo<SessionRecord[]>(() => {
    const now = Date.now();

    return programmes.flatMap((programme) =>
      (programme.interactiveSessions || []).map((session) => {
        const attendance = session.attendances?.[0];
        const scheduledAtTime = new Date(session.scheduledAt).getTime();
        const status: SessionAttendanceStatus =
          scheduledAtTime > now
            ? "upcoming"
            : attendance?.status === "present"
              ? "present"
              : attendance?.status === "absent"
                ? "absent"
                : "unmarked";

        return {
          id: session.id,
          programmeId: programme.id,
          programmeTitle: programme.title,
          title: session.title,
          description: session.description,
          scheduledAt: session.scheduledAt,
          durationMinutes: session.durationMinutes,
          meetingUrl: session.meetingUrl,
          status,
          markedAt: attendance?.markedAt ?? null,
        };
      }),
    );
  }, [programmes]);

  const filteredSessions = useMemo(
    () => sessions.filter((session) => programmeFilter === "all" || session.programmeId === programmeFilter),
    [programmeFilter, sessions],
  );

  const upcomingSessions = filteredSessions.filter((session) => session.status === "upcoming");
  const historySessions = filteredSessions.filter((session) => session.status !== "upcoming");
  const presentSessions = historySessions.filter((session) => session.status === "present");
  const absentSessions = historySessions.filter((session) => session.status === "absent");
  const unmarkedSessions = historySessions.filter((session) => session.status === "unmarked");
  const attendanceRate = historySessions.length > 0 ? Math.round((presentSessions.length / historySessions.length) * 100) : 0;

  const programmeAttendance = useMemo(
    () =>
      programmes
        .map((programme) => {
          const programmeSessions = filteredSessions.filter((session) => session.programmeId === programme.id);
          const programmeHistory = programmeSessions.filter((session) => session.status !== "upcoming");
          const programmePresent = programmeHistory.filter((session) => session.status === "present");
          const rate =
            programmeHistory.length > 0 ? Math.round((programmePresent.length / programmeHistory.length) * 100) : null;

          return {
            id: programme.id,
            title: programme.title,
            total: programmeHistory.length,
            present: programmePresent.length,
            upcoming: programmeSessions.filter((session) => session.status === "upcoming").length,
            rate,
          };
        })
        .filter((programme) => programmeFilter === "all" || programme.id === programmeFilter),
    [filteredSessions, programmeFilter, programmes],
  );

  const lowAttendanceProgrammes = programmeAttendance.filter(
    (programme) => programme.rate !== null && programme.rate < 75,
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activePage="Attendance" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Attendance</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Track your interactive session attendance across enrolled programmes.
              </p>
            </div>
            <div className="w-full max-w-xs">
              <Select value={programmeFilter} onValueChange={setProgrammeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by programme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All programmes</SelectItem>
                  {programmes.map((programme) => (
                    <SelectItem key={programme.id} value={programme.id}>
                      {programme.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-xl bg-primary/10 p-2.5">
                  <CalendarCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Attendance Rate</p>
                  <p className="text-xl font-bold text-foreground">{historySessions.length ? `${attendanceRate}%` : "--"}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-xl bg-green-500/10 p-2.5">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Present Sessions</p>
                  <p className="text-xl font-bold text-foreground">{presentSessions.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-xl bg-red-500/10 p-2.5">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Absences</p>
                  <p className="text-xl font-bold text-foreground">{absentSessions.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-xl bg-vahani-blue/10 p-2.5">
                  <Clock3 className="h-5 w-5 text-vahani-blue" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Upcoming Sessions</p>
                  <p className="text-xl font-bold text-foreground">{upcomingSessions.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {lowAttendanceProgrammes.length > 0 ? (
            <div className="space-y-2">
              {lowAttendanceProgrammes.map((programme) => (
                <div
                  key={programme.id}
                  className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{programme.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Your marked attendance is {programme.rate}% in this programme. Try not to miss upcoming sessions.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border border-border">
              <CardHeader>
                <CardTitle>Programme-wise attendance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading attendance summary...</p>
                ) : programmeAttendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No interactive sessions found for your enrolled programmes yet.</p>
                ) : (
                  programmeAttendance.map((programme) => (
                    <div key={programme.id} className="rounded-xl border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">{programme.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {programme.present} present out of {programme.total || 0} marked sessions
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-foreground">
                            {programme.rate !== null ? `${programme.rate}%` : "--"}
                          </p>
                          <p className="text-xs text-muted-foreground">{programme.upcoming} upcoming</p>
                        </div>
                      </div>
                      <Progress className="mt-4 h-2.5" value={programme.rate ?? 0} />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardHeader>
                <CardTitle>Pending updates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {unmarkedSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    All past sessions in this view have already been marked by your programme manager.
                  </p>
                ) : (
                  unmarkedSessions.map((session) => (
                    <div key={session.id} className="rounded-xl border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{session.title}</p>
                          <p className="text-xs text-muted-foreground">{session.programmeTitle}</p>
                        </div>
                        {getStatusBadge(session.status)}
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{formatDateTime(session.scheduledAt)}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="upcoming" className="space-y-4">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming Sessions</TabsTrigger>
              <TabsTrigger value="history">Attendance History</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="space-y-3">
              {upcomingSessions.length === 0 ? (
                <Card className="border border-border">
                  <CardContent className="p-5 text-sm text-muted-foreground">
                    No upcoming interactive sessions in this view.
                  </CardContent>
                </Card>
              ) : (
                upcomingSessions.map((session) => <SessionCard key={session.id} session={session} />)
              )}
            </TabsContent>
            <TabsContent value="history" className="space-y-3">
              {historySessions.length === 0 ? (
                <Card className="border border-border">
                  <CardContent className="p-5 text-sm text-muted-foreground">
                    Your attendance history will appear here once session dates pass.
                  </CardContent>
                </Card>
              ) : (
                historySessions
                  .slice()
                  .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
                  .map((session) => <SessionCard key={session.id} session={session} />)
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
