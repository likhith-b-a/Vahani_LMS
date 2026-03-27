import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertCircle,
  Award,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Eye,
  Play,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";
import { AppSidebar } from "../components/dashboard/AppSidebar";
import { TopNavbar } from "../components/dashboard/TopNavbar";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import { getMyProgrammes, type Programme, type ProgrammeAssignment } from "../api/programmes";

function getPendingAssignments(assignments: ProgrammeAssignment[]) {
  return assignments.filter((assignment) => assignment.submissions.length === 0);
}

function getNextUpcomingAssignment(assignments: ProgrammeAssignment[]) {
  const now = new Date();

  return getPendingAssignments(assignments)
    .filter((assignment) => new Date(assignment.dueDate) >= now)
    .sort(
      (first, second) =>
        new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime(),
    )[0];
}

const MyProgrammes = () => {
  const { toast } = useToast();
  const { accessToken, refreshToken } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProgrammes = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getMyProgrammes();
        const data = response?.data;
        const resolved = Array.isArray(data)
          ? data
          : Array.isArray(data?.programmes)
            ? data.programmes
            : [];
        setProgrammes(resolved);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch programmes";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (accessToken || refreshToken) {
      void fetchProgrammes();
    }
  }, [accessToken, refreshToken, toast]);

  const filteredProgrammes = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return programmes;
    }

    return programmes.filter((programme) =>
      [
        programme.title,
        programme.description,
        programme.programmeManager?.name,
        programme.spotlightTitle,
        programme.spotlightMessage,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    );
  }, [programmes, search]);

  const ongoing = useMemo(
    () =>
      filteredProgrammes.filter(
        (programme) =>
          programme.status === "active" || programme.status === "uncompleted",
      ),
    [filteredProgrammes],
  );
  const completed = useMemo(
    () => filteredProgrammes.filter((programme) => programme.status === "completed"),
    [filteredProgrammes],
  );

  const stats = useMemo(
    () => [
      {
        label: "Total Enrolled",
        value: programmes.length,
        icon: BookOpen,
        color: "text-primary",
      },
      {
        label: "Active",
        value: programmes.filter((programme) => programme.status === "active").length,
        icon: Clock,
        color: "text-accent",
      },
      {
        label: "Completed",
        value: programmes.filter((programme) => programme.status === "completed").length,
        icon: Award,
        color: "text-accent",
      },
      {
        label: "Pending Tasks",
        value: programmes.reduce(
          (total, programme) => total + getPendingAssignments(programme.assignments).length,
          0,
        ),
        icon: ClipboardCheck,
        color: "text-accent",
      },
    ],
    [programmes],
  );

  const handleOpenAssignments = (programmeId: string) => {
    navigate(`/assignments?programmeId=${encodeURIComponent(programmeId)}`);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activePage="My Programmes" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:space-y-8 sm:p-6 lg:p-8">
            <section>
              <h1 className="mb-1 text-xl font-bold tracking-tight sm:text-2xl">
                My Programmes
              </h1>
              <p className="text-sm text-muted-foreground">
                Review your programme progress, open a full details page, and jump straight into the next task.
              </p>
            </section>

            {loading && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Loading your programmes...
                </CardContent>
              </Card>
            )}

            {error && !loading && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="flex items-center gap-3 p-4">
                  <AlertCircle size={20} className="text-destructive" />
                  <div>
                    <p className="text-sm font-semibold">Error Loading Programmes</p>
                    <p className="text-xs text-muted-foreground">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {!loading && programmes.length === 0 && !error && (
              <Card>
                <CardContent className="p-6 text-center">
                  <BookOpen size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground">
                    No programmes found. You are yet to be enrolled.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 sm:gap-4">
              {stats.map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                    <div className={`rounded-lg bg-muted p-2 ${stat.color}`}>
                      <stat.icon size={20} />
                    </div>
                    <div>
                      <p className="text-xl font-bold sm:text-2xl">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground sm:text-xs">
                        {stat.label}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="relative max-w-xl">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <Input
                placeholder="Search programmes..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>

            <Tabs defaultValue="ongoing" className="space-y-6">
              <TabsList>
                <TabsTrigger value="ongoing">Ongoing ({ongoing.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="ongoing">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 sm:gap-5">
                  {ongoing.map((programme) => (
                    <ProgrammeCard
                      key={programme.id}
                      programme={programme}
                      badgeLabel={
                        programme.status === "uncompleted" ? "Uncompleted" : "Ongoing"
                      }
                      badgeClassName={
                        programme.status === "uncompleted"
                          ? "bg-red-500/10 text-red-600"
                          : "bg-primary/10 text-primary"
                      }
                      onViewDetails={() =>
                        navigate(`/my-programmes/${encodeURIComponent(programme.id)}`)
                      }
                      onContinue={() => handleOpenAssignments(programme.id)}
                    />
                  ))}
                  {!ongoing.length && <EmptyState message="No ongoing programmes match this search." />}
                </div>
              </TabsContent>

              <TabsContent value="completed">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 sm:gap-5">
                  {completed.map((programme) => (
                    <ProgrammeCard
                      key={programme.id}
                      programme={programme}
                      badgeLabel="Completed"
                      badgeClassName="bg-green-500/10 text-green-600"
                      onViewDetails={() =>
                        navigate(`/my-programmes/${encodeURIComponent(programme.id)}`)
                      }
                      onContinue={() => handleOpenAssignments(programme.id)}
                    />
                  ))}
                  {!completed.length && <EmptyState message="No completed programmes found." />}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

function ProgrammeCard({
  programme,
  badgeLabel,
  badgeClassName,
  onViewDetails,
  onContinue,
}: {
  programme: Programme;
  badgeLabel: string;
  badgeClassName: string;
  onViewDetails: () => void;
  onContinue: () => void;
}) {
  const nextAssignment = getNextUpcomingAssignment(programme.assignments);
  const pendingAssignments = getPendingAssignments(programme.assignments).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
        <div className="h-1.5 bg-gradient-to-r from-primary to-accent" />
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold leading-tight text-foreground">
              {programme.title}
            </h3>
            <Badge className={`${badgeClassName} shrink-0 text-[10px]`}>
              {badgeLabel}
            </Badge>
          </div>

          <p className="line-clamp-2 text-sm text-muted-foreground">
            {programme.description}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span className="line-clamp-2">
              Handled by: {programme.programmeManager?.name || "Not assigned"}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays size={13} />
              Enrolled {format(new Date(programme.enrolledAt || programme.createdAt), "dd MMM yyyy")}
            </span>
            <span className="flex items-center gap-1.5">
              <ClipboardCheck size={13} />
              {pendingAssignments} pending
            </span>
            <span className="flex items-center gap-1.5">
              <AlertCircle size={13} />
              {nextAssignment ? nextAssignment.title : "No upcoming assignment"}
            </span>
          </div>

          {(programme.spotlightTitle || programme.spotlightMessage) && (
            <div className="rounded-lg border border-vahani-blue/20 bg-vahani-blue/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-vahani-blue">
                {programme.spotlightTitle || "Spotlight"}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {programme.spotlightMessage}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1 text-xs"
              onClick={onViewDetails}
            >
              <Eye size={13} /> View Details
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1 bg-accent text-xs text-accent-foreground hover:bg-accent/90"
              onClick={onContinue}
            >
              <Play size={13} /> Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="col-span-full py-12 text-center text-muted-foreground">
      {message}
    </div>
  );
}

export default MyProgrammes;
