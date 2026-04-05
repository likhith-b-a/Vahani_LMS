import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "../components/dashboard/AppSidebar";
import { TopNavbar } from "../components/dashboard/TopNavbar";
import { ManagerSidebar } from "../components/dashboard/ManagerSidebar";
import { AdminSidebar } from "../components/dashboard/AdminSidebar";
import { useAuth } from "../contexts/AuthContext";
import { Moon, Sun, Type, Zap, Lock } from "lucide-react";
import { Switch } from "../components/ui/switch";
import { Button } from "../components/ui/button";
import { ChangePasswordModal } from "../components/dashboard/ChangePasswordModal";

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [animations, setAnimations] = useState(true);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const toggleDark = (checked: boolean) => {
    setDarkMode(checked);
    document.documentElement.classList.toggle("dark", checked);
  };

  const applyFontSize = (size: "small" | "medium" | "large") => {
    setFontSize(size);
    const root = document.documentElement;
    root.style.fontSize = size === "small" ? "14px" : size === "large" ? "18px" : "16px";
  };

  const fontSizes = [
    { value: "small" as const, label: "Small", desc: "Compact view" },
    { value: "medium" as const, label: "Medium", desc: "Default" },
    { value: "large" as const, label: "Large", desc: "Easier to read" },
  ];

  const isManager = user?.role === "programme_manager" || user?.role === "tutor";
  const isAdmin = user?.role === "admin";

  const settingsCopy = useMemo(() => {
    if (isManager) {
      return {
        title: "Manager Settings",
        description: "Adjust how your programme workspace feels and behaves.",
        roleLabel: "Programme Manager",
      };
    }

    if (isAdmin) {
      return {
        title: "Workspace Settings",
        description: "Control how the admin workspace feels while you review the platform.",
        roleLabel: "Admin Control",
      };
    }

    return {
      title: "Settings",
      description: "Customize your LMS experience",
      roleLabel: "Scholar Workspace",
    };
  }, [isAdmin, isManager]);

  return (
    <div className="flex min-h-screen bg-background">
      {isManager ? (
        <ManagerSidebar
          activeSection="settings"
          onSelectSection={(section) => navigate(`/programme-manager?section=${section}`)}
        />
      ) : isAdmin ? (
        <AdminSidebar activeSection="settings" onSelectSection={() => navigate("/admin")} />
      ) : (
        <AppSidebar activePage="Overview" />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {isManager || isAdmin ? (
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 pl-14 backdrop-blur-md lg:px-8 lg:pl-8">
            <div>
              <h1 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                {settingsCopy.roleLabel}
              </h1>
              <p className="text-xs text-muted-foreground">Welcome, {user?.name}</p>
            </div>
          </header>
        ) : (
          <TopNavbar />
        )}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{settingsCopy.title}</h1>
              <p className="text-muted-foreground text-sm">{settingsCopy.description}</p>
            </div>

            {/* Theme */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                {darkMode ? <Moon size={16} /> : <Sun size={16} />} Appearance
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
                </div>
                <Switch checked={darkMode} onCheckedChange={toggleDark} />
              </div>
            </div>

            {/* Font Size */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Type size={16} /> Font Size
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {fontSizes.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => applyFontSize(s.value)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      fontSize === s.value
                        ? "border-accent bg-vahani-gold-light text-accent-foreground font-semibold"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block text-xs text-muted-foreground">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Animations */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Zap size={16} /> Preferences
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enable Animations</p>
                  <p className="text-xs text-muted-foreground">Smooth transitions and effects</p>
                </div>
                <Switch checked={animations} onCheckedChange={setAnimations} />
              </div>
            </div>

            {/* Account */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Lock size={16} /> Account
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Change Password</p>
                  <p className="text-xs text-muted-foreground">Update your account password</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setChangePasswordOpen(true)}>
                  Change
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
      <ChangePasswordModal open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}
