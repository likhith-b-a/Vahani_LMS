import { BellRing, BookOpen, MessageSquareText, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminSummary } from "@/hooks/admin/useAdminSummary";
import { useAdminProgrammes } from "@/hooks/admin/useAdminProgrammes";
import { useAdminQueries } from "@/hooks/admin/useAdminQueries";
import { useAdminAnnouncements } from "@/hooks/admin/useAdminAnnouncements";

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: summary, isLoading } = useAdminSummary();
  const { programmesQuery } = useAdminProgrammes();
  const { queriesQuery } = useAdminQueries();
  const { announcementsQuery } = useAdminAnnouncements();

  const programmes = programmesQuery.data?.programmes || [];
  const queries = queriesQuery.data || [];
  const announcements = announcementsQuery.data || [];
  const overviewProgrammes = summary?.programmes ?? [];

  const overviewStats = [
    {
      label: "Total users",
      value: summary?.stats.totalUsers ?? 0,
      hint: `${summary?.stats.scholars ?? 0} scholars, ${summary?.stats.programmeManagers ?? 0} managers`,
      icon: Users,
    },
    {
      label: "Open programmes",
      value: summary?.stats.programmes ?? 0,
      hint: `${summary?.stats.activeEnrollments ?? 0} active enrollments`,
      icon: BookOpen,
    },
    {
      label: "Self-enroll enabled",
      value: programmes.filter((programme) => programme.selfEnrollmentEnabled).length,
      hint: "Programmes open for scholar-choice registration",
      icon: BellRing,
    },
    {
      label: "Open queries",
      value: queries.filter((query) => query.status === "open").length,
      hint: `${announcements.length} announcements sent`,
      icon: MessageSquareText,
    },
  ];

  if (isLoading && !summary) {
    return <div className="text-sm text-muted-foreground">Loading admin dashboard...</div>;
  }

  return (
    <>
      <section className="mb-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-vahani-blue/10 via-background to-vahani-gold/10">
        <div className="grid gap-5 px-6 py-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-vahani-blue">
              Platform Control
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Coordinate users, programmes, announcements, and support from one place
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Manage access, keep programmes organized, review support quickly, and keep
              communication moving without leaving the admin workspace.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-border bg-card/80 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Admin
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/80 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Live scope
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {summary?.stats.programmes ?? overviewProgrammes.length} programmes
              </p>
              <p className="text-sm text-muted-foreground">
                {queries.filter((query) => query.status === "open").length} open support
                queries
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-vahani-blue" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Programmes overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {overviewProgrammes.map((programme) => (
            <button
              key={programme.id}
              type="button"
              onClick={() => navigate(`/admin/programmes/${programme.id}`)}
              className="rounded-xl border border-border p-4 text-left transition hover:border-vahani-blue/40 hover:bg-muted/40"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{programme.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {programme.programmeManager?.name || "Unassigned manager"}
                  </p>
                </div>
                <Badge variant="secondary">{programme.enrollmentsCount} scholars</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {programme.description || "No programme description added yet."}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
