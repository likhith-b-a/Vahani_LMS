import db from "../db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { sendComposedEmail } from "../utils/sendMail.js";

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

const resolveAllowedRecipients = async (actor, userIds = []) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new ApiError(400, "Choose at least one recipient");
  }

  if (actor.role === "admin") {
    return db.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  if (actor.role === "programme_manager") {
    return db.user.findMany({
      where: {
        id: {
          in: userIds,
        },
        role: "scholar",
        enrollments: {
          some: {
            programme: {
              programmeManagerId: actor.id,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  throw new ApiError(403, "You are not allowed to send emails from here");
};

const sendRoleBasedEmail = asyncHandler(async (req, res) => {
  const userIds = normalizeEmailList(req.body.userIds);
  const subject = String(req.body.subject || "").trim();
  const body = String(req.body.body || "").trim();
  const cc = normalizeEmailList(req.body.cc);
  const bcc = normalizeEmailList(req.body.bcc);

  if (!subject) {
    throw new ApiError(400, "Subject is required");
  }

  if (!body) {
    throw new ApiError(400, "Email body is required");
  }

  const recipients = await resolveAllowedRecipients(req.user, userIds);

  if (!recipients.length) {
    throw new ApiError(400, "No valid recipients matched your selection");
  }

  const attachments = Array.isArray(req.files)
    ? req.files.map((file) => ({
        filename: file.originalname,
        type: file.mimetype,
        content: file.buffer,
      }))
    : [];

  await sendComposedEmail({
    to: recipients.map((recipient) => recipient.email),
    cc,
    bcc,
    subject,
    body,
    attachments,
    senderName: req.user.name,
    senderEmail: req.user.email,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        recipientCount: recipients.length,
        recipients,
      },
      "Email sent successfully",
    ),
  );
});

export { sendRoleBasedEmail };
