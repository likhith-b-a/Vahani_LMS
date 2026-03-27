import { AppSidebar } from "../components/dashboard/AppSidebar";
import { TopNavbar } from "../components/dashboard/TopNavbar";
import { Announcements } from "../components/dashboard/Announcements";
import { useNotifications } from "../contexts/NotificationsContext";
import { BellRing } from "lucide-react";

export default function Updates() {
  const { notifications, unreadCount } = useNotifications();

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activePage="Announcements" />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
            <section className="overflow-hidden rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(12,106,204,0.12),rgba(255,182,72,0.08),rgba(255,255,255,0.98))] p-6 shadow-sm sm:p-8">
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-vahani-blue">
                    Updates Center
                  </p>
                  <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                    Announcements and notifications in one place
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Follow programme announcements, assignment alerts, marks
                    updates, resources, meetings, and every other scholar-facing
                    notification from a single stream.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-2xl border border-border bg-card/80 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      Notifications
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {notifications.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card/80 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                      Unread
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {unreadCount}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-2 pl-4 mt-2 shadow-sm">
                <div className="mb-1 flex items-center gap-2">
                  <BellRing className="h-5 w-5 text-vahani-blue" />
                  <h2 className="text-sm font-bold">How This Works</h2>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>
                    *Announcements from admins and programme managers appear
                    here.
                  </p>
                  <p>
                    *Assignment, grade, resource, meeting, certificate, and query
                    updates also appear in this feed.
                  </p>
                  <p>
                    *Unread items remain highlighted until you open them from the
                    navbar notification menu.
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.1fr]">
              <Announcements />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
