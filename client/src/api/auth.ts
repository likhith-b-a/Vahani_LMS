import { BASE_URL, fetchWithAuth } from "./fetchWithAuth";

export const loginUser = async (email: string, password: string) => {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
};

export const refreshToken = async () => {
  const res = await fetch(`${BASE_URL}/refresh-token`, {
    method: "POST",
    credentials: "include",
  });

  return res.json();
};

export const logoutUser = async () => {
  return fetchWithAuth("/logout", {
    method: "POST",
  });
};

export const requestPasswordResetOtp = async (email: string) => {
  const res = await fetch(`${BASE_URL}/forgot-password/request-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to send OTP");
  }

  return data;
};

export const verifyPasswordResetOtp = async (
  email: string,
  otp: string,
  newPassword: string,
) => {
  const res = await fetch(`${BASE_URL}/forgot-password/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, otp, newPassword }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to reset password");
  }

  return data;
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
) => {
  return fetchWithAuth("/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
};

export const requestChangePasswordOtp = async (
  currentPassword: string,
  newPassword: string,
) => {
  return fetchWithAuth("/change-password/request-otp", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
};

export const verifyChangePasswordOtp = async (
  currentPassword: string,
  newPassword: string,
  otp: string,
) => {
  return fetchWithAuth("/change-password/verify-otp", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword, otp }),
  });
};
