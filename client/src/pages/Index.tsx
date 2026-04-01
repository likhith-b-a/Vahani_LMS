import { AppSidebar } from "../components/dashboard/AppSidebar";
import { TopNavbar } from "../components/dashboard/TopNavbar";
import { StatsCards } from "../components/dashboard/StatsCards";
import { ActiveCourses } from "../components/dashboard/ActiveCourses";
import { Deadlines } from "../components/dashboard/Deadlines";
import { SmartCalendar } from "../components/dashboard/SmartCalendar";
import { useAuth } from "../contexts/AuthContext";

const Index = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">
            Please log in to view this page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activePage="Overview" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-12 lg:gap-8 lg:p-8">
            <div className="space-y-6 lg:col-span-8 lg:space-y-8">
              <section className="overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(12,106,204,0.12),rgba(255,199,88,0.08),rgba(255,255,255,0.98))] p-6 shadow-sm sm:p-8">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-vahani-blue">
                      Scholar Dashboard
                    </p>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                      Hello, {user.name}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                      Keep every course deadline and interactive session visible
                      in one calendar so you can plan your week without hunting
                      across pages.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="rounded-2xl border border-border bg-card/80 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        Role
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        Scholar
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card/80 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        Programmes
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">
                        {user.enrollments?.length ?? 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-card/80 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                        Focus
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        Calendar, deadlines, and sessions
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <StatsCards />

              <ActiveCourses />

              <h3 className="text-lg font-bold">Calender</h3>
              <SmartCalendar />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
