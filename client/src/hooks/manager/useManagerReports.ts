import { useMutation } from "@tanstack/react-query";
import { getManagedProgrammeReport, type ProgrammeManagerReportResponse } from "@/api/programmeManager";
import { useToast } from "@/hooks/use-toast";

export function useManagerReports() {
  const { toast } = useToast();

  const generateReport = useMutation({
    mutationFn: async (programmeId: string) => {
      const response = await getManagedProgrammeReport(programmeId);
      return response.data as ProgrammeManagerReportResponse;
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to generate report",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  return { generateReport };
}
