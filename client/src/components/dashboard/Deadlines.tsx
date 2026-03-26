import { format, isBefore, isWithinInterval, addDays } from "date-fns";
import { useAssignments } from "@/contexts/AssignmentsContext";

const statusStyles = {
  Urgent: "bg-destructive/10 text-destructive",
  Pending: "bg-accent/10 text-accent-foreground",
  Upcoming: "bg-secondary text-muted-foreground",
};

export function Deadlines() {
  const { upcomingAssignments, loading } = useAssignments();

  const deadlines = upcomingAssignments.map((assignment) => {
    const dueDate = new Date(assignment.dueDate);
    let status: keyof typeof statusStyles = "Upcoming";

    if (isBefore(dueDate, new Date())) {
      status = "Urgent";
    } else if (isWithinInterval(dueDate, { start: new Date(), end: addDays(new Date(), 3) })) {
      status = "Pending";
    }

    return {
      title: assignment.title,
      date: format(dueDate, "MMM d"),
      status,
    };
  });

  return (
    <div className="bg-card p-6 rounded-xl border border-border">
      <h3 className="font-bold mb-4">Assignments & Deadlines</h3>
      <div className="space-y-4">
        {loading && <p className="text-xs text-muted-foreground">Loading deadlines...</p>}
        {!loading && deadlines.length === 0 && (
          <p className="text-xs text-muted-foreground">No pending assignment deadlines right now.</p>
        )}
        {deadlines.map((d) => (
          <div key={d.title} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-card-foreground">{d.title}</p>
              <p className="text-xs text-muted-foreground">{d.date}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${statusStyles[d.status]}`}>
              {d.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
