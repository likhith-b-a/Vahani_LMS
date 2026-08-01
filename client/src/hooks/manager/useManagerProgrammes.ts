import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  getManagedProgrammeDetail,
  getManagedProgrammes,
  type ManagedProgramme,
  type ManagedProgrammeSummary,
} from "@/api/programmeManager";
import { managerKeys } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";

export function useManagerProgrammes() {
  const { toast } = useToast();

  const programmesQuery = useQuery({
    queryKey: managerKeys.programmes(),
    queryFn: async () => {
      const response = await getManagedProgrammes();
      return Array.isArray(response?.data?.programmes)
        ? (response.data.programmes as ManagedProgrammeSummary[])
        : [];
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to load programmes",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  return { programmesQuery };
}

export function useManagerProgrammeDetail(programmeId: string) {
  const { toast } = useToast();

  return useQuery({
    queryKey: managerKeys.programmeDetail(programmeId),
    queryFn: async () => {
      const response = await getManagedProgrammeDetail(programmeId);
      return (response?.data?.programme as ManagedProgramme) || null;
    },
    enabled: !!programmeId,
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to load programme details",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });
}

export function useManagerProgrammeDetails(programmes: ManagedProgrammeSummary[]) {
  const detailQueries = useQueries({
    queries: programmes.map((programme) => ({
      queryKey: managerKeys.programmeDetail(programme.id),
      queryFn: async () => {
        const response = await getManagedProgrammeDetail(programme.id);
        return (response?.data?.programme as ManagedProgramme) || null;
      },
    })),
  });

  return useMemo(
    () =>
      detailQueries
        .map((query) => query.data)
        .filter((programme): programme is ManagedProgramme => Boolean(programme)),
    [detailQueries],
  );
}
