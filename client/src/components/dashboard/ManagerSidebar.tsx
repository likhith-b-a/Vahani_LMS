import {
  BellRing,
  BarChart3,
  BookOpen,
  CircleHelp,
  FileText,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { SidebarShell } from "./SidebarShell";

export function getManagerSectionRoute(
  basePath: "/tutor" | "/programme-manager",
  section: string,
) {
  const normalizedSection = section.replace(/^\/+/, "");
  if (!normalizedSection || normalizedSection === "overview") {
    return basePath;
  }

  return `${basePath}/${normalizedSection}`;
}

export function ManagerSidebar({ basePath }: { basePath: "/tutor" | "/programme-manager" }) {
  const primaryNav = [
    { icon: LayoutDashboard, label: "Overview", to: basePath, end: true },
    { icon: BookOpen, label: "Programmes", to: `${basePath}/programmes`, end: true },
    { icon: BarChart3, label: "Analytics", to: `${basePath}/analytics` },
    { icon: BellRing, label: "Announcements", to: `${basePath}/announcements` },
    { icon: FileText, label: "Evaluation", to: `${basePath}/evaluation` },
    { icon: BarChart3, label: "Reports", to: `${basePath}/reports` },
    { icon: CircleHelp, label: "Queries", to: `${basePath}/queries` },
    { icon: Users, label: "Students", to: `${basePath}/students` },
  ];

  return <SidebarShell navItems={primaryNav} subtitle="Programme Manager" />;
}
