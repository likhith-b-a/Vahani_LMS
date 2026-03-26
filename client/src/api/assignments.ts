import { fetchWithAuth } from "./fetchWithAuth";

export interface AssignmentSubmission {
  id: string;
  fileUrl: string;
  score: number | null;
  submittedAt: string;
}

export interface AssignmentProgramme {
  id: string;
  title: string;
}

export type AssignmentStatus = "PENDING" | "SUBMITTED" | "GRADED";

export interface UserAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  assignmentType: string;
  acceptedFileTypes: string[];
  programme: AssignmentProgramme;
  submission: AssignmentSubmission | null;
  status: AssignmentStatus;
}

export interface ProgrammeAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  assignmentType: string;
  acceptedFileTypes: string[];
  programmeId: string;
}

export interface ProgrammeAssignmentsResponse {
  programme: AssignmentProgramme;
  assignments: ProgrammeAssignment[];
}

export interface SubmitAssignmentResponse {
  id: string;
  fileUrl: string;
  score: number | null;
  submittedAt: string;
  assignmentId: string;
  userId: string;
}

export const getMyAssignments = async () => {
  return fetchWithAuth("/assignments/my-assignments", {
    method: "GET",
  });
};

export const getAssignmentsByProgramme = async (programmeId: string) => {
  return fetchWithAuth(`/assignments/${programmeId}`, {
    method: "GET",
  });
};

export const submitAssignment = async (assignmentId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return fetchWithAuth(`/assignments/${assignmentId}/submit`, {
    method: "POST",
    body: formData,
  });
};
