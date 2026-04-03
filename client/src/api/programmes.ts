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
  resultsPublishedAt?: string | null;
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
  interactiveSessions?: Array<{
    id: string;
    title: string;
    description?: string | null;
    scheduledAt: string;
    maxScore?: number | null;
    durationMinutes?: number | null;
    meetingUrl?: string | null;
    attendances?: Array<{
      id: string;
      status: "present" | "absent";
      score?: number | null;
      markedAt: string;
      userId: string;
      interactiveSessionId: string;
    }>;
  }>;
  programmeManagerId: string | null;
  programmeManager: ProgrammeManager | null;
  assignments: ProgrammeAssignment[];
  status: string;
  enrolledAt?: string;
  attendance?: number;
  certificateAvailable?: boolean;
}

export interface ProgrammeSchedule {
  id: string;
  title: string;
  status: string;
  interactiveSessions?: Array<{
    id: string;
    title: string;
    description?: string | null;
    scheduledAt: string;
    durationMinutes?: number | null;
    meetingUrl?: string | null;
    attendances?: Array<{
      id: string;
      status: "present" | "absent";
      score?: number | null;
      markedAt: string;
      userId: string;
    }>;
  }>;
}

export const getMyProgrammes = async () => {
  return fetchWithAuth("/programmes/my-programmes", {
    method: "GET",
    cacheTtlMs: 45_000,
    cacheKey: "scholar:my-programmes",
  });
};

export const getMyProgrammeSchedule = async () => {
  return fetchWithAuth("/programmes/my-programmes-schedule", {
    method: "GET",
    cacheTtlMs: 30_000,
    cacheKey: "scholar:my-programmes-schedule",
  });
};

export const getProgrammeDetail = async (programmeId: string) => {
  return fetchWithAuth(`/programmes/${programmeId}`, {
    method: "GET",
    cacheTtlMs: 30_000,
    cacheKey: `scholar:programme:${programmeId}`,
  });
};

export interface DiscoverableProgramme {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  programmeManager: ProgrammeManager | null;
  selfEnrollmentEnabled: boolean;
  selfEnrollmentSeatLimit?: number | null;
  selfEnrollmentOpensAt?: string | null;
  selfEnrollmentClosesAt?: string | null;
  allowedBatches: string[];
  allowedGenders: string[];
  spotlightTitle: string;
  spotlightMessage: string;
  assignmentsCount: number;
  scholarsCount: number;
  enrolled: boolean;
  requestStatus?: "pending" | "accepted" | "rejected" | "withdrawn" | null;
  requestDecisionReason?: string;
  requestRequestedAt?: string | null;
  requestDecidedAt?: string | null;
  eligibleToRequest: boolean;
  eligibilityMessage?: string;
}

export const getDiscoverableProgrammes = async () => {
  return fetchWithAuth("/programmes/discover", {
    method: "GET",
    bypassCache: true,
  });
};

export const selfEnrollInProgramme = async (programmeId: string) => {
  return fetchWithAuth(`/programmes/${programmeId}/self-enroll`, {
    method: "POST",
  });
};
