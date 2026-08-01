import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import vahaniLogo from "@/assets/vahani-logo.png";
import { AdminSidebar } from "@/components/dashboard/AdminSidebar";
import { useAuth } from "@/contexts/AuthContext";

function AdminPageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Loading...
    </div>
  );
}

export default function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 pl-14 sm:px-6 lg:px-8 lg:pl-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card/80 px-5 py-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <img src={vahaniLogo} alt="Vahani" className="h-10 w-10 rounded-xl" />
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Admin Console
                </p>
                <h1 className="text-base font-semibold text-foreground">
                  Platform operations
                </h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </header>

          <Suspense fallback={<AdminPageFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
