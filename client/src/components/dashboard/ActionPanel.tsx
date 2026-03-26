import { BookPlus, BookOpen, BookCheck, Award, CalendarCheck } from "lucide-react";

const actions = [
  { icon: BookPlus, label: "Register for Courses", primary: true },
  { icon: BookOpen, label: "View Available Courses" },
  { icon: BookCheck, label: "View Completed Courses" },
  { icon: Award, label: "Download Certificates" },
  { icon: CalendarCheck, label: "Check Attendance" },
];

export function ActionPanel() {
  return (
    <div className="bg-vahani-blue p-6 rounded-xl">
      <h3 className="font-bold text-primary-foreground mb-4">Quick Actions</h3>
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.label}
            className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
              action.primary
                ? "bg-accent text-accent-foreground hover:brightness-110"
                : "bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
            }`}
          >
            <action.icon size={16} />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
