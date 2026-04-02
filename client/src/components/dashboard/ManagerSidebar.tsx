import {
  BellRing,
  BarChart3,
  BookOpen,
  CircleHelp,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import vahaniLogo from "@/assets/vahani-logo.png";
import { useAuth } from "@/contexts/AuthContext";

const primaryNav = [
  { icon: LayoutDashboard, label: "Overview", value: "overview" },
  { icon: BookOpen, label: "Programmes", value: "programmes" },
  { icon: BarChart3, label: "Analytics", value: "analytics" },
  { icon: BellRing, label: "Announcements", value: "announcements" },
  { icon: FileText, label: "Evaluation", value: "evaluation" },
  { icon: BarChart3, label: "Reports", value: "reports" },
  { icon: CircleHelp, label: "Queries", value: "queries" },
  { icon: Users, label: "Students", value: "students" },
];

export function ManagerSidebar({
  activeSection,
  onSelectSection,
}: {
  activeSection: string;
  onSelectSection: (section: string) => void;
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <img src={vahaniLogo} alt="Vahani" className="h-9 w-9 rounded-lg object-cover" />
          <div>
            <p className="text-lg font-bold tracking-tight text-foreground">Vahani LMS</p>
            <p className="text-xs text-muted-foreground">Programme Manager</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1 text-muted-foreground hover:text-foreground lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {primaryNav.map((item) => (
          <button
            key={item.value}
            onClick={() => {
              onSelectSection(item.value);
              setOpen(false);
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
              activeSection === item.value
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="space-y-1 border-t border-border px-3 py-4">
        <button
          onClick={() => navigate("/settings")}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-all hover:bg-sidebar-accent/50"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <button
          onClick={() => {
            void logout().then(() => navigate("/"));
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive transition-all hover:bg-destructive/10"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-border bg-card p-2 shadow-md lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        {sidebarContent}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-card shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
