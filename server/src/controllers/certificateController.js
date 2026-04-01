import db from "../db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { createNotification } from "../utils/notifications.js";
import {
  buildCertificateSvg,
  buildCredentialId,
  buildVerificationUrl,
  uploadCertificateSvg,
} from "../utils/certificateGenerator.js";

const normalizeCertificate = (certificate) => ({
  id: certificate.id,
  credentialId: certificate.credentialId,
  title: certificate.title,
  description: certificate.description,
  scholarName: certificate.scholarName,
  programmeTitle: certificate.programmeTitle,
  fileUrl: certificate.fileUrl,
  status: certificate.status,
  issuedAt: certificate.issuedAt,
  claimedAt: certificate.claimedAt,
  programme: certificate.programme,
  user: certificate.user,
  issuedBy: certificate.issuedBy,
  verificationUrl: buildVerificationUrl(certificate.credentialId),
});

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const canAccessCertificate = (certificate, user) => {
  if (!user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  if (user.role === "scholar") {
    return certificate.userId === user.id;
  }

  return certificate.programme?.programmeManagerId === user.id;
};

const generateCertificateAsset = async ({
  credentialId,
  scholarName,
  programmeTitle,
  issuedAt,
  programmeCreatedAt,
  programmeCompletedAt,
  programmeId,
}) => {
  const verificationUrl = buildVerificationUrl(credentialId);
  const svg = await buildCertificateSvg({
    credentialId,
    scholarName,
    programmeTitle,
    issuedAt,
    programmeCreatedAt,
    programmeCompletedAt,
    verificationUrl,
  });

  const uploaded = await uploadCertificateSvg({
    svg,
    programmeId,
    credentialId,
  });

  return {
    fileUrl: uploaded.url,
    verificationUrl,
  };
};

const getMyCertificates = asyncHandler(async (req, res) => {
  const certificates = await db.certificate.findMany({
    where: {
      userId: req.user.id,
      status: {
        not: "revoked",
      },
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
    new ApiResponse(
      200,
      { certificates: certificates.map(normalizeCertificate) },
      "Certificates fetched successfully",
    ),
  );
});

const getProgrammeCertificates = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;

  const programme = await db.programme.findFirst({
    where: {
      id: programmeId,
      programmeManagerId: req.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!programme) {
    throw new ApiError(403, "You can only manage certificates for your programmes");
  }

  const certificates = await db.certificate.findMany({
    where: {
      programmeId,
    },
    include: {
      programme: {
        select: {
          id: true,
          title: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          batch: true,
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
    new ApiResponse(
      200,
      { certificates: certificates.map(normalizeCertificate) },
      "Programme certificates fetched successfully",
    ),
  );
});

const generateProgrammeCertificates = asyncHandler(async (req, res) => {
  const { programmeId } = req.params;

  const programme = await db.programme.findFirst({
    where: {
      id: programmeId,
      programmeManagerId: req.user.id,
    },
    include: {
      enrollments: {
        where: {
          status: "completed",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              batch: true,
            },
          },
        },
        orderBy: {
          completedAt: "asc",
        },
      },
    },
  });

  if (!programme) {
    throw new ApiError(403, "You can only generate certificates for your programmes");
  }

  if (!programme.resultsPublishedAt) {
    throw new ApiError(400, "Publish programme results before generating certificates");
  }

  if (programme.enrollments.length === 0) {
    throw new ApiError(400, "No completed scholars were found for this programme");
  }

  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  const existingCertificates = await db.certificate.findMany({
    where: {
      credentialId: {
        startsWith: `VAH`,
      },
    },
    select: {
      credentialId: true,
      userId: true,
    },
  });

  const nextSerialByPrefix = new Map();
  for (const certificate of existingCertificates) {
    const prefix = certificate.credentialId.slice(0, 7);
    const serial = Number(certificate.credentialId.slice(7));
    nextSerialByPrefix.set(prefix, Math.max(nextSerialByPrefix.get(prefix) || 0, serial));
  }

  const generatedCertificates = [];

  for (const enrollment of programme.enrollments) {
    const existingCertificate = await db.certificate.findUnique({
      where: {
        programmeId_userId: {
          programmeId,
          userId: enrollment.userId,
        },
      },
      select: {
        id: true,
        credentialId: true,
        claimedAt: true,
      },
    });

    const issuedAt = existingCertificate ? new Date() : programme.resultsPublishedAt;
    let credentialId = existingCertificate?.credentialId;

    if (!credentialId) {
      const draftId = buildCredentialId({
        programmeTitle: programme.title,
        issuedAt,
        serialNumber: 1,
      });
      const prefix = draftId.slice(0, 7);
      const nextSerial = (nextSerialByPrefix.get(prefix) || 0) + 1;
      nextSerialByPrefix.set(prefix, nextSerial);
      credentialId = buildCredentialId({
        programmeTitle: programme.title,
        issuedAt,
        serialNumber: nextSerial,
      });
    }

    const generatedAsset = await generateCertificateAsset({
      credentialId,
      scholarName: enrollment.user.name,
      programmeTitle: programme.title,
      issuedAt,
      programmeCreatedAt: programme.createdAt,
      programmeCompletedAt: programme.resultsPublishedAt,
      programmeId,
    });

    const certificate = await db.certificate.upsert({
      where: {
        programmeId_userId: {
          programmeId,
          userId: enrollment.userId,
        },
      },
      update: {
        credentialId,
        title: `${programme.title} Certificate of Completion`,
        description: `Certificate of completion for ${programme.title}`,
        scholarName: enrollment.user.name,
        programmeTitle: programme.title,
        fileUrl: generatedAsset.fileUrl,
        status: "available",
        issuedById: req.user.id,
        issuedAt,
      },
      create: {
        credentialId,
        programmeId,
        userId: enrollment.userId,
        title: `${programme.title} Certificate of Completion`,
        description: `Certificate of completion for ${programme.title}`,
        scholarName: enrollment.user.name,
        programmeTitle: programme.title,
        fileUrl: generatedAsset.fileUrl,
        issuedById: req.user.id,
        issuedAt,
      },
      include: {
        programme: {
          select: {
            id: true,
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            batch: true,
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
    });

    await createNotification({
      type: "certificate",
      title: `Certificate available for ${programme.title}`,
      message: `Your certificate is ready with credential ID ${credentialId}.`,
      userIds: [enrollment.userId],
      actorId: req.user.id,
      programmeId,
      actionUrl: "/certificates",
      metadata: {
        credentialId,
      },
    });

    generatedCertificates.push(normalizeCertificate(certificate));
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { certificates: generatedCertificates, generatedCount: generatedCertificates.length },
      "Certificates generated successfully",
    ),
  );
});

const updateCertificate = asyncHandler(async (req, res) => {
  const { certificateId } = req.params;
  const { scholarName, programmeTitle, issuedAt } = req.body;

  const certificate = await db.certificate.findFirst({
    where: {
      id: certificateId,
      programme: {
        programmeManagerId: req.user.id,
      },
    },
    include: {
      programme: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          resultsPublishedAt: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          batch: true,
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
  });

  if (!certificate) {
    throw new ApiError(404, "Certificate not found for this programme manager");
  }

  const nextIssuedAt = issuedAt ? new Date(issuedAt) : certificate.issuedAt;
  const nextScholarName = String(scholarName || certificate.scholarName).trim();
  const nextProgrammeTitle = String(programmeTitle || certificate.programmeTitle).trim();

  if (!nextScholarName || !nextProgrammeTitle) {
    throw new ApiError(400, "Scholar name and programme title are required");
  }

  const generatedAsset = await generateCertificateAsset({
    credentialId: certificate.credentialId,
    scholarName: nextScholarName,
    programmeTitle: nextProgrammeTitle,
    issuedAt: nextIssuedAt,
    programmeCreatedAt: certificate.programme.createdAt,
    programmeCompletedAt: certificate.programme.resultsPublishedAt || nextIssuedAt,
    programmeId: certificate.programmeId,
  });

  const updatedCertificate = await db.certificate.update({
    where: {
      id: certificateId,
    },
    data: {
      scholarName: nextScholarName,
      programmeTitle: nextProgrammeTitle,
      issuedAt: nextIssuedAt,
      fileUrl: generatedAsset.fileUrl,
      issuedById: req.user.id,
    },
    include: {
      programme: {
        select: {
          id: true,
          title: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          batch: true,
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
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      normalizeCertificate(updatedCertificate),
      "Certificate updated successfully",
    ),
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
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      normalizeCertificate(updatedCertificate),
      "Certificate claimed successfully",
    ),
  );
});

const verifyCertificate = asyncHandler(async (req, res) => {
  const { credentialId } = req.params;

  const certificate = await db.certificate.findUnique({
    where: {
      credentialId,
    },
    include: {
      programme: {
        select: {
          id: true,
          title: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          batch: true,
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
  });

  if (!certificate || certificate.status === "revoked") {
    throw new ApiError(404, "Certificate not found or no longer valid");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      normalizeCertificate(certificate),
      "Certificate verified successfully",
    ),
  );
});

const verifyCertificatePage = asyncHandler(async (req, res) => {
  const { credentialId } = req.params;

  const certificate = await db.certificate.findUnique({
    where: {
      credentialId,
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
  });

  if (!certificate || certificate.status === "revoked") {
    return res
      .status(404)
      .type("html")
      .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Certificate not found</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
      .wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .card { width: min(720px, 100%); background: white; border: 1px solid #e2e8f0; border-radius: 24px; padding: 32px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08); }
      h1 { margin: 0 0 12px; font-size: 32px; }
      p { margin: 0; color: #475569; line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>Certificate not found</h1>
        <p>This credential could not be verified or is no longer valid.</p>
      </div>
    </div>
  </body>
</html>`);
  }

  const issueDate = new Date(certificate.issuedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return res
    .status(200)
    .type("html")
    .send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(certificate.credentialId)} verification</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        color: #0f172a;
      }
      .wrap {
        max-width: 1080px;
        margin: 0 auto;
        padding: 32px 20px 48px;
      }
      .hero {
        background: white;
        border: 1px solid #dbeafe;
        border-radius: 28px;
        padding: 28px;
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
      }
      .badge {
        display: inline-block;
        padding: 8px 14px;
        border-radius: 999px;
        background: #dcfce7;
        color: #166534;
        font-weight: 700;
        font-size: 14px;
      }
      h1 {
        margin: 16px 0 10px;
        font-size: clamp(30px, 5vw, 48px);
        line-height: 1.1;
      }
      p {
        margin: 0;
        line-height: 1.6;
        color: #475569;
      }
      .grid {
        display: grid;
        gap: 24px;
        grid-template-columns: 1.05fr 1.4fr;
        margin-top: 28px;
      }
      .card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 24px;
        padding: 24px;
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.06);
      }
      .label {
        display: block;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 6px;
      }
      .value {
        margin: 0 0 18px;
        font-size: 20px;
        font-weight: 700;
        color: #0f172a;
      }
      .preview {
        overflow: hidden;
        padding: 0;
      }
      iframe {
        display: block;
        width: 100%;
        height: 720px;
        border: 0;
        background: white;
      }
      .actions {
        margin-top: 22px;
      }
      .button {
        display: inline-block;
        padding: 12px 18px;
        border-radius: 12px;
        background: #1d4ed8;
        color: white;
        text-decoration: none;
        font-weight: 700;
      }
      @media (max-width: 920px) {
        .grid {
          grid-template-columns: 1fr;
        }
        iframe {
          height: 520px;
        }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <section class="hero">
        <span class="badge">Certificate verified</span>
        <h1>${escapeHtml(certificate.programmeTitle)}</h1>
        <p>This credential is valid and has been issued through the Vahani LMS platform.</p>
      </section>

      <section class="grid">
        <article class="card">
          <span class="label">Credential ID</span>
          <p class="value">${escapeHtml(certificate.credentialId)}</p>

          <span class="label">Scholar</span>
          <p class="value">${escapeHtml(certificate.scholarName)}</p>

          <span class="label">Programme</span>
          <p class="value">${escapeHtml(certificate.programme?.title || certificate.programmeTitle)}</p>

          <span class="label">Issued on</span>
          <p class="value">${escapeHtml(issueDate)}</p>

          <span class="label">Issued by</span>
          <p class="value">${escapeHtml(certificate.issuedBy?.name || "Vahani LMS")}</p>

          <div class="actions">
            <a class="button" href="${escapeHtml(certificate.fileUrl)}" target="_blank" rel="noreferrer">Open certificate</a>
          </div>
        </article>

        <article class="card preview">
          <iframe title="${escapeHtml(certificate.credentialId)}" src="${escapeHtml(certificate.fileUrl)}"></iframe>
        </article>
      </section>
    </main>
  </body>
</html>`);
});

const downloadCertificate = asyncHandler(async (req, res) => {
  const { certificateId } = req.params;

  const certificate = await db.certificate.findFirst({
    where: {
      id: certificateId,
    },
    include: {
      programme: {
        select: {
          id: true,
          programmeManagerId: true,
        },
      },
    },
  });

  if (!certificate || !canAccessCertificate(certificate, req.user)) {
    throw new ApiError(404, "Certificate not found");
  }

  const response = await fetch(certificate.fileUrl);

  if (!response.ok) {
    throw new ApiError(502, "Unable to fetch the certificate file");
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileExtension = certificate.fileUrl.toLowerCase().endsWith(".svg") ? "svg" : "pdf";

  res.setHeader(
    "Content-Type",
    response.headers.get("content-type") || "application/octet-stream",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${certificate.credentialId}.${fileExtension}"`,
  );

  return res.status(200).send(buffer);
});

export {
  claimCertificate,
  downloadCertificate,
  generateProgrammeCertificates,
  getMyCertificates,
  getProgrammeCertificates,
  updateCertificate,
  verifyCertificate,
  verifyCertificatePage,
};
