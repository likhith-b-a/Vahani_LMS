import { BookOpen, Calendar, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

function getPendingAssignmentsCount(
  assignments:
    | Array<{
        submissions?: unknown[];
      }>
    | undefined,
) {
  if (!assignments?.length) {
    return 0;
  }

  return assignments.filter((assignment) => !assignment.submissions?.length).length;
}

export function ActiveCourses() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const activeEnrollments =
    user?.enrollments?.filter((enrollment) => enrollment.status === "active") || [];

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">Enrolled Courses</h3>
        <button
          className="text-sm font-semibold text-vahani-blue hover:underline"
          onClick={() => navigate("/my-programmes")}
        >
          View All
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {activeEnrollments.map((enrollment, index) => (
          <motion.button
            type="button"
            key={enrollment.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07, duration: 0.35 }}
            whileHover={{ y: -4 }}
            onClick={() =>
              navigate(`/assignments?programmeId=${encodeURIComponent(enrollment.id)}`)
            }
            className="cursor-pointer rounded-xl border border-border bg-card p-4 text-left transition-shadow hover:shadow-lg sm:p-5"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                <BookOpen size={20} />
              </div>
              <span className="rounded bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                In Progress
              </span>
            </div>

            <h4 className="mb-1 font-bold leading-tight text-card-foreground">
              {enrollment.title}
            </h4>
            <p className="text-xs text-muted-foreground">
              {enrollment.programmeManager?.name || "Programme manager"}
            </p>

            <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ClipboardList size={12} />
                <span>
                  {getPendingAssignmentsCount((enrollment as { assignments?: { submissions?: unknown[] }[] }).assignments)} pending assignments
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={12} />
                <span>{enrollment.createdAt?.slice(0, 10) || "Recently enrolled"}</span>
              </div>
            </div>

            <div className="mt-4 border-t border-border pt-4 text-xs font-bold text-vahani-blue">
              Open assignments
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
