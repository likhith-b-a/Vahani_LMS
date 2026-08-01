import { useEffect, useState, type ChangeEvent } from "react";
import { Download, Pencil } from "lucide-react";
import { type AdminUser, type AdminUserPayload, type AdminUserRole } from "@/api/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const roleLabel = (role: AdminUserRole) =>
  role === "programme_manager"
    ? "Programme manager"
    : role === "admin"
      ? "Admin"
      : "Scholar";

interface AdminUserFormState {
  name: string;
  email: string;
  password: string;
  role: AdminUserRole;
  batch: string;
  gender: string;
  phoneNumber: string;
  creditsEarned: string;
}

const emptyUserForm: AdminUserFormState = {
  name: "",
  email: "",
  password: "vahani123",
  role: "scholar",
  batch: "",
  gender: "RatherNoTSay",
  phoneNumber: "",
  creditsEarned: "0",
};

const userToFormState = (user: AdminUser): AdminUserFormState => ({
  name: user.name,
  email: user.email,
  password: "",
  role: user.role,
  batch: user.batch || "",
  gender: user.gender || "RatherNoTSay",
  phoneNumber: user.phoneNumber || "",
  creditsEarned: String(user.creditsEarned ?? 0),
});

interface BulkUserImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDownloadingUserTemplate: boolean;
  isImportingUsers: boolean;
  onDownloadTemplate: () => void;
  onImportUsers: (file: File) => void;
}

export function BulkUserImportDialog({
  open,
  onOpenChange,
  isDownloadingUserTemplate,
  isImportingUsers,
  onDownloadTemplate,
  onImportUsers,
}: BulkUserImportDialogProps) {
  const { toast } = useToast();
  const [bulkUserFile, setBulkUserFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) setBulkUserFile(null);
  }, [open]);

  const handleImport = () => {
    if (!bulkUserFile) {
      toast({
        title: "Select a file first",
        description: "Choose the filled template before importing users.",
        variant: "destructive",
      });
      return;
    }
    onImportUsers(bulkUserFile);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add multiple users</DialogTitle>
          <DialogDescription>
            Download the template, fill in one row per user, then upload the completed
            sheet to create users in bulk.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-muted/20 p-4">
            <p className="text-sm font-medium text-foreground">Template columns</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The template includes: <span className="font-medium">name</span>,{" "}
              <span className="font-medium">email</span>,{" "}
              <span className="font-medium">password</span>,{" "}
              <span className="font-medium">role</span>,{" "}
              <span className="font-medium">batch</span>,{" "}
              <span className="font-medium">gender</span>,{" "}
              <span className="font-medium">phoneNumber</span>, and{" "}
              <span className="font-medium">creditsEarned</span>.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onDownloadTemplate}
              disabled={isDownloadingUserTemplate}
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloadingUserTemplate ? "Downloading..." : "Download template"}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-user-import">Upload filled sheet</Label>
            <Input
              id="bulk-user-import"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setBulkUserFile(event.target.files?.[0] || null)
              }
            />
            <p className="text-xs text-muted-foreground">
              Required columns are name, email, password, role, and gender. Scholar
              rows should also include batch. Allowed roles are scholar,
              programme_manager, and admin.
            </p>
            {bulkUserFile && (
              <p className="text-sm text-foreground">Selected file: {bulkUserFile.name}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isImportingUsers}>
            {isImportingUsers ? "Importing..." : "Upload users"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AdminUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: AdminUser | null;
  onSubmit: (payload: AdminUserPayload, editingUserId: string | null) => void;
}

export function AdminUserDialog({
  open,
  onOpenChange,
  editingUser,
  onSubmit,
}: AdminUserDialogProps) {
  const { toast } = useToast();
  const [userForm, setUserForm] = useState<AdminUserFormState>(emptyUserForm);

  useEffect(() => {
    if (open) {
      setUserForm(editingUser ? userToFormState(editingUser) : emptyUserForm);
    }
  }, [open, editingUser]);

  const handleSubmit = () => {
    const trimmedName = userForm.name.trim();
    const trimmedEmail = userForm.email.trim().toLowerCase();
    const trimmedBatch = userForm.batch.trim();
    const trimmedGender = userForm.gender.trim();
    const trimmedPhone = userForm.phoneNumber.trim();
    const trimmedPassword = userForm.password.trim();

    if (!trimmedName || !trimmedEmail || !userForm.role || (!editingUser && !trimmedPassword)) {
      toast({
        title: "Missing user details",
        description: "Name, email, role, gender, and password are required for new users.",
        variant: "destructive",
      });
      return;
    }

    if (!trimmedGender) {
      toast({
        title: "Gender required",
        description: "Add the user's gender before saving this profile.",
        variant: "destructive",
      });
      return;
    }

    if (userForm.role === "scholar" && !trimmedBatch) {
      toast({
        title: "Batch required",
        description: "Every scholar should have a batch before the user is created.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast({
        title: "Invalid email",
        description: "Enter a valid email address before saving the user.",
        variant: "destructive",
      });
      return;
    }

    onSubmit(
      {
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        role: userForm.role,
        batch: userForm.role === "scholar" ? trimmedBatch : "",
        gender: trimmedGender,
        phoneNumber: trimmedPhone,
        creditsEarned: Number(userForm.creditsEarned || 0),
      },
      editingUser?.id || null,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingUser ? "Edit user" : "Create user"}</DialogTitle>
          <DialogDescription>Add or update user details here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input
              value={userForm.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setUserForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input
              value={userForm.email}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setUserForm((current) => ({ ...current, email: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role *</Label>
            <Select
              value={userForm.role}
              onValueChange={(value: AdminUserRole) =>
                setUserForm((current) => ({ ...current, role: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scholar">Scholar</SelectItem>
                <SelectItem value="programme_manager">Programme manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Phone number</Label>
            <Input
              value={userForm.phoneNumber}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setUserForm((current) => ({
                  ...current,
                  phoneNumber: event.target.value,
                }))
              }
            />
          </div>
          <>
            {userForm.role === "scholar" && (
              <div className="space-y-1.5">
                <Label>Batch *</Label>
                <Input
                  value={userForm.batch}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setUserForm((current) => ({ ...current, batch: event.target.value }))
                  }
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Gender *</Label>
              <Select
                value={userForm.gender || "RatherNoTSay"}
                onValueChange={(value: string) =>
                  setUserForm((current) => ({ ...current, gender: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="RatherNoTSay">RatherNoTSay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {userForm.role === "scholar" && (
              <div className="space-y-1.5">
                <Label>Credits earned</Label>
                <Input
                  type="number"
                  min="0"
                  value={userForm.creditsEarned}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setUserForm((current) => ({
                      ...current,
                      creditsEarned: event.target.value,
                    }))
                  }
                />
              </div>
            )}
          </>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Password {editingUser ? "(optional)" : "*"}</Label>
            <Input
              type="password"
              value={userForm.password}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setUserForm((current) => ({ ...current, password: event.target.value }))
              }
            />
            {!editingUser ? (
              <p className="text-xs text-muted-foreground">
                Default password is <span className="font-medium">vahani123</span>.
              </p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {editingUser ? "Update user" : "Create user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AdminUserDetailsDialogProps {
  selectedUser: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  onEditUser: (user: AdminUser) => void;
}

export function AdminUserDetailsDialog({
  selectedUser,
  onOpenChange,
  onEditUser,
}: AdminUserDetailsDialogProps) {
  return (
    <Dialog open={!!selectedUser} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>User details</DialogTitle>
          <DialogDescription>Review the selected user profile.</DialogDescription>
        </DialogHeader>
        {selectedUser && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{selectedUser.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                <Badge variant="secondary">{roleLabel(selectedUser.role)}</Badge>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="mt-1 font-medium text-foreground">
                  {selectedUser.phoneNumber || "--"}
                </p>
              </div>
              <div className="rounded-xl bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">Gender</p>
                <p className="mt-1 font-medium text-foreground">
                  {selectedUser.gender || "--"}
                </p>
              </div>
              {selectedUser.role === "scholar" && (
                <>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">Batch</p>
                    <p className="mt-1 font-medium text-foreground">
                      {selectedUser.batch || "--"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">Active programmes</p>
                    <p className="mt-1 font-medium text-foreground">
                      {selectedUser.enrolledProgrammesCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">Credits earned</p>
                    <p className="mt-1 font-medium text-foreground">
                      {selectedUser.creditsEarned}
                    </p>
                  </div>
                </>
              )}
              {selectedUser.role === "programme_manager" && (
                <>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">Managed courses</p>
                    <p className="mt-1 font-medium text-foreground">
                      {selectedUser.managedProgrammesCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs text-muted-foreground">Currently handling</p>
                    <p className="mt-1 font-medium text-foreground">
                      {selectedUser.programmes.length}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEditUser(selectedUser);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit user
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
