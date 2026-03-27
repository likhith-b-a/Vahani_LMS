import { fetchWithAuth } from "./fetchWithAuth";

export interface EmailRecipient {
  id: string;
  name: string;
  email: string;
}

export interface SendRoleBasedEmailPayload {
  userIds: string[];
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  attachments?: File[];
}

export const sendRoleBasedEmail = async ({
  userIds,
  subject,
  body,
  cc,
  bcc,
  attachments = [],
}: SendRoleBasedEmailPayload) => {
  const formData = new FormData();

  userIds.forEach((userId) => formData.append("userIds", userId));
  formData.append("subject", subject);
  formData.append("body", body);

  if (cc?.trim()) {
    formData.append("cc", cc.trim());
  }

  if (bcc?.trim()) {
    formData.append("bcc", bcc.trim());
  }

  attachments.forEach((file) => formData.append("attachments", file));

  return fetchWithAuth("/emails/send", {
    method: "POST",
    body: formData,
  });
};
