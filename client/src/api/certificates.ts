import { BASE_URL, fetchWithAuth } from "./fetchWithAuth";

export interface CertificateRecord {
  id: string;
  credentialId: string;
  title: string;
  description?: string | null;
  scholarName: string;
  programmeTitle: string;
  fileUrl: string;
  status: "available" | "claimed" | "revoked";
  issuedAt: string;
  claimedAt?: string | null;
  verificationUrl: string;
  programme?: {
    id: string;
    title: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    batch?: string | null;
  };
  issuedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export const getMyCertificates = async () => {
  return fetchWithAuth("/certificates/me", {
    method: "GET",
    cacheTtlMs: 30_000,
    cacheKey: "scholar:certificates",
  });
};

export const claimCertificate = async (certificateId: string) => {
  return fetchWithAuth(`/certificates/${certificateId}/claim`, {
    method: "PATCH",
  });
};

export const verifyCertificate = async (credentialId: string) => {
  const response = await fetch(`${BASE_URL}/certificates/verify/${encodeURIComponent(credentialId)}`, {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to verify certificate");
  }

  return data;
};

export const getCertificateDownloadUrl = (certificateId: string) =>
  `${BASE_URL}/certificates/${encodeURIComponent(certificateId)}/download`;
