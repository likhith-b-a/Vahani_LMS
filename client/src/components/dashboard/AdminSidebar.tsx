import {
  BarChart3,
  BellRing,
  BookOpen,
  Settings2,
  Users,
} from "lucide-react";
import { SidebarShell } from "./SidebarShell";

export function getAdminSectionRoute(section: string) {
  const normalizedSection = section.replace(/^\/+/, "");
  if (!normalizedSection || normalizedSection === "overview") {
    return "/admin";
  }

  return `/admin/${normalizedSection}`;
}

const primaryNav = [
  { icon: BarChart3, label: "Overview", to: "/admin", end: true },
  { icon: Users, label: "Users", to: "/admin/users" },
  { icon: BookOpen, label: "Programmes", to: "/admin/programmes" },
  { icon: BarChart3, label: "Analytics", to: "/admin/analytics" },
  { icon: BellRing, label: "Announcements", to: "/admin/announcements" },
  { icon: Users, label: "Queries", to: "/admin/queries" },
  { icon: BarChart3, label: "Reports", to: "/admin/reports" },
  { icon: Settings2, label: "Settings", to: "/admin/settings" },
];

export function AdminSidebar() {
  return <SidebarShell navItems={primaryNav} hamburgerAriaLabel="Open admin menu" />;
}
