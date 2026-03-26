import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  ExternalLink,
  Play,
  Users,
} from "lucide-react";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopNavbar } from "@/components/dashboard/TopNavbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProgrammeDetail, type Programme } from "@/api/programmes";
import { useToast } from "@/hooks/use-toast";

function getPendingAssignments(programme: Programme) {
  return programme.assignments.filter((assignment) => assignment.submissions.length === 0);
}

function getSubmittedAssignments(programme: Programme) {
  return programme.assignments.filter((assignment) => assignment.submissions.length > 0);
}

export default function ProgrammeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProgramme = async () => {
      if (!id) {
        setError("Programme not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await getProgrammeDetail(id);
        setProgramme(response.data as Programme);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load programme details.";
        setError(message);
        toast({
          title: "Unable to load programme",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadProgramme();
  }, [id, toast]);

  const stats = useMemo(() => {
    if (!programme) {
      return [];
    }

    return [
      {
        label: "Programme Manager",
        value: programme.programmeManager?.name || "Not assigned",
        icon: Users,
      },
      {
        label: "Pending Assignments",
        value: String(getPendingAssignments(programme).length),
        icon: AlertCircle,
      },
      {
        label: "Submitted Assignments",
        value: String(getSubmittedAssignments(programme).length),
        icon: ClipboardCheck,
      },
      {
        label: "Enrolled Since",
        value: format(new Date(programme.enrolledAt || programme.createdAt), "dd MMM yyyy"),
        icon: CalendarDays,
      },
    ];
  }, [programme]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activePage="My Programmes" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Button variant="ghost" className="mb-2 px-0" onClick={() => navigate("/my-programmes")}>
                  <ArrowLeft size={16} className="mr-2" />
                  Back to My Programmes
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">
                  {loading ? "Loading programme..." : programme?.title || "Programme Details"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  View assignments, spotlight updates, study materials, and meeting links in one place.
                </p>
              </div>
              {programme && (
                <Button onClick={() => navigate(`/assignments?programmeId=${encodeURIComponent(programme.id)}`)}>
                  <Play size={16} className="mr-2" />
                  Open Assignments
                </Button>
              )}
            </div>

            {loading && (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Loading programme details...
                </CardContent>
              </Card>
            )}

            {error && !loading && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-6 text-sm text-destructive">
                  {error}
                </CardContent>
              </Card>
            )}

            {programme && !loading && (
              <>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {programme.status}
                          </Badge>
                          {programme.programmeManager && (
                            <Badge variant="outline">
                              Manager: {programme.programmeManager.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {programme.description || "No programme description available."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {stats.map((stat) => (
                    <Card key={stat.label}>
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{stat.label}</span>
                          <stat.icon size={16} className="text-vahani-blue" />
                        </div>
                        <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {(programme.spotlightTitle || programme.spotlightMessage) && (
                  <Card className="border-vahani-blue/20 bg-vahani-blue/5">
                    <CardHeader>
                      <CardTitle className="text-vahani-blue">
                        {programme.spotlightTitle || "Programme Spotlight"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {programme.spotlightMessage}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <Card>
                    <CardHeader>
                      <CardTitle>Assignments</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {programme.assignments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No assignments have been published yet.
                        </p>
                      ) : (
                        programme.assignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="rounded-lg border border-border p-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-foreground">{assignment.title}</p>
                              <Badge
                                className={
                                  assignment.submissions.length
                                    ? "bg-blue-500/10 text-blue-600"
                                    : "bg-yellow-500/10 text-yellow-700"
                                }
                              >
                                {assignment.submissions.length ? "Submitted" : "Pending"}
                              </Badge>
                              <Badge variant="outline">{assignment.assignmentType}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {assignment.description}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              Due {format(new Date(assignment.dueDate), "dd MMM yyyy, hh:mm a")} • Max score {assignment.maxScore}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Study Materials</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {programme.resources?.length ? (
                          programme.resources.map((resource) => (
                            <a
                              key={resource.id}
                              href={resource.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between rounded-lg border border-border p-3 text-sm text-vahani-blue hover:bg-muted/30"
                            >
                              <span>{resource.title}</span>
                              <ExternalLink size={14} />
                            </a>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No study materials added yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Online Meeting Links</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {programme.meetingLinks?.length ? (
                          programme.meetingLinks.map((meetingLink) => (
                            <a
                              key={meetingLink.id}
                              href={meetingLink.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between rounded-lg border border-border p-3 text-sm text-vahani-blue hover:bg-muted/30"
                            >
                              <span>{meetingLink.title}</span>
                              <ExternalLink size={14} />
                            </a>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No meeting links published yet.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
