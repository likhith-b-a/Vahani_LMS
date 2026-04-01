import { useEffect, useMemo, useState } from "react";
import { AppSidebar } from "../components/dashboard/AppSidebar";
import { TopNavbar } from "../components/dashboard/TopNavbar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import {
  getDiscoverableProgrammes,
  selfEnrollInProgramme,
  type DiscoverableProgramme,
} from "../api/programmes";

export default function CourseRegistration() {
  const { toast } = useToast();
  const { user, setAuthData } = useAuth();
  const [search, setSearch] = useState("");
  const [programmes, setProgrammes] = useState<DiscoverableProgramme[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    const loadProgrammes = async () => {
      try {
        setLoading(true);
        const response = await getDiscoverableProgrammes();
        setProgrammes(Array.isArray(response.data?.programmes) ? response.data.programmes : []);
      } catch (error) {
        toast({
          title: "Unable to load open programmes",
          description:
            error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadProgrammes();
  }, [toast]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return programmes;
    }

    return programmes.filter((programme) =>
      [programme.title, programme.description, programme.spotlightTitle, programme.spotlightMessage]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [programmes, search]);

  const handleEnroll = async (programmeId: string) => {
    try {
      setSubmittingId(programmeId);
      await selfEnrollInProgramme(programmeId);
      setProgrammes((current) =>
        current.map((programme) =>
          programme.id === programmeId
            ? { ...programme, enrolled: true }
            : programme,
        ),
      );
      const enrolledProgramme = programmes.find((programme) => programme.id === programmeId);
      if (user && enrolledProgramme) {
        setAuthData({
          ...user,
          enrollments: [
            ...(user.enrollments || []),
            {
              id: programmeId,
              title: enrolledProgramme.title,
              createdAt: enrolledProgramme.createdAt,
              description: enrolledProgramme.description || "",
              status: "active",
              programmeManagerId: enrolledProgramme.programmeManager?.id || "",
              programmeManager: {
                name: enrolledProgramme.programmeManager?.name || "Unassigned",
                email: enrolledProgramme.programmeManager?.email || "",
              },
            },
          ],
        });
      }
      toast({
        title: "Programme registered",
        description: "The programme was added to your enrolled programmes.",
      });
    } catch (error) {
      toast({
        title: "Unable to register",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const spotlightProgrammes = filtered.filter(
    (programme) => programme.spotlightTitle || programme.spotlightMessage,
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activePage="Enrollments" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <section>
              <h1 className="mb-1 text-xl font-bold tracking-tight sm:text-2xl">
                Open Programmes
              </h1>
              <p className="text-sm text-muted-foreground">
                Register for scholar-choice programmes like English Masterclass when admin opens them for self-enrollment.
              </p>
            </section>

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by programme title or spotlight"
            />

            {spotlightProgrammes.length > 0 && (
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Spotlight</h2>
                  <p className="text-sm text-muted-foreground">
                    Highlighted programmes with current announcements.
                  </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {spotlightProgrammes.map((programme) => (
                    <Card key={`${programme.id}-spotlight`} className="border-vahani-blue/20 bg-vahani-blue/5">
                      <CardHeader>
                        <CardTitle className="text-base">
                          {programme.spotlightTitle || programme.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {programme.spotlightMessage || programme.description || "New update available."}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{programme.assignmentsCount} assignments</Badge>
                          <Badge variant="outline">{programme.scholarsCount} scholars</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Available to Register</h2>
                <p className="text-sm text-muted-foreground">
                  {filtered.length} programme{filtered.length === 1 ? "" : "s"} currently open.
                </p>
              </div>

              {loading ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Loading programmes...
                  </CardContent>
                </Card>
              ) : filtered.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((programme) => (
                    <Card key={programme.id} className="overflow-hidden">
                      <div className="h-1.5 bg-gradient-to-r from-vahani-blue to-accent" />
                      <CardContent className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-foreground">{programme.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {programme.description || "No description provided."}
                            </p>
                          </div>
                          <Badge variant={programme.enrolled ? "secondary" : "outline"}>
                            {programme.enrolled ? "Registered" : "Open"}
                          </Badge>
                        </div>

                        {(programme.spotlightTitle || programme.spotlightMessage) && (
                          <div className="rounded-lg border border-vahani-blue/20 bg-vahani-blue/5 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-vahani-blue">
                              {programme.spotlightTitle || "Programme Spotlight"}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {programme.spotlightMessage}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{programme.assignmentsCount} assignments</span>
                          <span>{programme.scholarsCount} scholars</span>
                          <span>
                            Manager: {programme.programmeManager?.name || "TBA"}
                          </span>
                        </div>

                        <Button
                          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                          disabled={programme.enrolled || submittingId === programme.id}
                          onClick={() => void handleEnroll(programme.id)}
                        >
                          {programme.enrolled
                            ? "Already Registered"
                            : submittingId === programme.id
                              ? "Registering..."
                              : "Register for Programme"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    No self-enrollment programmes match your search right now.
                  </CardContent>
                </Card>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
