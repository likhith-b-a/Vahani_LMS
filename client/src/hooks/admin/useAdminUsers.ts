import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkCreateAdminUsers,
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
  type AdminPagination,
  type AdminUser,
  type AdminUserPayload,
  type AdminUsersParams,
} from "@/api/admin";
import { adminKeys } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";

export function useAdminUsers(params: AdminUsersParams = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: adminKeys.users(params),
    queryFn: async () => {
      const response = await getAdminUsers(params);
      return {
        users: Array.isArray(response?.data?.users) ? (response.data.users as AdminUser[]) : [],
        pagination: response?.data?.pagination as AdminPagination | undefined,
      };
    },
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to load users",
          description: error instanceof Error ? error.message : "Please try again shortly.",
          variant: "destructive",
        });
      },
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    queryClient.invalidateQueries({ queryKey: adminKeys.summary() });
  };

  const createUser = useMutation({
    mutationFn: (payload: AdminUserPayload) => createAdminUser(payload),
    onSuccess: invalidate,
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to save user",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: Partial<AdminUserPayload> }) =>
      updateAdminUser(userId, payload),
    onSuccess: invalidate,
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to save user",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: invalidate,
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to delete user",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  const bulkImportUsers = useMutation({
    mutationFn: (file: File) => bulkCreateAdminUsers(file),
    onSuccess: invalidate,
    meta: {
      onError: (error) => {
        toast({
          title: "Unable to import users",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  return { usersQuery, createUser, updateUser, deleteUser, bulkImportUsers };
}
