import { BASE_URL, fetchWithAuth } from "./fetchWithAuth";

export type AdminUserRole = "scholar" | "programme_manager" | "admin";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  batch?: string | null;
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
    assignmentsCount: number;
  }>;
  settings: AdminSettings;
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
  phoneNumber?: string;
  creditsEarned?: number;
}

export interface AdminProgrammePayload {
  title: string;
  description: string;
  credits?: number | null;
  programmeManagerId: string;
  selfEnrollmentEnabled?: boolean;
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
