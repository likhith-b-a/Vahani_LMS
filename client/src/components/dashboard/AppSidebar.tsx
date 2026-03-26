import {
  LayoutDashboard, BookPlus, BookOpen, Award,
  CalendarCheck, ClipboardList, FolderOpen, Megaphone,
  BarChart3, Settings, LogOut, Menu, X, CircleHelp
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import vahaniLogo from "@/assets/vahani-logo.png";

const mainNav = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: BookPlus, label: "Course Registration", path: "/courses" },
  { icon: BookOpen, label: "My Programmes", path: "/my-programmes" },
  { icon: Award, label: "Certificates", path: "/certificates" },
  { icon: CalendarCheck, label: "Attendance", path: "/attendance" },
  { icon: ClipboardList, label: "Assignments", path: "/assignments" },
  { icon: CircleHelp, label: "Queries", path: "/queries" },
  { icon: FolderOpen, label: "Resources", path: "/dashboard" },
  { icon: Megaphone, label: "Announcements", path: "/updates" },
  { icon: BarChart3, label: "Performance Reports", path: "/dashboard" },
];

const bottomNav = [
  { icon: Settings, label: "Settings" },
  { icon: LogOut, label: "Logout", danger: true },
];

export function AppSidebar({ activePage = "Dashboard" }: { activePage?: string }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleBottomClick = (label: string) => {
    if (label === "Logout") {
      void logout().then(() => navigate("/"));
    }
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <img src={vahaniLogo} alt="Vahani" className="w-9 h-9 rounded-lg object-cover" />
          <span className="font-bold tracking-tight text-lg text-foreground">Vahani LMS</span>
        </div>
        <button onClick={() => setOpen(false)} className="lg:hidden p-1 text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {mainNav.map((item) => (
          <button
            key={item.label}
            onClick={() => { navigate(item.path); setOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              item.label === activePage
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom Nav */}
      <div className="px-3 py-4 border-t border-border space-y-0.5">
        {bottomNav.map((item) => (
          <button
            key={item.label}
            onClick={() => handleBottomClick(item.label)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              item.danger
                ? "text-destructive hover:bg-destructive/10"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger trigger */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-lg shadow-md"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card flex-col sticky top-0 h-screen shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile/Tablet overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-card flex flex-col h-full shadow-xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
