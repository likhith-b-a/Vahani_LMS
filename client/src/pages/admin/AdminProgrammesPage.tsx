import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type AdminProgramme } from "@/api/admin";
import {
  AdminProgrammesSection,
  type ProgrammeStatusFilter,
} from "@/components/dashboard/admin/AdminProgrammesSection";
import { AdminProgrammeDialog } from "@/components/dashboard/admin/AdminProgrammeDialog";
import { ConfirmDeleteDialog } from "@/components/dashboard/shared/ConfirmDeleteDialog";
import { useToast } from "@/hooks/use-toast";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { useAdminProgrammes } from "@/hooks/admin/useAdminProgrammes";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export const getAdminProgrammeStatus = (
  programme: AdminProgramme,
): Exclude<ProgrammeStatusFilter, "all"> => {
  const hasCompletedScholars = programme.enrollments.some((entry) => entry.status === "completed");

  if (hasCompletedScholars) return "completed";

  if (
    programme.enrollments.length === 0 &&
    programme.assignments.length === 0 &&
    (programme.resources?.length ?? 0) === 0
  ) {
    return "setup";
  }

  return "active";
};

const PAGE_SIZE = 12;

export default function AdminProgrammesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [programmeSearch, setProgrammeSearch] = useState("");
  const [programmeDateFrom, setProgrammeDateFrom] = useState("");
  const [programmeDateTo, setProgrammeDateTo] = useState("");
  const [programmeStatusFilter, setProgrammeStatusFilter] = useState<ProgrammeStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [editingProgramme, setEditingProgramme] = useState<AdminProgramme | null>(null);
  const [isProgrammeDialogOpen, setIsProgrammeDialogOpen] = useState(false);
  const [pendingDeleteProgramme, setPendingDeleteProgramme] = useState<AdminProgramme | null>(null);
  const [pendingDeleteAssignmentId, setPendingDeleteAssignmentId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(programmeSearch, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, programmeDateFrom, programmeDateTo, programmeStatusFilter]);

  // Unfiltered users list, used only for the create/edit programme dialog's
  // manager dropdown and scholar picker.
  const { usersQuery } = useAdminUsers();
  const users = usersQuery.data?.users || [];
  const scholars = users.filter((entry) => entry.role === "scholar");
  const programmeManagers = users.filter((entry) => entry.role === "programme_manager");

  const { programmesQuery, createProgramme, updateProgramme, deleteProgramme, deleteAssignment } =
    useAdminProgrammes({
      search: debouncedSearch,
      status: programmeStatusFilter,
      from: programmeDateFrom || undefined,
      to: programmeDateTo || undefined,
      page,
      pageSize: PAGE_SIZE,
    });

  const programmes = programmesQuery.data?.programmes || [];
  const pagination = programmesQuery.data?.pagination;

  const scholarBatches = useMemo(
    () =>
      Array.from(
        new Set(scholars.map((entry) => entry.batch).filter((entry): entry is string => Boolean(entry))),
      ).sort(),
    [scholars],
  );
  const scholarGenders = useMemo(() => ["Male", "Female", "RatherNoTSay"], []);

  const handleProgrammeSubmit = async (
    payload: Parameters<typeof createProgramme.mutateAsync>[0]["payload"],
    scholarIds: string[],
    editingProgrammeId: string | null,
  ) => {
    try {
      if (editingProgrammeId) {
        await updateProgramme.mutateAsync({ programmeId: editingProgrammeId, payload });
      } else {
        await createProgramme.mutateAsync({ payload, scholarIds });
      }
      setIsProgrammeDialogOpen(false);
      setEditingProgramme(null);
      toast({
        title: editingProgrammeId ? "Programme updated" : "Programme created",
        description: "The programme details have been saved.",
      });
    } catch {
      // toast handled by mutation's onError
    }
  };

  const handleConfirmDeleteProgramme = async () => {
    if (!pendingDeleteProgramme) return;
    try {
      await deleteProgramme.mutateAsync(pendingDeleteProgramme.id);
      setPendingDeleteProgramme(null);
      toast({ title: "Programme deleted", description: "The programme has been removed." });
    } catch {
      // toast handled by mutation's onError
    }
  };

  const handleConfirmDeleteAssignment = async () => {
    if (!pendingDeleteAssignmentId) return;
    try {
      await deleteAssignment.mutateAsync(pendingDeleteAssignmentId);
      setPendingDeleteAssignmentId(null);
      toast({ title: "Assignment deleted", description: "The assignment has been removed." });
    } catch {
      // toast handled by mutation's onError
    }
  };

  return (
    <>
      <AdminProgrammesSection
        programmeSearch={programmeSearch}
        onProgrammeSearchChange={setProgrammeSearch}
        programmeDateFrom={programmeDateFrom}
        onProgrammeDateFromChange={setProgrammeDateFrom}
        programmeDateTo={programmeDateTo}
        onProgrammeDateToChange={setProgrammeDateTo}
        programmeStatusFilter={programmeStatusFilter}
        onProgrammeStatusFilterChange={setProgrammeStatusFilter}
        onClearFilters={() => {
          setProgrammeSearch("");
          setProgrammeDateFrom("");
          setProgrammeDateTo("");
          setProgrammeStatusFilter("all");
        }}
        programmes={programmes}
        page={pagination?.page ?? page}
        totalPages={pagination?.totalPages ?? 1}
        totalCount={pagination?.total ?? programmes.length}
        onPageChange={setPage}
        getProgrammeStatus={getAdminProgrammeStatus}
        onCreateProgramme={() => {
          setEditingProgramme(null);
          setIsProgrammeDialogOpen(true);
        }}
        onOpenProgramme={(programme) => navigate(`/admin/programmes/${programme.id}`)}
        onEditProgramme={(programme) => {
          setEditingProgramme(programme);
          setIsProgrammeDialogOpen(true);
        }}
        onRequestDeleteProgramme={setPendingDeleteProgramme}
      />

      <AdminProgrammeDialog
        open={isProgrammeDialogOpen}
        onOpenChange={(open) => {
          setIsProgrammeDialogOpen(open);
          if (!open) setEditingProgramme(null);
        }}
        editingProgramme={editingProgramme}
        programmeManagers={programmeManagers}
        scholars={scholars}
        scholarBatches={scholarBatches}
        scholarGenders={scholarGenders}
        onSubmit={(payload, scholarIds, editingProgrammeId) =>
          void handleProgrammeSubmit(payload, scholarIds, editingProgrammeId)
        }
      />

      <ConfirmDeleteDialog
        open={!!pendingDeleteProgramme}
        onOpenChange={(open) => !open && setPendingDeleteProgramme(null)}
        title="Delete programme?"
        description={
          pendingDeleteProgramme
            ? `This will permanently remove ${pendingDeleteProgramme.title}.`
            : "This action cannot be undone."
        }
        confirmLabel="Delete programme"
        onConfirm={() => void handleConfirmDeleteProgramme()}
      />

      <ConfirmDeleteDialog
        open={!!pendingDeleteAssignmentId}
        onOpenChange={(open) => !open && setPendingDeleteAssignmentId(null)}
        title="Delete assignment?"
        description="This assignment will be removed from the programme."
        confirmLabel="Delete assignment"
        onConfirm={() => void handleConfirmDeleteAssignment()}
      />
    </>
  );
}
