import { fetchWithAuth } from "./fetchWithAuth";

export interface ProgrammeManager {
  id: string;
  name: string;
  email: string;
}

export interface ProgrammeSubmission {
  id: string;
  fileUrl: string;
  score: number | null;
  submittedAt: string;
  assignmentId: string;
  userId: string;
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
  submissions: ProgrammeSubmission[];
}

export interface Programme {
  id: string;
  title: string;
  description: string;
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
  programmeManager: ProgrammeManager | null;
  assignments: ProgrammeAssignment[];
  status: string;
  enrolledAt?: string;
  attendance?: number;
  certificateAvailable?: boolean;
}

export const getMyProgrammes = async () => {
  return fetchWithAuth("/programmes/my-programmes", {
    method: "GET",
  });
};

export const getProgrammeDetail = async (programmeId: string) => {
  return fetchWithAuth(`/programmes/${programmeId}`, {
    method: "GET",
  });
};

export interface DiscoverableProgramme {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  programmeManager: ProgrammeManager | null;
  selfEnrollmentEnabled: boolean;
  spotlightTitle: string;
  spotlightMessage: string;
  assignmentsCount: number;
  scholarsCount: number;
  enrolled: boolean;
}

export const getDiscoverableProgrammes = async () => {
  return fetchWithAuth("/programmes/discover", {
    method: "GET",
  });
};

export const selfEnrollInProgramme = async (programmeId: string) => {
  return fetchWithAuth(`/programmes/${programmeId}/self-enroll`, {
    method: "POST",
  });
};
