import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const roleLabel = (role: AdminUserRole) =>
  role === "programme_manager"
    ? "Programme manager"
    : role === "admin"
      ? "Admin"
      : "Scholar";

type UserSortKey =
  | "name"
  | "email"
  | "role"
  | "batch"
  | "gender"
  | "phoneNumber"
  | "activeProgrammes"
  | "creditsEarned"
  | "managedCourses"
  | "currentProgrammes";

type SortDirection = "asc" | "desc";

interface AdminUsersSectionProps {
  userSearch: string;
  onUserSearchChange: (value: string) => void;
  userRoleFilter: AdminUserRole;
  onUserRoleFilterChange: (value: AdminUserRole) => void;
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
  const [sortKey, setSortKey] = useState<UserSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pageSize, setPageSize] = useState("10");
  const [page, setPage] = useState(1);

  const sortedUsers = useMemo(() => {
    const getSortableValue = (member: AdminUser, key: UserSortKey) => {
      switch (key) {
        case "name":
          return member.name.toLowerCase();
        case "email":
          return member.email.toLowerCase();
        case "role":
          return roleLabel(member.role).toLowerCase();
        case "batch":
          return (member.batch || "").toLowerCase();
        case "gender":
          return (member.gender || "").toLowerCase();
        case "phoneNumber":
          return member.phoneNumber || "";
        case "activeProgrammes":
          return member.enrolledProgrammesCount;
        case "creditsEarned":
          return member.creditsEarned;
        case "managedCourses":
          return member.managedProgrammesCount;
        case "currentProgrammes":
          return member.programmes.length;
        default:
          return "";
      }
    };

    return [...filteredUsers].sort((left, right) => {
      const leftValue = getSortableValue(left, sortKey);
      const rightValue = getSortableValue(right, sortKey);

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue;
      }

      const compared = String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortDirection === "asc" ? compared : -compared;
    });
  }, [filteredUsers, sortDirection, sortKey]);

  const numericPageSize = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / numericPageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * numericPageSize;
    return sortedUsers.slice(start, start + numericPageSize);
  }, [currentPage, numericPageSize, sortedUsers]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, userBatchFilter, userRoleFilter, userSearch]);

  const showScholarColumns = userRoleFilter === "scholar";
  const showManagerColumns = userRoleFilter === "programme_manager";
  const showBatchColumn = userRoleFilter !== "admin";

  const resultLabel =
    sortedUsers.length === 1 ? "1 user" : `${sortedUsers.length} users`;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleSort = (nextKey: UserSortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(value);
    setPage(1);
  };

  const renderSortIcon = (columnKey: UserSortKey) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="h-3.5 w-3.5" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  const SortButton = ({
    columnKey,
    label,
    className = "",
  }: {
    columnKey: UserSortKey;
    label: string;
    className?: string;
  }) => (
    <button
      type="button"
      onClick={() => handleSort(columnKey)}
      className={`inline-flex items-center gap-1 font-medium text-muted-foreground transition hover:text-foreground ${className}`}
    >
      <span>{label}</span>
      {renderSortIcon(columnKey)}
    </button>
  );

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
            onValueChange={(value: AdminUserRole) => onUserRoleFilterChange(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
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

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="text-muted-foreground">
            Showing {(currentPage - 1) * numericPageSize + (paginatedUsers.length > 0 ? 1 : 0)}
            {" - "}
            {(currentPage - 1) * numericPageSize + paginatedUsers.length} of {resultLabel}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Rows per page</span>
            <Select value={pageSize} onValueChange={handlePageSizeChange}>
              <SelectTrigger className="w-[92px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
          <Table>
            <TableHeader className="bg-muted/35">
              <TableRow>
                <TableHead className="w-[52px]">
                  <span className="sr-only">Select</span>
                </TableHead>
                <TableHead>
                  <SortButton columnKey="name" label="Name" />
                </TableHead>
                <TableHead>
                  <SortButton columnKey="email" label="Email" />
                </TableHead>
                <TableHead>
                  <SortButton columnKey="role" label="Role" />
                </TableHead>
                {showBatchColumn && (
                  <TableHead>
                    <SortButton columnKey="batch" label="Batch" />
                  </TableHead>
                )}
                <TableHead>
                  <SortButton columnKey="gender" label="Gender" />
                </TableHead>
                <TableHead>
                  <SortButton columnKey="phoneNumber" label="Phone" />
                </TableHead>
                {showScholarColumns && (
                  <TableHead className="text-right">
                    <SortButton
                      columnKey="activeProgrammes"
                      label="Active Programmes"
                      className="justify-end"
                    />
                  </TableHead>
                )}
                {showManagerColumns && (
                  <TableHead className="text-right">
                    <SortButton
                      columnKey="managedCourses"
                      label="Managed Courses"
                      className="justify-end"
                    />
                  </TableHead>
                )}
                {showManagerColumns && (
                  <TableHead className="text-right">
                    <SortButton
                      columnKey="currentProgrammes"
                      label="Current Programmes"
                      className="justify-end"
                    />
                  </TableHead>
                )}
                {showScholarColumns && (
                  <TableHead className="text-right">
                    <SortButton
                      columnKey="creditsEarned"
                      label="Credits"
                      className="justify-end"
                    />
                  </TableHead>
                )}
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((member) => (
                <TableRow
                  key={member.id}
                  className="cursor-pointer"
                  onClick={() => onOpenUserDetails(member)}
                >
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Checkbox
                      checked={selectedEmailUserIds.includes(member.id)}
                      onCheckedChange={() => onToggleEmailUser(member.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.id}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">
                    {member.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleLabel(member.role)}</Badge>
                  </TableCell>
                  {showBatchColumn && (
                    <TableCell className="text-muted-foreground">
                      {member.batch || "--"}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">
                    {member.gender || "--"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.phoneNumber || "--"}
                  </TableCell>
                  {showScholarColumns && (
                    <TableCell className="text-right font-medium text-foreground">
                      {member.role === "scholar" ? member.enrolledProgrammesCount : "--"}
                    </TableCell>
                  )}
                  {showManagerColumns && (
                    <TableCell className="text-right font-medium text-foreground">
                      {member.role === "programme_manager" ? member.managedProgrammesCount : "--"}
                    </TableCell>
                  )}
                  {showManagerColumns && (
                    <TableCell className="text-right font-medium text-foreground">
                      {member.role === "programme_manager" ? member.programmes.length : "--"}
                    </TableCell>
                  )}
                  {showScholarColumns && (
                    <TableCell className="text-right font-medium text-foreground">
                      {member.role === "scholar" ? member.creditsEarned : "--"}
                    </TableCell>
                  )}
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenEditUser(member)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRequestDeleteUser(member)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {sortedUsers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
            No users match the current filters.
          </div>
        )}

        {sortedUsers.length > 0 && totalPages > 1 && (
          <Pagination className="justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setPage((current) => Math.max(1, current - 1));
                  }}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setPage((current) => Math.min(totalPages, current + 1));
                  }}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
}
