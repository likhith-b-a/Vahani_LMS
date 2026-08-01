import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Loader2, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ManagerSidebar } from "@/components/dashboard/ManagerSidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

function ManagerPageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Loading...
    </div>
  );
}

export default function ManagerLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();

  const basePath = location.pathname.startsWith("/tutor") ? "/tutor" : "/programme-manager";

  return (
    <div className="flex min-h-screen bg-background">
      <ManagerSidebar basePath={basePath} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 pl-14 backdrop-blur-md lg:px-8 lg:pl-8">
          <div>
            <h1 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Programme Manager
            </h1>
            <p className="text-xs text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => void queryClient.invalidateQueries({ queryKey: ["manager"] })}
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <Suspense fallback={<ManagerPageFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
