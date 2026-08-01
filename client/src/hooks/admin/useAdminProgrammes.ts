import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignScholarsToProgramme,
  createAdminProgramme,
  deleteAdminAssignment,
  deleteAdminProgramme,
  getAdminProgrammes,
  updateAdminProgramme,
  type AdminPagination,
  type AdminProgramme,
  type AdminProgrammePayload,
  type AdminProgrammesParams,
} from "@/api/admin";
import { adminKeys } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";

export function useAdminProgrammes(params: AdminProgrammesParams = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const programmesQuery = useQuery({
    queryKey: adminKeys.programmes(params),
    queryFn: async () => {
      const response = await getAdminProgrammes(params);
      return {
        programmes: Array.isArray(response?.data?.programmes)
          ? (response.data.programmes as AdminProgramme[])
          : [],
        pagination: response?.data?.pagination as AdminPagination | undefined,
      };
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to load programmes",
          description: error instanceof Error ? error.message : "Please try again shortly.",
          variant: "destructive",
        });
      },
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "programmes"] });
    queryClient.invalidateQueries({ queryKey: adminKeys.summary() });
  };

  const createProgramme = useMutation({
    mutationFn: async ({
      payload,
      scholarIds,
    }: {
      payload: AdminProgrammePayload;
      scholarIds: string[];
    }) => {
      const response = await createAdminProgramme(payload);
      const createdProgramme = response?.data as AdminProgramme | undefined;
      if (createdProgramme?.id && scholarIds.length > 0) {
        await assignScholarsToProgramme(createdProgramme.id, scholarIds);
      }
      return createdProgramme;
    },
    onSuccess: invalidate,
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to save programme",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const updateProgramme = useMutation({
    mutationFn: ({
      programmeId,
      payload,
    }: {
      programmeId: string;
      payload: Partial<AdminProgrammePayload>;
    }) => updateAdminProgramme(programmeId, payload),
    onSuccess: invalidate,
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to save programme",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const deleteProgramme = useMutation({
    mutationFn: (programmeId: string) => deleteAdminProgramme(programmeId),
    onSuccess: invalidate,
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to delete programme",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: (assignmentId: string) => deleteAdminAssignment(assignmentId),
    onSuccess: invalidate,
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to delete assignment",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  return { programmesQuery, createProgramme, updateProgramme, deleteProgramme, deleteAssignment };
}
