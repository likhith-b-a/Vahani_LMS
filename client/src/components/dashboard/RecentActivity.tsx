import { BookOpen, ClipboardList, Award, CheckCircle } from "lucide-react";

const activities = [
  { icon: BookOpen, text: "Joined Power BI Fundamentals", time: "Today, 9:00 AM" },
  { icon: ClipboardList, text: "Submitted Excel Assignment #4", time: "Yesterday, 5:30 PM" },
  { icon: Award, text: "Earned Communication Certificate", time: "Oct 18" },
  { icon: CheckCircle, text: "Completed Excel Module 6", time: "Oct 16" },
];

export function RecentActivity() {
  return (
    <section className="bg-card p-6 rounded-xl border border-border">
      <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
        <div className="space-y-4">
          {activities.map((a, i) => (
            <div key={i} className="flex items-start gap-4 relative">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-muted-foreground z-10 shrink-0">
                <a.icon size={14} />
              </div>
              <div className="pt-1">
                <p className="text-sm font-medium text-card-foreground">{a.text}</p>
                <p className="text-xs text-muted-foreground">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
