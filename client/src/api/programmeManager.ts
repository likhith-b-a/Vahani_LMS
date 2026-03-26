import { fetchWithAuth } from "./fetchWithAuth";

export interface ManagedStudent {
  id: string;
  name: string;
  email: string;
  batch?: string | null;
}

export interface ManagedSubmission {
  id: string;
  fileUrl: string | null;
  score: number | null;
  submittedAt: string;
  student: ManagedStudent;
  assignment: {
    id: string;
    title: string;
    description: string | null;
    maxScore: number | null;
    dueDate: string | null;
    assignmentType: string;
    acceptedFileTypes: string[];
  };
  programme: {
    id: string;
    title: string;
  };
  status: "SUBMITTED" | "GRADED";
}

export interface ManagedProgrammeAssignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number | null;
  assignmentType: string;
  acceptedFileTypes: string[];
  programmeId: string;
  submissions: Array<{
    id: string;
    fileUrl: string | null;
    score: number | null;
    submittedAt: string;
    user: ManagedStudent;
  }>;
}

export interface ManagedProgramme {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  selfEnrollmentEnabled?: boolean;
  spotlightTitle?: string;
  spotlightMessage?: string;
  resources?: Array<{
    id: string;
    title: string;
    url: string;
    createdAt: string;
  }>;
  meetingLinks?: Array<{
    id: string;
    title: string;
    url: string;
    createdAt: string;
  }>;
  programmeManagerId: string | null;
  programmeManager: ManagedStudent | null;
  enrollments: Array<{
    id: string;
    status: string;
    enrolledAt: string;
    user: ManagedStudent;
  }>;
  assignments: ManagedProgrammeAssignment[];
}

export interface CreateAssignmentPayload {
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  assignmentType: string;
  isGraded?: boolean;
  allowLateSubmission?: boolean;
  allowResubmission?: boolean;
}

export const getManagedProgrammes = async () => {
  return fetchWithAuth("/programmes/managed/me", {
    method: "GET",
  });
};

export const getManagedSubmissions = async (programmeId?: string) => {
  const query = programmeId
    ? `?programmeId=${encodeURIComponent(programmeId)}`
    : "";

  return fetchWithAuth(`/assignments/managed/submissions${query}`, {
    method: "GET",
  });
};

export const getManagedAssignmentSubmissions = async (
  programmeId: string,
  assignmentId: string,
) => {
  const query = `?programmeId=${encodeURIComponent(programmeId)}&assignmentId=${encodeURIComponent(assignmentId)}`;

  return fetchWithAuth(`/assignments/managed/submissions${query}`, {
    method: "GET",
  });
};

export const createProgrammeAssignment = async (
  programmeId: string,
  payload: CreateAssignmentPayload,
) => {
  return fetchWithAuth(`/assignments/programmes/${programmeId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const addProgrammeResource = async (
  programmeId: string,
  payload: { title: string; url: string },
) => {
  return fetchWithAuth(`/programmes/managed/${programmeId}/resources`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const addProgrammeMeetingLink = async (
  programmeId: string,
  payload: { title: string; url: string },
) => {
  return fetchWithAuth(`/programmes/managed/${programmeId}/meeting-links`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const evaluateProgrammeSubmission = async (
  submissionId: string,
  score: number,
) => {
  return fetchWithAuth(`/assignments/submissions/${submissionId}/evaluate`, {
    method: "PATCH",
    body: JSON.stringify({ score }),
  });
};

export const bulkEvaluateProgrammeAssignment = async (
  assignmentId: string,
  file: File,
) => {
  const formData = new FormData();
  formData.append("file", file);

  return fetchWithAuth(
    `/assignments/managed/assignments/${assignmentId}/bulk-evaluate`,
    {
      method: "POST",
      body: formData,
    },
  );
};
