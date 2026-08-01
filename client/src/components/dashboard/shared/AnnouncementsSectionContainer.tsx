import { useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAnnouncements } from "@/contexts/AnnouncementsContext";

interface AnnouncementsSectionContainerProps {
  title: string;
  description: string;
  variant?: "admin" | "manager";
  onOpenDialog?: () => void;
}

const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "No date";

const matchesDateRange = (
  value: string | null | undefined,
  from: string,
  to: string,
) => {
  if (!value) return !from && !to;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return false;
  if (from && target < new Date(from).getTime()) return false;
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    if (target > toDate.getTime()) return false;
  }
  return true;
};

export function AnnouncementsSectionContainer({
  title,
  description,
  variant = "manager",
  onOpenDialog,
}: AnnouncementsSectionContainerProps) {
  const { announcements, loading } = useAnnouncements();
  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [announcementDateFrom, setAnnouncementDateFrom] = useState("");
  const [announcementDateTo, setAnnouncementDateTo] = useState("");

  const filteredAnnouncements = useMemo(
    () =>
      announcements.filter((announcement) => {
        const searchTarget = `${announcement.title} ${announcement.message} ${announcement.programme?.title || ""}`
          .toLowerCase();
        const matchesSearch =
          !announcementSearch.trim() ||
          searchTarget.includes(announcementSearch.toLowerCase());
        const matchesTimeline = matchesDateRange(
          announcement.createdAt,
          announcementDateFrom,
          announcementDateTo,
        );
        return matchesSearch && matchesTimeline;
      }),
    [announcementDateFrom, announcementDateTo, announcementSearch, announcements],
  );

  const isAdmin = variant === "admin";

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {onOpenDialog && (
            <Button onClick={onOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Send announcement
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          className={`grid gap-3 ${
            isAdmin ? "lg:grid-cols-[1.2fr_200px_200px]" : "lg:grid-cols-[1fr_180px_180px]"
          }`}
        >
          {isAdmin && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={announcementSearch}
                onChange={(event) => setAnnouncementSearch(event.target.value)}
                placeholder="Search announcements by title, message, or programme"
                className="pl-9"
              />
            </div>
          )}
          {!isAdmin && (
            <Input
              value={announcementSearch}
              onChange={(event) => setAnnouncementSearch(event.target.value)}
              placeholder="Search announcements by title, message, or programme"
            />
          )}
          <Input
            type="date"
            value={announcementDateFrom}
            onChange={(event) => setAnnouncementDateFrom(event.target.value)}
          />
          <Input
            type="date"
            value={announcementDateTo}
            onChange={(event) => setAnnouncementDateTo(event.target.value)}
          />
        </div>

        <div className="space-y-4">
          {loading && announcements.length === 0 && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading announcements...
            </p>
          )}
          {!loading && filteredAnnouncements.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No announcements match the current filters.
            </p>
          )}
          {!loading &&
            filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className={`rounded-2xl border border-border p-4 ${
                  isAdmin ? "bg-card" : ""
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">
                    {announcement.title}
                  </p>
                  <Badge variant="outline">
                    {announcement.programme?.title || "General"}
                  </Badge>
                  {isAdmin && (
                    <Badge variant="secondary">
                      {announcement.recipients?.length ||
                        announcement.recipientCount ||
                        0}{" "}
                      recipients
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {announcement.message}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{formatDateTime(announcement.createdAt)}</span>
                  {isAdmin && announcement.targetBatch && (
                    <span>Batch {announcement.targetBatch}</span>
                  )}
                  {isAdmin && announcement.targetRoles?.length && (
                    <span>Roles: {announcement.targetRoles.join(", ")}</span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
