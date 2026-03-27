import { type ChangeEvent } from "react";
import { Download, Mail, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { type AdminUser, type AdminUserRole } from "@/api/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const roleLabel = (role: AdminUserRole) =>
  role === "programme_manager"
    ? "Programme manager"
    : role === "admin"
      ? "Admin"
      : "Scholar";

interface AdminUsersSectionProps {
  userSearch: string;
  onUserSearchChange: (value: string) => void;
  userRoleFilter: "all" | AdminUserRole;
  onUserRoleFilterChange: (value: "all" | AdminUserRole) => void;
  userBatchFilter: string;
  onUserBatchFilterChange: (value: string) => void;
  scholarBatches: string[];
  filteredUsers: AdminUser[];
  selectedEmailUserIds: string[];
  onToggleEmailUser: (userId: string) => void;
  onSelectMatchedUsersForEmail: () => void;
  onClearSelectedUsers: () => void;
  onProceedToEmail: () => void;
  onOpenBulkImport: () => void;
  onOpenCreateUser: () => void;
  onOpenUserDetails: (user: AdminUser) => void;
  onOpenEditUser: (user: AdminUser) => void;
  onRequestDeleteUser: (user: AdminUser) => void;
}

export function AdminUsersSection({
  userSearch,
  onUserSearchChange,
  userRoleFilter,
  onUserRoleFilterChange,
  userBatchFilter,
  onUserBatchFilterChange,
  scholarBatches,
  filteredUsers,
  selectedEmailUserIds,
  onToggleEmailUser,
  onSelectMatchedUsersForEmail,
  onClearSelectedUsers,
  onProceedToEmail,
  onOpenBulkImport,
  onOpenCreateUser,
  onOpenUserDetails,
  onOpenEditUser,
  onRequestDeleteUser,
}: AdminUsersSectionProps) {
  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Users</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Search, filter, inspect, edit, and create platform users from one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={onSelectMatchedUsersForEmail}
              disabled={filteredUsers.length === 0}
            >
              <Mail className="mr-2 h-4 w-4" />
              Select matched
            </Button>
            <Button
              variant="outline"
              onClick={onClearSelectedUsers}
              disabled={selectedEmailUserIds.length === 0}
            >
              Clear selection
            </Button>
            <Button
              variant="outline"
              onClick={onProceedToEmail}
              disabled={selectedEmailUserIds.length === 0}
            >
              Proceed to email
            </Button>
            <Button variant="outline" onClick={onOpenBulkImport}>
              <Download className="mr-2 h-4 w-4" />
              Add multiple users
            </Button>
            <Button onClick={onOpenCreateUser}>
              <Plus className="mr-2 h-4 w-4" />
              Create user
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={userSearch}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onUserSearchChange(event.target.value)
              }
              placeholder="Search users by name, email, phone, or batch"
              className="pl-9"
            />
          </div>
          <Select
            value={userRoleFilter}
            onValueChange={(value: "all" | AdminUserRole) => onUserRoleFilterChange(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="scholar">Scholars</SelectItem>
              <SelectItem value="programme_manager">Programme managers</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
          {userRoleFilter === "scholar" ? (
            <Select value={userBatchFilter} onValueChange={onUserBatchFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="All batches" />
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
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-2 text-sm text-muted-foreground">
              {filteredUsers.length} users matched
            </div>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {filteredUsers.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => onOpenUserDetails(member)}
              className="rounded-2xl border border-border bg-card p-5 text-left transition hover:border-vahani-blue/40 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Checkbox
                      checked={selectedEmailUserIds.includes(member.id)}
                      onCheckedChange={() => onToggleEmailUser(member.id)}
                      onClick={(event) => event.stopPropagation()}
                    />
                    <p className="font-semibold text-foreground">{member.name}</p>
                    <Badge variant="secondary">{roleLabel(member.role)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenEditUser(member);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRequestDeleteUser(member);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>

              {member.role === "scholar" && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Batch</p>
                    <p className="mt-1 font-medium text-foreground">{member.batch || "--"}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Active programmes</p>
                    <p className="mt-1 font-medium text-foreground">
                      {member.enrolledProgrammesCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Credits earned</p>
                    <p className="mt-1 font-medium text-foreground">{member.creditsEarned}</p>
                  </div>
                </div>
              )}

              {member.role === "programme_manager" && (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="mt-1 font-medium text-foreground">{member.phoneNumber || "--"}</p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Total managed courses</p>
                    <p className="mt-1 font-medium text-foreground">
                      {member.managedProgrammesCount}
                    </p>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Currently handling</p>
                    <p className="mt-1 font-medium text-foreground">{member.programmes.length}</p>
                  </div>
                </div>
              )}

              {member.role === "admin" && (
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span>{member.phoneNumber || "No phone"}</span>
                  <span>{roleLabel(member.role)}</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
            No users match the current filters.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
