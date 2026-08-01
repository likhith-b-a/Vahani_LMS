import { LogOut, Menu, Settings, X } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import vahaniLogo from "@/assets/vahani-logo.png";
import { useAuth } from "@/contexts/AuthContext";

export interface SidebarNavItem {
  icon: ComponentType<{ size?: number }>;
  label: string;
  to: string;
  end?: boolean;
}

interface SidebarShellProps {
  navItems: SidebarNavItem[];
  title?: string;
  subtitle?: string;
  hamburgerAriaLabel?: string;
  settingsRoute?: string;
}

export function SidebarShell({
  navItems,
  title = "Vahani LMS",
  subtitle,
  hamburgerAriaLabel = "Open menu",
  settingsRoute = "/settings",
}: SidebarShellProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = () => {
    void logout().then(() => navigate("/"));
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-5">
        <div className="flex items-center gap-3">
          <img src={vahaniLogo} alt="Vahani" className="h-9 w-auto object-contain" />
          <div>
            <p className="text-lg font-bold tracking-tight text-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1 text-muted-foreground hover:text-foreground lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                isActive
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-border px-3 py-4">
        <button
          onClick={() => {
            navigate(settingsRoute);
            setOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-all hover:bg-sidebar-accent/50"
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <button
          onClick={handleLogout}
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
        aria-label={hamburgerAriaLabel}
      >
        <Menu size={20} />
      </button>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        {sidebarContent}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-card shadow-xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
