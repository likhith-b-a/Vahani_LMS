import db from "../db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { createNotification } from "../utils/notifications.js";

const issueCertificate = asyncHandler(async (req, res) => {
  const { programmeId, userId, title, description, fileUrl } = req.body;

  if (!programmeId || !userId || !title || !fileUrl) {
    throw new ApiError(400, "Programme, user, title and file URL are required");
  }

  const programme = await db.programme.findFirst({
    where: {
      id: programmeId,
      programmeManagerId: req.user.id,
    },
  });

  if (!programme) {
    throw new ApiError(403, "You can only issue certificates for your programmes");
  }

  const enrollment = await db.enrollment.findUnique({
    where: {
      userId_programmeId: {
        userId,
        programmeId,
      },
    },
  });

  if (!enrollment) {
    throw new ApiError(404, "Scholar is not enrolled in this programme");
  }

  const certificate = await db.certificate.upsert({
    where: {
      programmeId_userId: {
        programmeId,
        userId,
      },
    },
    update: {
      title,
      description: description || null,
      fileUrl,
      status: "available",
      claimedAt: null,
      issuedById: req.user.id,
      issuedAt: new Date(),
    },
    create: {
      programmeId,
      userId,
      title,
      description: description || null,
      fileUrl,
      issuedById: req.user.id,
    },
  });

  await createNotification({
    type: "certificate",
    title: `Certificate available for ${programme.title}`,
    message: title,
    userIds: [userId],
    actorId: req.user.id,
    programmeId,
    actionUrl: "/profile",
  });

  return res.status(201).json(
    new ApiResponse(201, certificate, "Certificate issued successfully"),
  );
});

const getMyCertificates = asyncHandler(async (req, res) => {
  const certificates = await db.certificate.findMany({
    where: {
      userId: req.user.id,
    },
    include: {
      programme: {
        select: {
          id: true,
          title: true,
        },
      },
      issuedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      issuedAt: "desc",
    },
  });

  return res.status(200).json(
    new ApiResponse(200, { certificates }, "Certificates fetched successfully"),
  );
});

const claimCertificate = asyncHandler(async (req, res) => {
  const { certificateId } = req.params;

  const certificate = await db.certificate.findFirst({
    where: {
      id: certificateId,
      userId: req.user.id,
    },
  });

  if (!certificate) {
    throw new ApiError(404, "Certificate not found");
  }

  const updatedCertificate = await db.certificate.update({
    where: {
      id: certificateId,
    },
    data: {
      status: "claimed",
      claimedAt: new Date(),
    },
  });

  return res.status(200).json(
    new ApiResponse(200, updatedCertificate, "Certificate claimed successfully"),
  );
});

export { claimCertificate, getMyCertificates, issueCertificate };
