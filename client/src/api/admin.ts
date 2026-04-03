import { BASE_URL, fetchWithAuth } from "./fetchWithAuth";

export type AdminUserRole = "scholar" | "programme_manager" | "admin";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  batch?: string | null;
  gender?: string | null;
  phoneNumber?: string | null;
  creditsEarned: number;
  managedProgrammesCount: number;
  enrolledProgrammesCount: number;
  submissionCount: number;
  programmes: Array<{
    id: string;
    title: string;
  }>;
  enrollments: Array<{
    id: string;
    status: string;
    programme: {
      id: string;
      title: string;
    };
  }>;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  batch?: string | null;
  gender?: string | null;
  phoneNumber?: string | null;
  creditsEarned: number;
  createdAt: string;
  programmeHistory: Array<{
    enrollmentId: string;
    status: string;
    progressPercent: number;
    creditsAwarded: number;
    enrolledAt: string;
    completedAt?: string | null;
    programme: {
      id: string;
      title: string;
      credits?: number | null;
      programmeManager?: {
        id: string;
        name: string;
        email: string;
      } | null;
    };
    assignmentSummary: {
      total: number;
      submitted: number;
      graded: number;
    };
    attendanceSummary: {
      totalSessions: number;
      presentSessions: number;
      absentSessions: number;
      attendancePercent: number | null;
    };
    overallPercent?: number | null;
    assignments: Array<{
      id: string;
      title: string;
      type: string;
      dueDate?: string | null;
      maxScore?: number | null;
      score: number | null;
      status: "not_submitted" | "under_evaluation" | "graded";
      submittedAt?: string | null;
    }>;
    interactiveSessions: Array<{
      id: string;
      title: string;
      scheduledAt: string;
      maxScore: number;
      attendanceStatus: "present" | "absent" | "unmarked";
      score: number | null;
    }>;
    certificate?: {
      id: string;
      credentialId: string;
      programmeId: string;
      programmeTitle: string;
      issuedAt: string;
      status: string;
      fileUrl: string;
    } | null;
  }>;
  managedProgrammes: Array<{
    id: string;
    title: string;
    credits?: number | null;
    createdAt: string;
    resultsPublishedAt?: string | null;
    scholarCount: number;
    activeScholarCount: number;
    completedScholarCount: number;
    assignmentCount: number;
    interactiveSessionCount: number;
    certificatesIssuedCount: number;
  }>;
  certificates: Array<{
    id: string;
    credentialId: string;
    programmeTitle: string;
    issuedAt: string;
    status: string;
    fileUrl: string;
    scholarName?: string;
  }>;
}

export interface AdminProgrammeAssignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  maxScore: number | null;
  assignmentType: string;
  acceptedFileTypes: string[];
  submissionCount: number;
  totalScholars: number;
  pendingCount: number;
  gradedCount: number;
}

export interface AdminProgramme {
  id: string;
  title: string;
  description: string | null;
  credits?: number | null;
  createdAt: string;
  selfEnrollmentEnabled: boolean;
  selfEnrollmentSeatLimit?: number | null;
  selfEnrollmentOpensAt?: string | null;
  selfEnrollmentClosesAt?: string | null;
  selfEnrollmentAllowedBatches?: string[];
  selfEnrollmentAllowedGenders?: string[];
  spotlightTitle: string;
  spotlightMessage: string;
  resources?: Array<{
    id: string;
    title: string;
    description?: string | null;
    resourceType: string;
    url: string;
  }>;
  wishlistsCount?: number;
  programmeManagerId: string | null;
  programmeManager: {
    id: string;
    name: string;
    email: string;
  } | null;
  enrollments: Array<{
    id: string;
    status: string;
    enrolledAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  assignments: AdminProgrammeAssignment[];
}

export interface AdminProgrammeDetail extends AdminProgramme {
  resultsPublishedAt?: string | null;
  selfEnrollmentRequests: Array<{
    id: string;
    status: string;
    requestedAt: string;
    decidedAt?: string | null;
    decisionReason?: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      batch?: string | null;
      gender?: string | null;
    };
  }>;
  interactiveSessions: Array<{
    id: string;
    title: string;
    description?: string | null;
    scheduledAt: string;
    durationMinutes?: number | null;
    maxScore: number;
    meetingUrl?: string | null;
    attendanceCount: number;
    absentCount: number;
  }>;
  enrolledScholars: Array<{
    id: string;
    status: string;
    enrolledAt: string;
    completedAt?: string | null;
    creditsAwarded: number;
    progressPercent: number;
    assignmentScore: number;
    sessionScore: number;
    totalScore: number;
    totalPossibleScore: number;
    overallPercent: number | null;
    user: {
      id: string;
      name: string;
      email: string;
      batch?: string | null;
      gender?: string | null;
      phoneNumber?: string | null;
    };
    certificate?: {
      id: string;
      credentialId: string;
      issuedAt: string;
      status: string;
      fileUrl: string;
    } | null;
  }>;
}

export interface AdminOverview {
  stats: {
    totalUsers: number;
    scholars: number;
    programmeManagers: number;
    admins: number;
    programmes: number;
    assignments: number;
    submissions: number;
    gradedSubmissions: number;
    activeEnrollments: number;
  };
  users: AdminUser[];
  programmes: AdminProgramme[];
  settings: AdminSettings;
}

export interface AdminSummary {
  stats: AdminOverview["stats"];
  programmes: Array<{
    id: string;
    title: string;
    description: string | null;
    createdAt: string;
    selfEnrollmentEnabled: boolean;
    programmeManagerId: string | null;
    programmeManager: {
      id: string;
      name: string;
      email: string;
    } | null;
    enrollmentsCount: number;
    assignmentsCount: number;
  }>;
}

export interface AdminSettings {
  featureAccess: {
    dashboardReports: boolean;
    bulkEvaluation: boolean;
    managerStudentView: boolean;
    scholarSelfEnrollment: boolean;
  };
  notifications: {
    reportEmailsEnabled: boolean;
    assignmentAlertsEnabled: boolean;
  };
  policies: {
    allowResubmissions: boolean;
    scholarProfileEditing: boolean;
    evaluationVisibility: string;
  };
}

export interface AdminReportResponse {
  type: "scholar" | "programme" | "wishlist";
  generatedAt: string;
  rows: Array<Record<string, string | number | null>>;
}

export interface AdminBulkUserImportResponse {
  createdCount: number;
  skippedCount: number;
  emailFailureCount: number;
  created: Array<{
    id: string;
    name: string;
    email: string;
    role: AdminUserRole;
  }>;
  skipped: Array<{
    row: number;
    email: string;
    reason: string;
  }>;
  emailFailures: Array<{
    row: number;
    email: string;
  }>;
}

export interface AdminUserPayload {
  name: string;
  email: string;
  password: string;
  role: AdminUserRole;
  batch?: string;
  gender?: string;
  phoneNumber?: string;
  creditsEarned?: number;
}

export interface AdminProgrammePayload {
  title: string;
  description: string;
  credits?: number | null;
  programmeManagerId: string;
  selfEnrollmentEnabled?: boolean;
  selfEnrollmentSeatLimit?: number | null;
  selfEnrollmentOpensAt?: string | null;
  selfEnrollmentClosesAt?: string | null;
  selfEnrollmentAllowedBatches?: string[];
  selfEnrollmentAllowedGenders?: string[];
  spotlightTitle?: string;
  spotlightMessage?: string;
}

export const getAdminOverview = async () => {
  return fetchWithAuth("/admin/overview", {
    method: "GET",
    cacheTtlMs: 30_000,
    cacheKey: "admin:overview",
  });
};

export const getAdminSummary = async () => {
  return fetchWithAuth("/admin/summary", {
    method: "GET",
    cacheTtlMs: 30_000,
    cacheKey: "admin:summary",
  });
};

export const getAdminUsers = async (role = "all") => {
  const query =
    role && role !== "all" ? `?role=${encodeURIComponent(role)}` : "";

  return fetchWithAuth(`/admin/users${query}`, {
    method: "GET",
    cacheTtlMs: 20_000,
    cacheKey: `admin:users:${query || "all"}`,
  });
};

export const createAdminUser = async (payload: AdminUserPayload) => {
  return fetchWithAuth("/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const getAdminUserDetail = async (userId: string) => {
  return fetchWithAuth(`/admin/users/${userId}`, {
    method: "GET",
    cacheTtlMs: 20_000,
    cacheKey: `admin:user-detail:${userId}`,
  });
};

export const downloadAdminUserTemplate = async () => {
  const response = await fetch(`${BASE_URL}/admin/users/template`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    let message = "Unable to download template";

    try {
      const data = await response.json();
      message = data?.message || message;
    } catch {
      // Ignore JSON parsing failure and use the default message.
    }

    throw new Error(message);
  }

  return response.blob();
};

export const bulkCreateAdminUsers = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return fetchWithAuth("/admin/users/bulk", {
    method: "POST",
    body: formData,
  }) as Promise<{ data: AdminBulkUserImportResponse; message: string }>;
};

export const updateAdminUser = async (
  userId: string,
  payload: Partial<AdminUserPayload>,
) => {
  return fetchWithAuth(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const deleteAdminUser = async (userId: string) => {
  return fetchWithAuth(`/admin/users/${userId}`, {
    method: "DELETE",
  });
};

export const getAdminProgrammes = async () => {
  return fetchWithAuth("/admin/programmes", {
    method: "GET",
    cacheTtlMs: 30_000,
    cacheKey: "admin:programmes",
  });
};

export const getAdminProgrammeDetail = async (programmeId: string) => {
  return fetchWithAuth(`/admin/programmes/${programmeId}`, {
    method: "GET",
    cacheTtlMs: 20_000,
    cacheKey: `admin:programme-detail:${programmeId}`,
  });
};

export const createAdminProgramme = async (payload: AdminProgrammePayload) => {
  return fetchWithAuth("/admin/programmes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateAdminProgramme = async (
  programmeId: string,
  payload: Partial<AdminProgrammePayload>,
) => {
  return fetchWithAuth(`/admin/programmes/${programmeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

export const deleteAdminProgramme = async (programmeId: string) => {
  return fetchWithAuth(`/admin/programmes/${programmeId}`, {
    method: "DELETE",
  });
};

export const assignScholarsToProgramme = async (
  programmeId: string,
  scholarIds: string[],
) => {
  return fetchWithAuth(`/admin/programmes/${programmeId}/enrollments`, {
    method: "POST",
    body: JSON.stringify({ scholarIds }),
  });
};

export const removeScholarFromProgramme = async (
  programmeId: string,
  scholarId: string,
) => {
  return fetchWithAuth(
    `/admin/programmes/${programmeId}/enrollments/${scholarId}`,
    {
      method: "DELETE",
    },
  );
};

export const processProgrammeEnrollmentRequests = async (programmeId: string) => {
  return fetchWithAuth(`/admin/programmes/${programmeId}/process-enrollment-requests`, {
    method: "POST",
  });
};

export const deleteAdminAssignment = async (assignmentId: string) => {
  return fetchWithAuth(`/admin/assignments/${assignmentId}`, {
    method: "DELETE",
  });
};

export const getAdminReport = async (
  type: "scholar" | "programme",
  filters?: {
    batch?: string;
    from?: string;
    to?: string;
    managerId?: string;
  },
) => {
  const query = new URLSearchParams({ type });

  if (filters?.batch) query.set("batch", filters.batch);
  if (filters?.from) query.set("from", filters.from);
  if (filters?.to) query.set("to", filters.to);
  if (filters?.managerId) query.set("managerId", filters.managerId);

  return fetchWithAuth(`/admin/reports?${query.toString()}`, {
    method: "GET",
    cacheTtlMs: 15_000,
    cacheKey: `admin:report:${query.toString()}`,
  });
};

export const getAdminSettings = async () => {
  return fetchWithAuth("/admin/settings", {
    method: "GET",
    cacheTtlMs: 60_000,
    cacheKey: "admin:settings",
  });
};

export const updateAdminSettings = async (payload: Partial<AdminSettings>) => {
  return fetchWithAuth("/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};
