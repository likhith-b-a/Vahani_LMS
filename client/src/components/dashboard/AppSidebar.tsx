import { useEffect } from "react";
import {
  LayoutDashboard, BookPlus, BookOpen, Award,
  CalendarCheck, ClipboardList, Megaphone,
  BarChart3, CircleHelp, MessageSquarePlus
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
  { icon: MessageSquarePlus, label: "Suggestions", to: "/wishlist" },
];

export function AppSidebar() {
  // Radix portals (dialog/select/dropdown/toast) mount to document.body, outside
  // the .scholar-theme wrapper div — mirror the class on body so CSS vars reach them.
  useEffect(() => {
    document.body.classList.add("scholar-theme");
    return () => document.body.classList.remove("scholar-theme");
  }, []);

  return <SidebarShell navItems={mainNav} />;
}
