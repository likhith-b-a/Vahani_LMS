import { Bell, Flame, ChevronDown, LogOut, User, Settings, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { useNotifications } from "@/contexts/NotificationsContext";

export function TopNavbar() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    void logout().then(() => navigate("/"));
  };

  const handleNotificationAction = async (notificationId: string) => {
    await markAsRead([notificationId]);
    setNotificationsOpen(false);
  };

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <>
      <header className="h-14 lg:h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 px-4 pl-14 lg:pl-8 lg:px-8 flex items-center justify-between">
        <h1 className="text-xs lg:text-sm font-medium text-muted-foreground uppercase tracking-widest truncate">
          Scholar Dashboard
        </h1>
        <div className="flex items-center gap-2 sm:gap-5">
          {/* Streak - hidden on very small screens */}
          <div className="hidden sm:flex items-center gap-2 bg-vahani-gold-light px-3 py-1.5 rounded-full border border-vahani-gold-border">
            <Flame size={16} className="text-accent fill-accent" />
            <span className="text-sm font-bold text-accent-foreground tabular-nums">12 Day Streak</span>
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen((current) => !current)}
              className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-border bg-card py-2 shadow-lg">
                <div className="flex items-center justify-between px-4 pb-2">
                  <p className="text-sm font-semibold text-foreground">Notifications</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => void markAsRead(notifications.filter((item) => !item.isRead).map((item) => item.id))}
                      className="text-xs text-vahani-blue hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 space-y-1 overflow-y-auto px-2">
                  {notifications.length > 0 ? notifications.slice(0, 8).map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() =>
                        void handleNotificationAction(notification.id)
                      }
                      className={`w-full rounded-lg px-3 py-3 text-left transition-colors ${
                        notification.isRead ? "hover:bg-secondary/40" : "bg-secondary/50 hover:bg-secondary"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{notification.title}</p>
                        {!notification.isRead && <span className="mt-1 h-2 w-2 rounded-full bg-vahani-blue" />}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                    </button>
                  )) : (
                    <p className="px-3 py-4 text-sm text-muted-foreground">No notifications yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 hover:bg-secondary rounded-lg px-2 py-1.5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-vahani-blue flex items-center justify-center text-primary-foreground text-xs font-bold">
                {initials}
              </div>
              <span className="hidden sm:inline text-sm font-medium text-foreground">{user?.name || "User"}</span>
              <ChevronDown size={14} className={`hidden sm:block text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                <button onClick={() => { setDropdownOpen(false); navigate("/profile"); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
                  <User size={16} className="text-muted-foreground" /> Profile
                </button>
                <button onClick={() => { setDropdownOpen(false); navigate("/settings"); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
                  <Settings size={16} className="text-muted-foreground" /> Settings
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); setChangePasswordOpen(true); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <Lock size={16} className="text-muted-foreground" /> Change Password
                </button>
                <div className="border-t border-border my-1" />
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <ChangePasswordModal open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </>
  );
}
