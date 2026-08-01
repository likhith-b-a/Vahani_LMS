import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type AdminUser, type AdminUserRole } from "@/api/admin";
import { AdminUsersSection } from "@/components/dashboard/admin/AdminUsersSection";
import { AdminUserDialog, BulkUserImportDialog } from "@/components/dashboard/admin/AdminUserDialogs";
import { EmailComposerDialog } from "@/components/dashboard/EmailComposerDialog";
import { ConfirmDeleteDialog } from "@/components/dashboard/shared/ConfirmDeleteDialog";
import { useToast } from "@/hooks/use-toast";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { downloadAdminUserTemplate } from "@/api/admin";
import { sendRoleBasedEmail, type EmailRecipient } from "@/api/emails";

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<AdminUserRole>("scholar");
  const [userBatchFilter, setUserBatchFilter] = useState("all");
  const [userGenderFilter, setUserGenderFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isBulkUserDialogOpen, setIsBulkUserDialogOpen] = useState(false);
  const [isDownloadingUserTemplate, setIsDownloadingUserTemplate] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<AdminUser | null>(null);
  const [selectedEmailUserIds, setSelectedEmailUserIds] = useState<string[]>([]);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const debouncedSearch = useDebouncedValue(userSearch, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, userRoleFilter, userBatchFilter, userGenderFilter, pageSize]);

  const { usersQuery, createUser, updateUser, deleteUser, bulkImportUsers } = useAdminUsers({
    role: userRoleFilter,
    search: debouncedSearch,
    batch: userBatchFilter,
    gender: userGenderFilter,
    page,
    pageSize,
  });
  const users = usersQuery.data?.users || [];
  const pagination = usersQuery.data?.pagination;

  // Unfiltered scholar list, used only to populate the batch filter's options.
  const { usersQuery: scholarsQuery } = useAdminUsers({ role: "scholar" });
  const scholars = scholarsQuery.data?.users || [];

  const genderOptions = ["Male", "Female", "RatherNoTSay"] as const;

  const scholarBatches = useMemo(
    () =>
      Array.from(
        new Set(scholars.map((entry) => entry.batch).filter((entry): entry is string => Boolean(entry))),
      ).sort(),
    [scholars],
  );

  const scholarGenders = useMemo(() => [...genderOptions], []);

  const selectedEmailRecipients = useMemo<EmailRecipient[]>(
    () =>
      users
        .filter((entry) => selectedEmailUserIds.includes(entry.id))
        .map((entry) => ({ id: entry.id, name: entry.name, email: entry.email })),
    [selectedEmailUserIds, users],
  );

  const handleDownloadUserTemplate = async () => {
    try {
      setIsDownloadingUserTemplate(true);
      const templateBlob = await downloadAdminUserTemplate();
      const url = URL.createObjectURL(templateBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "admin-user-import-template.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Unable to download template",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingUserTemplate(false);
    }
  };

  const handleBulkImport = async (file: File) => {
    try {
      const response = await bulkImportUsers.mutateAsync(file);
      const result = response.data;
      setIsBulkUserDialogOpen(false);
      toast({
        title: "Bulk import completed",
        description:
          `${result.createdCount} user(s) created, ${result.skippedCount} skipped.` +
          (result.emailFailureCount > 0
            ? ` ${result.emailFailureCount} credentials email(s) could not be sent.`
            : ""),
      });
    } catch {
      // toast handled by mutation's onError
    }
  };

  const handleUserSubmit = async (payload: Parameters<typeof createUser.mutateAsync>[0], editingUserId: string | null) => {
    try {
      if (editingUserId) {
        const response = await updateUser.mutateAsync({ userId: editingUserId, payload });
        setIsUserDialogOpen(false);
        setEditingUser(null);
        toast({ title: "User updated", description: response?.message || "The user record has been saved." });
      } else {
        const response = await createUser.mutateAsync(payload);
        setIsUserDialogOpen(false);
        setEditingUser(null);
        toast({ title: "User created", description: response?.message || "The user record has been saved." });
      }
    } catch {
      // toast handled by mutation's onError
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!pendingDeleteUser) return;
    try {
      await deleteUser.mutateAsync(pendingDeleteUser.id);
      setPendingDeleteUser(null);
      toast({ title: "User deleted", description: "The user has been removed." });
    } catch {
      // toast handled by mutation's onError
    }
  };

  const handleSendSelectedUsersEmail = async (payload: {
    subject: string;
    body: string;
    cc: string;
    bcc: string;
    attachments: File[];
  }) => {
    if (!selectedEmailRecipients.length) {
      toast({
        title: "No recipients selected",
        description: "Select at least one user before composing an email.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSendingEmail(true);
      await sendRoleBasedEmail({
        userIds: selectedEmailRecipients.map((recipient) => recipient.id),
        subject: payload.subject,
        body: payload.body,
        cc: payload.cc,
        bcc: payload.bcc,
        attachments: payload.attachments,
      });
      setIsEmailDialogOpen(false);
      setSelectedEmailUserIds([]);
      toast({
        title: "Email sent",
        description: `Sent to ${selectedEmailRecipients.length} recipient${selectedEmailRecipients.length === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      toast({
        title: "Unable to send email",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <>
      <AdminUsersSection
        userSearch={userSearch}
        onUserSearchChange={setUserSearch}
        userRoleFilter={userRoleFilter}
        onUserRoleFilterChange={(value) => {
          setUserRoleFilter(value);
          if (value !== "scholar") setUserBatchFilter("all");
        }}
        userBatchFilter={userBatchFilter}
        onUserBatchFilterChange={setUserBatchFilter}
        userGenderFilter={userGenderFilter}
        onUserGenderFilterChange={setUserGenderFilter}
        scholarBatches={scholarBatches}
        scholarGenders={scholarGenders}
        users={users}
        page={pagination?.page ?? page}
        pageSize={pagination?.pageSize ?? pageSize}
        totalPages={pagination?.totalPages ?? 1}
        totalCount={pagination?.total ?? users.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        selectedEmailUserIds={selectedEmailUserIds}
        onToggleEmailUser={(userId) =>
          setSelectedEmailUserIds((current) =>
            current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
          )
        }
        onSelectMatchedUsersForEmail={() => setSelectedEmailUserIds(users.map((entry) => entry.id))}
        onClearSelectedUsers={() => setSelectedEmailUserIds([])}
        onProceedToEmail={() => setIsEmailDialogOpen(true)}
        onOpenBulkImport={() => setIsBulkUserDialogOpen(true)}
        onOpenCreateUser={() => {
          setEditingUser(null);
          setIsUserDialogOpen(true);
        }}
        onOpenUserDetails={(selectedUser) => navigate(`/admin/users/${selectedUser.id}`)}
        onOpenEditUser={(member) => {
          setEditingUser(member);
          setIsUserDialogOpen(true);
        }}
        onRequestDeleteUser={setPendingDeleteUser}
      />

      <BulkUserImportDialog
        open={isBulkUserDialogOpen}
        onOpenChange={setIsBulkUserDialogOpen}
        isDownloadingUserTemplate={isDownloadingUserTemplate}
        isImportingUsers={bulkImportUsers.isPending}
        onDownloadTemplate={() => void handleDownloadUserTemplate()}
        onImportUsers={(file) => void handleBulkImport(file)}
      />

      <AdminUserDialog
        open={isUserDialogOpen}
        onOpenChange={(open) => {
          setIsUserDialogOpen(open);
          if (!open) setEditingUser(null);
        }}
        editingUser={editingUser}
        onSubmit={(payload, editingUserId) => void handleUserSubmit(payload, editingUserId)}
      />

      <EmailComposerDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        recipients={selectedEmailRecipients}
        recipientLabel={`${selectedEmailRecipients.length} selected user${selectedEmailRecipients.length === 1 ? "" : "s"}`}
        sending={sendingEmail}
        onSend={handleSendSelectedUsersEmail}
      />

      <ConfirmDeleteDialog
        open={!!pendingDeleteUser}
        onOpenChange={(open) => !open && setPendingDeleteUser(null)}
        title="Delete user?"
        description={
          pendingDeleteUser
            ? `This will permanently remove ${pendingDeleteUser.name} from the platform.`
            : "This action cannot be undone."
        }
        confirmLabel="Delete user"
        onConfirm={() => void handleConfirmDeleteUser()}
      />
    </>
  );
}
