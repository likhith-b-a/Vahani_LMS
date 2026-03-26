import { BellRing, Megaphone, Sparkles } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationsContext";

const formatTimeAgo = (value: string) => {
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.max(1, Math.floor(diff / (1000 * 60 * 60)));

  if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

const getNotificationLabel = (type: string) => {
  switch (type) {
    case "ANNOUNCEMENT":
      return "Announcement";
    case "ASSIGNMENT":
      return "Assignment";
    case "GRADE":
      return "Marks";
    case "PROGRAMME":
      return "Programme";
    case "RESOURCE":
      return "Resource";
    case "MEETING":
      return "Meeting";
    case "QUERY":
      return "Query";
    case "CERTIFICATE":
      return "Certificate";
    default:
      return "Update";
  }
};

export function Announcements() {
  const { notifications, loading } = useNotifications();
  const items = notifications.slice(0, 6);

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-vahani-blue" />
          <h3 className="text-lg font-bold">Announcements</h3>
        </div>
        <span className="text-sm font-semibold text-vahani-blue">
          {loading ? "..." : `${items.length} updates`}
        </span>
      </div>

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading updates...</p>
        ) : items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-secondary/50 ${
                item.isRead
                  ? "border-border bg-card"
                  : "border-vahani-blue/20 bg-vahani-blue/5"
              }`}
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                {item.isRead ? <BellRing size={14} /> : <Sparkles size={14} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-card-foreground">
                    {item.title}
                  </p>
                  {!item.isRead && (
                    <span className="rounded-full bg-vahani-blue/10 px-2 py-0.5 text-[10px] font-bold uppercase text-vahani-blue">
                      New
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(item.createdAt)}
                  </span>
                  <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                    {getNotificationLabel(item.type)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.message}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No updates yet.</p>
        )}
      </div>
    </section>
  );
}
