import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { type AdminProgramme, type AdminUser, type AdminUserRole } from "@/api/admin";
import type { CreateAnnouncementPayload } from "@/api/announcements";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const roleLabel = (role: AdminUserRole) =>
  role === "programme_manager"
    ? "Programme manager"
    : role === "admin"
      ? "Admin"
      : "Scholar";

interface AdminAnnouncementFormState {
  title: string;
  message: string;
  programmeId: string;
  targetBatch: string;
  targetRoles: string[];
  userIds: string[];
}

const emptyAnnouncementForm: AdminAnnouncementFormState = {
  title: "",
  message: "",
  programmeId: "",
  targetBatch: "",
  targetRoles: ["scholar"],
  userIds: [],
};

interface AdminAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programmes: AdminProgramme[];
  users: AdminUser[];
  scholarBatches: string[];
  onSubmit: (payload: CreateAnnouncementPayload) => void;
}

export function AdminAnnouncementDialog({
  open,
  onOpenChange,
  programmes,
  users,
  scholarBatches,
  onSubmit,
}: AdminAnnouncementDialogProps) {
  const { toast } = useToast();
  const [announcementForm, setAnnouncementForm] =
    useState<AdminAnnouncementFormState>(emptyAnnouncementForm);

  useEffect(() => {
    if (open) setAnnouncementForm(emptyAnnouncementForm);
  }, [open]);

  const announcementAudienceUsers = useMemo(
    () =>
      users.filter((entry) => {
        const roleMatch =
          announcementForm.targetRoles.length === 0 ||
          announcementForm.targetRoles.includes(entry.role);
        const batchMatch =
          !announcementForm.targetBatch ||
          entry.role !== "scholar" ||
          entry.batch === announcementForm.targetBatch;
        const programmeMatch =
          !announcementForm.programmeId ||
          (entry.role === "scholar" &&
            entry.enrollments.some(
              (enrollment) => enrollment.programme.id === announcementForm.programmeId,
            )) ||
          (entry.role === "programme_manager" &&
            entry.programmes.some((programme) => programme.id === announcementForm.programmeId));
        return roleMatch && batchMatch && programmeMatch;
      }),
    [announcementForm.programmeId, announcementForm.targetBatch, announcementForm.targetRoles, users],
  );

  const handleSubmit = () => {
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      toast({
        title: "Announcement details required",
        description: "Fill in the announcement title and message.",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      title: announcementForm.title.trim(),
      message: announcementForm.message.trim(),
      programmeId: announcementForm.programmeId || undefined,
      targetBatch: announcementForm.targetBatch || undefined,
      targetRoles: announcementForm.targetRoles,
      userIds: announcementForm.userIds.length ? announcementForm.userIds : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send announcement</DialogTitle>
          <DialogDescription>Target users by programme, role, batch, or specific people.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Programme filter</Label>
              <Select
                value={announcementForm.programmeId || "all"}
                onValueChange={(value: string) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    programmeId: value === "all" ? "" : value,
                    userIds: [],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All programmes</SelectItem>
                  {programmes.map((programme) => (
                    <SelectItem key={programme.id} value={programme.id}>
                      {programme.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Batch filter</Label>
              <Select
                value={announcementForm.targetBatch || "all"}
                onValueChange={(value: string) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    targetBatch: value === "all" ? "" : value,
                    userIds: [],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All batches</SelectItem>
                  {scholarBatches.map((batch) => (
                    <SelectItem key={batch} value={batch}>
                      {batch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Role filters</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {(["scholar", "programme_manager", "admin"] as const).map((role) => (
                <label key={role} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                  <Checkbox
                    checked={announcementForm.targetRoles.includes(role)}
                    onCheckedChange={() =>
                      setAnnouncementForm((current) => ({
                        ...current,
                        targetRoles: current.targetRoles.includes(role)
                          ? current.targetRoles.filter((item) => item !== role)
                          : [...current.targetRoles, role],
                        userIds: [],
                      }))
                    }
                  />
                  <span>{roleLabel(role)}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Specific users</Label>
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
              {announcementAudienceUsers.map((member) => (
                <label key={member.id} className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={announcementForm.userIds.includes(member.id)}
                    onCheckedChange={() =>
                      setAnnouncementForm((current) => ({
                        ...current,
                        userIds: current.userIds.includes(member.id)
                          ? current.userIds.filter((id) => id !== member.id)
                          : [...current.userIds, member.id],
                      }))
                    }
                  />
                  <span>
                    {member.name} • {roleLabel(member.role)}
                    {member.batch ? ` • ${member.batch}` : ""}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={announcementForm.title}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setAnnouncementForm((current) => ({ ...current, title: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea
              rows={5}
              value={announcementForm.message}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setAnnouncementForm((current) => ({ ...current, message: event.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Send announcement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
