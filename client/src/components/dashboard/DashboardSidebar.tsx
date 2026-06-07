import { useNavigate } from "react-router-dom";
import vahaniLogo from "@/assets/vahani-logo.png";

export function DashboardSidebar({
  navItems,
  activeSection,
  onSelectSection,
  subtitle,
  openMenuAriaLabel,
  settingsLabel,
}: {
  navItems: { icon: any; label: string; value?: string; path?: string }[];
  activeSection: string;
  onSelectSection: (section: string) => void;
  subtitle?: string;
  openMenuAriaLabel?: string;
  settingsLabel?: string;
}) {
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex w-64 border-r border-border bg-card flex-col sticky top-0 h-screen shrink-0">
      <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <img src={vahaniLogo} alt="Vahani" className="w-9 h-9 rounded-lg object-cover" />
          <div>
            <div className="font-bold tracking-tight text-lg text-foreground">Vahani LMS</div>
            {subtitle ? <div className="text-xs text-muted-foreground">{subtitle}</div> : null}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              if (item.path) navigate(item.path);
              else if (item.value) onSelectSection(item.value);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              item.value === activeSection ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-border space-y-0.5">
        <button
          onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <span>{settingsLabel || "Settings"}</span>
        </button>
      </div>
    </aside>
  );
}

export default DashboardSidebar;
