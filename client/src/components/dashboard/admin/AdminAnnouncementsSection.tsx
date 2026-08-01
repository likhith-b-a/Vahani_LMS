import type { ChangeEvent } from "react";
import { Plus, Search } from "lucide-react";
import { type Announcement } from "@/api/announcements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/dateFormat";

interface AdminAnnouncementsSectionProps {
  announcementSearch: string;
  onAnnouncementSearchChange: (value: string) => void;
  announcementDateFrom: string;
  onAnnouncementDateFromChange: (value: string) => void;
  announcementDateTo: string;
  onAnnouncementDateToChange: (value: string) => void;
  filteredAnnouncements: Announcement[];
  onOpenSendDialog: () => void;
}

export function AdminAnnouncementsSection({
  announcementSearch,
  onAnnouncementSearchChange,
  announcementDateFrom,
  onAnnouncementDateFromChange,
  announcementDateTo,
  onAnnouncementDateToChange,
  filteredAnnouncements,
  onOpenSendDialog,
}: AdminAnnouncementsSectionProps) {
  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Announcements</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Send filtered announcements and review sent messages by time range.
            </p>
          </div>
          <Button onClick={onOpenSendDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Send announcement
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_200px_200px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={announcementSearch}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onAnnouncementSearchChange(event.target.value)}
              placeholder="Search announcements by title, message, or programme"
              className="pl-9"
            />
          </div>
          <Input type="date" value={announcementDateFrom} onChange={(event: ChangeEvent<HTMLInputElement>) => onAnnouncementDateFromChange(event.target.value)} />
          <Input type="date" value={announcementDateTo} onChange={(event: ChangeEvent<HTMLInputElement>) => onAnnouncementDateToChange(event.target.value)} />
        </div>

        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <div key={announcement.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">{announcement.title}</p>
                <Badge variant="outline">{announcement.programme?.title || "General"}</Badge>
                <Badge variant="secondary">
                  {announcement.recipients?.length || announcement.recipientCount || 0} recipients
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{announcement.message}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>{formatDateTime(announcement.createdAt)}</span>
                {announcement.targetBatch && <span>Batch {announcement.targetBatch}</span>}
                {announcement.targetRoles?.length ? (
                  <span>Roles: {announcement.targetRoles.join(", ")}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
