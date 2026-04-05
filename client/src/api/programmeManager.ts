import { BASE_URL, fetchWithAuth } from "./fetchWithAuth";

export interface ManagedStudent {
  id: string;
  name: string;
  email: string;
  batch?: string | null;
  gender?: string | null;
  trackGroup?: string | null;
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
  targetTrackGroups: string[];
  programmeId: string;
  submissions: Array<{
    id: string;
    fileUrl: string | null;
    score: number | null;
    submittedAt: string;
    userId: string;
  }>;
}

export interface ManagedInteractiveSessionAttendance {
  id: string;
  status: "present" | "absent";
  score: number | null;
  userId: string;
  interactiveSessionOccurrenceId?: string | null;
}

export interface ManagedInteractiveSessionOccurrence {
  id: string;
  scheduledAt: string;
  durationMinutes: number | null;
  meetingUrl: string | null;
  assignments: Array<{
    userId: string;
    user?: ManagedStudent;
  }>;
  attendances: ManagedInteractiveSessionAttendance[];
}

export interface ManagedInteractiveSession {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  durationMinutes: number | null;
  maxScore: number;
  meetingUrl: string | null;
  assignedOccurrence?: ManagedInteractiveSessionOccurrence | null;
  occurrences: ManagedInteractiveSessionOccurrence[];
  attendances: ManagedInteractiveSessionAttendance[];
}

export interface ManagedProgrammeSummary {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  resultsPublishedAt?: string | null;
  scholarsCount: number;
  assignmentsCount: number;
  interactiveSessionsCount: number;
  resourcesCount: number;
  meetingsCount: number;
}

export interface ManagedProgramme {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  resultsPublishedAt?: string | null;
  selfEnrollmentEnabled?: boolean;
  groupedDeliveryEnabled?: boolean;
  groupTrackGroups?: string[];
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
    trackGroup?: string | null;
    sessionSlot?: string | null;
    enrolledAt: string;
    user: ManagedStudent;
  }>;
  assignments: ManagedProgrammeAssignment[];
  interactiveSessions: ManagedInteractiveSession[];
}

export interface ManagedCertificate {
  id: string;
  credentialId: string;
  title: string;
  scholarName: string;
  programmeTitle: string;
  fileUrl: string;
  status: "available" | "claimed" | "revoked";
  issuedAt: string;
  claimedAt?: string | null;
  verificationUrl: string;
  user?: ManagedStudent;
}

export interface CreateAssignmentPayload {
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  assignmentType: string;
  targetTrackGroups?: string[];
  isGraded?: boolean;
  allowLateSubmission?: boolean;
  allowResubmission?: boolean;
}

export interface CreateInteractiveSessionPayload {
  title: string;
  description?: string;
  maxScore?: number;
  occurrences: Array<{
    id?: string;
    scheduledAt: string;
    durationMinutes?: number;
    meetingUrl?: string;
    assignedUserIds: string[];
  }>;
}

export const getManagedProgrammes = async () => {
  return fetchWithAuth("/programmes/managed/me", {
    method: "GET",
    cacheTtlMs: 30_000,
    cacheKey: "manager:programmes",
  });
};

export const getManagedProgrammeDetail = async (programmeId: string) => {
  return fetchWithAuth(`/programmes/managed/${programmeId}/detail`, {
    method: "GET",
    cacheTtlMs: 30_000,
    cacheKey: `manager:programme-detail:${programmeId}`,
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

export const updateProgrammeAssignment = async (
  assignmentId: string,
  payload: Partial<CreateAssignmentPayload>,
) => {
  return fetchWithAuth(`/assignments/managed/assignments/${assignmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const deleteProgrammeAssignment = async (assignmentId: string) => {
  return fetchWithAuth(`/assignments/managed/assignments/${assignmentId}`, {
    method: "DELETE",
  });
};

export const addProgrammeResource = async (
  programmeId: string,
  payload: { title: string; url?: string; description?: string; file?: File | null },
) => {
  const formData = new FormData();
  formData.append("title", payload.title);
  if (payload.url?.trim()) {
    formData.append("url", payload.url.trim());
  }
  if (payload.description?.trim()) {
    formData.append("description", payload.description.trim());
  }
  if (payload.file) {
    formData.append("file", payload.file);
  }

  return fetchWithAuth(`/programmes/managed/${programmeId}/resources`, {
    method: "POST",
    body: formData,
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

export const createInteractiveSession = async (
  programmeId: string,
  payload: CreateInteractiveSessionPayload,
) => {
  return fetchWithAuth(`/programmes/managed/${programmeId}/interactive-sessions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateManagedProgrammeGrouping = async (
  programmeId: string,
  payload: {
    groupedDeliveryEnabled?: boolean;
    groupTrackGroups?: string[];
  },
) => {
  return fetchWithAuth(`/programmes/managed/${programmeId}/grouping`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const updateManagedProgrammeScholarGrouping = async (
  programmeId: string,
  enrollmentId: string,
  payload: {
    trackGroup?: string | null;
  },
) => {
  return fetchWithAuth(
    `/programmes/managed/${programmeId}/enrollments/${enrollmentId}/grouping`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
};

export const downloadManagedProgrammeGroupingTemplate = async (programmeId: string) => {
  const response = await fetch(`${BASE_URL}/programmes/managed/${encodeURIComponent(programmeId)}/grouping-template`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    let message = "Unable to download grouping template";
    try {
      const data = await response.json();
      message = data?.message || message;
    } catch {
      // Ignore JSON parsing failure.
    }
    throw new Error(message);
  }

  return response.blob();
};

export const bulkAssignManagedProgrammeGrouping = async (
  programmeId: string,
  file: File,
) => {
  const formData = new FormData();
  formData.append("file", file);

  return fetchWithAuth(`/programmes/managed/${programmeId}/grouping-upload`, {
    method: "POST",
    body: formData,
  });
};

export const updateInteractiveSession = async (
  sessionId: string,
  payload: Partial<CreateInteractiveSessionPayload>,
) => {
  return fetchWithAuth(`/programmes/managed/interactive-sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const deleteInteractiveSession = async (sessionId: string) => {
  return fetchWithAuth(`/programmes/managed/interactive-sessions/${sessionId}`, {
    method: "DELETE",
  });
};

export const markInteractiveSessionAttendance = async (
  sessionId: string,
  occurrenceId: string,
  attendance: Array<{ userId: string; status: "present" | "absent"; score: number }>,
) => {
  return fetchWithAuth(`/programmes/managed/interactive-sessions/${sessionId}/attendance`, {
    method: "PUT",
    body: JSON.stringify({ occurrenceId, attendance }),
  });
};

export const publishProgrammeResults = async (programmeId: string) => {
  return fetchWithAuth(`/programmes/managed/${programmeId}/publish-results`, {
    method: "POST",
  });
};

export const getProgrammeCertificates = async (programmeId: string) => {
  return fetchWithAuth(`/certificates/programmes/${programmeId}`, {
    method: "GET",
  });
};

export const generateProgrammeCertificates = async (programmeId: string) => {
  return fetchWithAuth(`/certificates/programmes/${programmeId}/generate`, {
    method: "POST",
  });
};

export const updateProgrammeCertificate = async (
  certificateId: string,
  payload: {
    scholarName: string;
    programmeTitle: string;
    issuedAt: string;
  },
) => {
  return fetchWithAuth(`/certificates/${certificateId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const getManagedCertificateDownloadUrl = (certificateId: string) =>
  `${BASE_URL}/certificates/${encodeURIComponent(certificateId)}/download`;

export interface ProgrammeManagerReportResponse {
  type: "programme_manager";
  generatedAt: string;
  programme: {
    id: string;
    title: string;
  };
  rows: Array<Record<string, string | number | null>>;
}

export const getManagedProgrammeReport = async (programmeId: string) => {
  return fetchWithAuth(`/programmes/managed/${programmeId}/report`, {
    method: "GET",
    cacheTtlMs: 15_000,
    cacheKey: `manager:report:${programmeId}`,
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

const downloadManagerFile = async (endpoint: string, fallbackMessage: string) => {
  const accessToken = localStorage.getItem("accessToken") || "";
  const headers = accessToken.trim()
    ? { Authorization: `Bearer ${accessToken.trim()}` }
    : undefined;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    let message = fallbackMessage;

    try {
      const data = await response.json();
      message = data?.message || message;
    } catch {
      // Ignore JSON parsing failure and use fallback message.
    }

    throw new Error(message);
  }

  return response.blob();
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

export const downloadProgrammeAssignmentBulkTemplate = async (
  assignmentId: string,
) =>
  downloadManagerFile(
    `/assignments/managed/assignments/${assignmentId}/bulk-template`,
    "Unable to download assignment marks sheet",
  );

export const downloadInteractiveSessionBulkTemplate = async (
  sessionId: string,
  occurrenceId: string,
) =>
  downloadManagerFile(
    `/programmes/managed/interactive-sessions/${sessionId}/bulk-template?occurrenceId=${encodeURIComponent(occurrenceId)}`,
    "Unable to download session marks sheet",
  );

export const bulkEvaluateInteractiveSession = async (
  sessionId: string,
  occurrenceId: string,
  file: File,
) => {
  const formData = new FormData();
  formData.append("file", file);

  return fetchWithAuth(
    `/programmes/managed/interactive-sessions/${sessionId}/bulk-evaluate?occurrenceId=${encodeURIComponent(occurrenceId)}`,
    {
      method: "POST",
      body: formData,
    },
  );
};
