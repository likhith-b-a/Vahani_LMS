import { useMemo } from "react";
import {
  Award,
  BookCheck,
  BookOpen,
  CalendarCheck,
  ClipboardList,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useAssignments } from "../../contexts/AssignmentsContext";

export function StatsCards() {
  const { user } = useAuth();
  const { pendingAssignments, completedAssignments, assignments, loading, error } =
    useAssignments();

  const enrolments = user?.enrollments || [];
  const activeProgrammes = enrolments.filter(
    (enrolment) => enrolment.status === "active",
  ).length;
  const completedProgrammes = enrolments.filter(
    (enrolment) => enrolment.status === "completed",
  ).length;
  const gradedAssignments = completedAssignments.filter(
    (assignment) => assignment.submission?.score !== null && assignment.submission?.score !== undefined,
  ).length;

  const stats = useMemo(
    () => [
      {
        icon: BookOpen,
        label: "Courses Enrolled",
        value: enrolments.length,
        sub: `${activeProgrammes} active`,
        color: "text-vahani-blue",
      },
      {
        icon: BookCheck,
        label: "Completed",
        value: completedProgrammes,
        sub: `${activeProgrammes} ongoing`,
        color: "text-success",
      },
      {
        icon: ClipboardList,
        label: "Pending Tasks",
        value: loading ? "..." : error ? "--" : pendingAssignments.length,
        sub: error
          ? "Assignments unavailable"
          : `${completedAssignments.length} submitted`,
        color: "text-accent",
      },
      {
        icon: CalendarCheck,
        label: "Submitted",
        value: loading ? "..." : error ? "--" : completedAssignments.length,
        sub: error ? "Assignments unavailable" : `${gradedAssignments} graded`,
        color: "text-vahani-blue",
      },
      {
        icon: Award,
        label: "Assignments",
        value: loading ? "..." : error ? "--" : assignments.length,
        sub: error ? "Assignments unavailable" : `${pendingAssignments.length} open`,
        color: "text-accent",
      },
    ],
    [
      activeProgrammes,
      assignments.length,
      completedAssignments.length,
      completedProgrammes,
      enrolments.length,
      error,
      gradedAssignments,
      loading,
      pendingAssignments.length,
    ],
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          className="rounded-xl border border-border bg-card p-3 sm:p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-tight text-muted-foreground sm:text-xs">
              {stat.label}
            </p>
            <stat.icon size={16} className={stat.color} />
          </div>
          <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
            <span className="text-xl font-bold tabular-nums sm:text-2xl">
              {stat.value}
            </span>
            {stat.sub && (
              <span className="text-[10px] text-muted-foreground sm:text-xs">
                {stat.sub}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
