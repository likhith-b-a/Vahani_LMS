import sgMail from "@sendgrid/mail";
import { createTransport } from "nodemailer";

const createMailTransport = () =>
  createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL,
      pass: process.env.PASSWORD,
    },
  });

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getMailFrom = () =>
  process.env.MAIL_FROM ||
  process.env.SENDGRID_FROM_EMAIL ||
  process.env.GMAIL ||
  "no-reply@vahani.lms";

const buildFromValue = (fromName) =>
  fromName ? { email: getMailFrom(), name: fromName } : getMailFrom();

const hasNodemailerConfig = () =>
  Boolean(process.env.GMAIL && process.env.PASSWORD);

const hasSendGridConfig = () =>
  Boolean(
    process.env.SENDGRID_API_KEY &&
      (process.env.MAIL_FROM || process.env.SENDGRID_FROM_EMAIL),
  );

const normalizeEmailList = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => String(entry).split(","))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const normalizeAttachments = (attachments = []) =>
  Array.isArray(attachments)
    ? attachments
        .filter((file) => file?.content)
        .map((file) => ({
          filename: file.filename || "attachment",
          type: file.type || "application/octet-stream",
          disposition: "attachment",
          content:
            typeof file.content === "string"
              ? file.content
              : Buffer.from(file.content).toString("base64"),
        }))
    : [];

const sendWithSendGrid = async ({
  to,
  cc = [],
  bcc = [],
  subject,
  text,
  html,
  attachments = [],
  replyTo,
  fromName,
}) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  await sgMail.send({
    from: buildFromValue(fromName),
    to,
    cc: cc.length ? cc : undefined,
    bcc: bcc.length ? bcc : undefined,
    replyTo: replyTo || undefined,
    subject,
    text,
    html,
    attachments: normalizeAttachments(attachments),
  });
};

const sendWithNodemailer = async ({
  to,
  cc = [],
  bcc = [],
  subject,
  text,
  html,
  attachments = [],
  replyTo,
  fromName,
}) => {
  const transport = createMailTransport();

  await transport.sendMail({
    from: fromName ? `"${fromName}" <${getMailFrom()}>` : getMailFrom(),
    to,
    cc: cc.length ? cc : undefined,
    bcc: bcc.length ? bcc : undefined,
    replyTo: replyTo || undefined,
    subject,
    text,
    html,
    attachments: attachments.map((file) => ({
      filename: file.filename || "attachment",
      content:
        typeof file.content === "string"
          ? Buffer.from(file.content, "base64")
          : file.content,
      contentType: file.type || "application/octet-stream",
    })),
  });
};

const sendEmail = async ({
  to,
  cc,
  bcc,
  subject,
  text,
  html,
  attachments = [],
  replyTo,
  fromName,
}) => {
  const normalizedTo = normalizeEmailList(to);
  const normalizedCc = normalizeEmailList(cc);
  const normalizedBcc = normalizeEmailList(bcc);

  if (!normalizedTo.length) {
    throw new Error("At least one recipient is required");
  }

  const payload = {
    to: normalizedTo,
    cc: normalizedCc,
    bcc: normalizedBcc,
    subject,
    text,
    html,
    attachments,
    replyTo,
    fromName,
  };

  if (hasSendGridConfig()) {
    try {
      await sendWithSendGrid(payload);
      return;
    } catch (error) {
      if (!hasNodemailerConfig()) {
        const sendGridMessage =
          error?.response?.body?.errors?.[0]?.message || error.message || "SendGrid delivery failed";
        throw new Error(
          `Email delivery failed through SendGrid. Check that the sender address is verified and allowed. ${sendGridMessage}`,
        );
      }
    }
  }

  if (!hasNodemailerConfig()) {
    throw new Error(
      "Email service is not configured. Add a verified SendGrid sender or configure Gmail SMTP credentials.",
    );
  }

  await sendWithNodemailer(payload);
};

const sendMail = async (email, subject, data) => {
  const html = `<!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; background:#f7f7fb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; padding:32px; border:1px solid #e7e7ef;">
          <h2 style="margin:0 0 12px; color:#1f3c88;">Password Reset OTP</h2>
          <p style="margin:0 0 16px; color:#555;">Use the one-time password below to reset your password.</p>
          <div style="font-size:28px; letter-spacing:8px; font-weight:700; color:#111; margin:24px 0;">${escapeHtml(data.otp)}</div>
          <p style="margin:0 0 8px; color:#555;">This OTP will expire in ${escapeHtml(
            data.expiresInMinutes || 10,
          )} minutes.</p>
          <p style="margin:0; color:#777;">If you did not request this, you can ignore this email.</p>
        </div>
      </body>
    </html>`;

  await sendEmail({
    to: [email],
    subject,
    html,
    text: `Your OTP is ${data.otp}. It expires in ${data.expiresInMinutes || 10} minutes.`,
  });
};

const sendResetMail = async (email, subject, data) => {
  const html = `<!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Reset Your Password</title>
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      background-color: #f3f3f3;
                      margin: 0;
                      padding: 0;
                    }
                    .container {
                      background-color: #ffffff;
                      padding: 20px;
                      margin: 20px auto;
                      border-radius: 8px;
                      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                      max-width: 600px;
                    }
                    h1 {
                      color: #5a2d82;
                    }
                    p {
                      color: #666666;
                    }
                    .button {
                      display: inline-block;
                      padding: 15px 25px;
                      margin: 20px 0;
                      background-color: #5a2d82;
                      color: white;
                      text-decoration: none;
                      border-radius: 4px;
                      font-size: 16px;
                    }
                    .footer {
                      margin-top: 20px;
                      color: #999999;
                      text-align: center;
                    }
                    .footer a {
                      color: #5a2d82;
                      text-decoration: none;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>Reset Your Password</h1>
                    <p>Hello,</p>
                    <p>You have requested to reset your password. Please click the button below to reset your password.</p>
                    <a href="${process.env.frontend_url}reset-password/${data.token}" class="button">Reset Password</a>
                    <p>If you did not request this, please ignore this email.</p>
                    <div class="footer">
                      <p>Thank you,<br>Your Website Team</p>
                      <p><a href="https://yourwebsite.com">yourwebsite.com</a></p>
                    </div>
                  </div>
                </body>
                </html>`;

  await sendEmail({
    to: [email],
    subject,
    html,
    text: `Reset your password by visiting ${process.env.frontend_url}reset-password/${data.token}`,
  });
};

const sendComposedEmail = async ({
  to,
  cc,
  bcc,
  subject,
  body,
  attachments = [],
  senderName,
  senderEmail,
}) => {
  const escapedBody = escapeHtml(body).replace(/\r?\n/g, "<br />");
  const senderLine = senderName
    ? `${escapeHtml(senderName)} via Vahani LMS`
    : "Vahani LMS";
  const senderNote = senderEmail
    ? `Replies will go to ${escapeHtml(senderEmail)}.`
    : "Replies will be handled through the LMS support flow.";
  const html = `<!DOCTYPE html>
    <html lang="en">
      <body style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#1f2937;">
        <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
          <div style="padding:24px 28px;background:#0f4c81;color:#ffffff;">
            <h1 style="margin:0;font-size:20px;">${senderLine}</h1>
            <p style="margin:8px 0 0;font-size:13px;opacity:0.9;">Message sent through the Vahani LMS communication center</p>
          </div>
          <div style="padding:28px;">
            <div style="font-size:15px;line-height:1.7;">${escapedBody}</div>
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:13px;color:#6b7280;">
              ${senderNote}
            </div>
          </div>
        </div>
      </body>
    </html>`;

  await sendEmail({
    to,
    cc,
    bcc,
    subject,
    text: body,
    html,
    attachments,
    replyTo: senderEmail || undefined,
    fromName: senderLine,
  });
};

const sendLoginCredentialsMail = async ({
  email,
  name,
  password,
}) => {
  const safeName = escapeHtml(name || "there");
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(password);
  const portalUrl =
    process.env.FRONTEND_URL ||
    process.env.frontend_url ||
    "http://localhost:5173";

  const html = `<!DOCTYPE html>
    <html lang="en">
      <body style="margin:0;background:#f6f8fb;padding:24px;font-family:Arial,sans-serif;color:#1f2937;">
        <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
          <div style="padding:24px 28px;background:#0f4c81;color:#ffffff;">
            <h1 style="margin:0;font-size:20px;">Welcome to Vahani LMS</h1>
            <p style="margin:8px 0 0;font-size:13px;opacity:0.9;">Your login credentials are ready</p>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 16px;">Hello ${safeName},</p>
            <p style="margin:0 0 16px;line-height:1.7;">
              Your account has been created for the Vahani LMS portal. Kindly use the credentials below to log in.
            </p>
            <div style="border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px;background:#f9fafb;">
              <p style="margin:0 0 10px;"><strong>Email:</strong> ${safeEmail}</p>
              <p style="margin:0;"><strong>Password:</strong> ${safePassword}</p>
            </div>
            <p style="margin:18px 0 0;line-height:1.7;">
              Login URL: <a href="${escapeHtml(portalUrl)}">${escapeHtml(portalUrl)}</a>
            </p>
          </div>
        </div>
      </body>
    </html>`;

  await sendEmail({
    to: [email],
    subject: "Your Vahani LMS login credentials",
    html,
    text: `Hello ${name || "there"}, your Vahani LMS account has been created. Email: ${email}. Password: ${password}. Kindly use these credentials to log in at ${portalUrl}.`,
  });
};

export { sendMail, sendResetMail, sendComposedEmail, sendLoginCredentialsMail };
