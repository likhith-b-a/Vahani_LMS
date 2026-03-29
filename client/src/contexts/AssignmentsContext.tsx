/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getMyAssignments,
  submitAssignment as submitAssignmentRequest,
  type SubmitAssignmentResponse,
  type UserAssignment,
} from "@/api/assignments";
import { useAuth } from "./AuthContext";

interface AssignmentsContextType {
  assignments: UserAssignment[];
  loading: boolean;
  error: string | null;
  refreshAssignments: () => Promise<void>;
  submitAssignment: (
    assignmentId: string,
    file: File,
  ) => Promise<SubmitAssignmentResponse>;
  pendingAssignments: UserAssignment[];
  completedAssignments: UserAssignment[];
  upcomingAssignments: UserAssignment[];
}

const AssignmentsContext = createContext<AssignmentsContextType | null>(null);

export function AssignmentsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, accessToken, refreshToken, user } = useAuth();
  const [assignments, setAssignments] = useState<UserAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAssignments = useCallback(async () => {
    if (
      !isAuthenticated ||
      user?.role !== "scholar" ||
      (!accessToken && !refreshToken)
    ) {
      setAssignments([]);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await getMyAssignments();
      const data = Array.isArray(response?.data) ? response.data : [];
      setAssignments(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load assignments";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, isAuthenticated, refreshToken, user?.role]);

  useEffect(() => {
    refreshAssignments();
  }, [refreshAssignments]);

  const submitAssignment = useCallback(
    async (assignmentId: string, file: File) => {
      const response = await submitAssignmentRequest(assignmentId, file);
      const submission = response?.data as SubmitAssignmentResponse;

      setAssignments((current) =>
        current.map((assignment) =>
          assignment.id === assignmentId
            ? {
                ...assignment,
                status: submission.score !== null ? "GRADED" : "SUBMITTED",
                submission: {
                  id: submission.id,
                  fileUrl: submission.fileUrl,
                  score: submission.score,
                  submittedAt: submission.submittedAt,
                },
              }
            : assignment,
        ),
      );

      return submission;
    },
    [],
  );

  const pendingAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status === "PENDING"),
    [assignments],
  );

  const completedAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.status !== "PENDING"),
    [assignments],
  );

  const upcomingAssignments = useMemo(
    () =>
      [...pendingAssignments]
        .sort(
          (first, second) =>
            new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime(),
        )
        .slice(0, 4),
    [pendingAssignments],
  );

  const value = useMemo(
    () => ({
      assignments,
      loading,
      error,
      refreshAssignments,
      submitAssignment,
      pendingAssignments,
      completedAssignments,
      upcomingAssignments,
    }),
    [
      assignments,
      completedAssignments,
      error,
      loading,
      pendingAssignments,
      refreshAssignments,
      submitAssignment,
      upcomingAssignments,
    ],
  );

  return (
    <AssignmentsContext.Provider value={value}>
      {children}
    </AssignmentsContext.Provider>
  );
}

export function useAssignments() {
  const context = useContext(AssignmentsContext);

  if (!context) {
    throw new Error("useAssignments must be used within AssignmentsProvider");
  }

  return context;
}
