import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkEvaluateInteractiveSession,
  bulkEvaluateProgrammeAssignment,
  evaluateProgrammeSubmission,
  getManagedAssignmentSubmissions,
  markInteractiveSessionAttendance,
  type ManagedSubmission,
} from "@/api/programmeManager";
import { managerKeys } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";

export function useManagerSubmissions(programmeId: string, assignmentId: string) {
  const { toast } = useToast();

  return useQuery({
    queryKey: managerKeys.submissions(programmeId, assignmentId),
    queryFn: async () => {
      const response = await getManagedAssignmentSubmissions(programmeId, assignmentId);
      return Array.isArray(response?.data) ? (response.data as ManagedSubmission[]) : [];
    },
    enabled: !!programmeId && !!assignmentId,
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to load submissions",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });
}

export function useManagerEvaluation(programmeId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidateProgramme = () => {
    queryClient.invalidateQueries({ queryKey: managerKeys.programmeDetail(programmeId) });
  };

  const evaluateSubmission = useMutation({
    mutationFn: ({ submissionId, score }: { submissionId: string; score: number }) =>
      evaluateProgrammeSubmission(submissionId, score),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "submissions"] });
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to save marks",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const saveSessionAttendance = useMutation({
    mutationFn: ({
      sessionId,
      occurrenceId,
      attendance,
    }: {
      sessionId: string;
      occurrenceId: string;
      attendance: Array<{ userId: string; status: "present" | "absent"; score: number }>;
    }) => markInteractiveSessionAttendance(sessionId, occurrenceId, attendance),
    onSuccess: invalidateProgramme,
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to update attendance",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const bulkEvaluateAssignment = useMutation({
    mutationFn: ({ assignmentId, file }: { assignmentId: string; file: File }) =>
      bulkEvaluateProgrammeAssignment(assignmentId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager", "submissions"] });
      invalidateProgramme();
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to upload marks sheet",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const bulkEvaluateSession = useMutation({
    mutationFn: ({
      sessionId,
      occurrenceId,
      file,
    }: {
      sessionId: string;
      occurrenceId: string;
      file: File;
    }) => bulkEvaluateInteractiveSession(sessionId, occurrenceId, file),
    onSuccess: invalidateProgramme,
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to upload marks sheet",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  return { evaluateSubmission, saveSessionAttendance, bulkEvaluateAssignment, bulkEvaluateSession };
}
