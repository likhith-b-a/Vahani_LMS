import {
  LayoutDashboard, BookPlus, BookOpen, Award,
  CalendarCheck, ClipboardList, Megaphone,
  BarChart3, CircleHelp
} from "lucide-react";
import { SidebarShell } from "./SidebarShell";

const mainNav = [
  { icon: LayoutDashboard, label: "Overview", to: "/dashboard", end: true },
  { icon: BookPlus, label: "Enrollments", to: "/enrollments" },
  { icon: BookOpen, label: "My Programmes", to: "/my-programmes" },
  { icon: Award, label: "Certificates", to: "/certificates" },
  { icon: CalendarCheck, label: "Attendance", to: "/attendance" },
  { icon: ClipboardList, label: "Assignments", to: "/assignments" },
  { icon: BarChart3, label: "Marks", to: "/marks" },
  { icon: Megaphone, label: "Announcements", to: "/updates" },
  { icon: CircleHelp, label: "Queries", to: "/queries" },
  { icon: BookPlus, label: "Wishlist", to: "/wishlist" },
];

export function AppSidebar() {
  return <SidebarShell navItems={mainNav} />;
}
