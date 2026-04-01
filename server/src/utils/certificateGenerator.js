import QRCode from "qrcode";
import { uploadBufferToS3 } from "./s3.js";

const escapeXml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatProgrammePeriod = (startValue, endValue) => {
  if (!startValue || !endValue) {
    return "";
  }

  const start = new Date(startValue).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const end = new Date(endValue).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return `${start} to ${end}`;
};

const buildEventAcronym = (title = "") => {
  const words = String(title)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const acronym = words.map((word) => word[0]).join("").slice(0, 2);
  if (acronym.length === 2) {
    return acronym;
  }

  const fallback = String(title).toUpperCase().replace(/[^A-Z0-9]+/g, "");
  return (acronym + fallback).slice(0, 2).padEnd(2, "X");
};

const buildCredentialId = ({ programmeTitle, issuedAt, serialNumber }) => {
  const yearSuffix = new Date(issuedAt).getFullYear().toString().slice(-2);
  return `VAH${buildEventAcronym(programmeTitle)}${yearSuffix}${String(serialNumber).padStart(3, "0")}`;
};

const buildVerificationUrl = (credentialId) => {
  const backendUrl =
    process.env.BACKEND_URL ||
    process.env.SERVER_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "http://localhost:3000";
  return `${backendUrl.replace(/\/$/, "")}/certificates/verify/${encodeURIComponent(credentialId)}/page`;
};

const buildCertificateSvg = async ({
  credentialId,
  scholarName,
  programmeTitle,
  issuedAt,
  programmeCreatedAt,
  programmeCompletedAt,
  verificationUrl,
}) => {
  const qrSvg = await QRCode.toString(verificationUrl, {
    type: "svg",
    margin: 1,
    width: 220,
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
    errorCorrectionLevel: "H",
  });
  const qrViewBox = qrSvg.match(/viewBox="([^"]+)"/)?.[1] || "0 0 29 29";
  const qrContent = qrSvg
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<\?xml[^>]*>/g, "");

  const periodLabel = formatProgrammePeriod(programmeCreatedAt, programmeCompletedAt);
  const issueDateLabel = formatDate(issuedAt);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1132" viewBox="0 0 1600 1132" role="img" aria-label="Certificate of Completion">
  <defs>
    <linearGradient id="goldWave" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd783" />
      <stop offset="100%" stop-color="#f4c665" />
    </linearGradient>
  </defs>

  <rect width="1600" height="1132" fill="#fffdf8" />
  <path d="M0,0 H1600 V130 C1490,70 1330,60 1200,120 C1010,210 770,180 610,120 C370,25 150,40 0,110 Z" fill="url(#goldWave)" />
  <path d="M1600,0 V200 C1490,165 1430,80 1360,20 Z" fill="#12175f" />
  <path d="M0,1132 V1015 C130,965 255,975 370,1040 C560,1145 820,1140 1035,1040 C1220,953 1430,940 1600,1015 V1132 Z" fill="url(#goldWave)" />
  <path d="M0,1132 V965 C80,1015 130,1070 210,1132 Z" fill="#12175f" />
  <rect x="74" y="74" width="1452" height="984" rx="30" fill="#fffdf8" stroke="#ece7da" stroke-width="4" />

  <g transform="translate(800 160)">
    <circle cx="0" cy="0" r="70" fill="#ffd783" />
    <line x1="-250" y1="0" x2="250" y2="0" stroke="#c7c4dc" stroke-width="8" />
    <text x="0" y="34" text-anchor="middle" font-size="120" font-family="Arial, Helvetica, sans-serif" font-weight="700" letter-spacing="6" fill="#12175f">VAHANI</text>
  </g>

  <text x="800" y="275" text-anchor="middle" font-size="70" font-family="Georgia, serif" font-weight="700" fill="#12175f">CERTIFICATE OF COMPLETION</text>
  <text x="800" y="352" text-anchor="middle" font-size="34" font-weight="700" fill="#12175f">THIS IS TO CERTIFY THAT</text>
  <text x="800" y="496" text-anchor="middle" font-size="76" font-family="Georgia, serif" font-weight="700" fill="#12175f">${escapeXml(scholarName)}</text>
  <text x="800" y="592" text-anchor="middle" font-size="34" fill="#1a1a1a">has successfully completed the programme</text>
  <text x="800" y="664" text-anchor="middle" font-size="44" font-family="Georgia, serif" font-weight="700" fill="#12175f">${escapeXml(programmeTitle)}</text>
  <text x="800" y="726" text-anchor="middle" font-size="30" fill="#1a1a1a">
    ${periodLabel ? `held from ${escapeXml(periodLabel)}.` : `issued on ${escapeXml(issueDateLabel)}.`}
  </text>
  <text x="800" y="780" text-anchor="middle" font-size="28" fill="#1a1a1a">Issued on ${escapeXml(issueDateLabel)}</text>

  <text x="300" y="905" font-size="46" font-family="Brush Script MT, cursive" fill="#12175f">Preeti Bhatia</text>
  <line x1="220" y1="925" x2="470" y2="925" stroke="#12175f" stroke-width="3" />
  <text x="220" y="965" font-size="28" font-weight="700" fill="#1a1a1a">PREETI BHATIA</text>
  <text x="220" y="1000" font-size="24" fill="#1a1a1a">CEO</text>

  <text x="980" y="905" font-size="46" font-family="Brush Script MT, cursive" fill="#12175f">Reeva Misra</text>
  <line x1="980" y1="925" x2="1280" y2="925" stroke="#12175f" stroke-width="3" />
  <text x="980" y="965" font-size="28" font-weight="700" fill="#1a1a1a">REEVA MISRA</text>
  <text x="980" y="1000" font-size="24" fill="#1a1a1a">CHAIRPERSON</text>

  <rect x="700" y="800" width="200" height="206" rx="24" fill="#ffffff" stroke="#d6d3cb" stroke-width="3" />
  <svg x="724" y="822" width="152" height="152" viewBox="${escapeXml(qrViewBox)}" aria-label="QR code for certificate verification">
    ${qrContent}
  </svg>
  <text x="800" y="992" text-anchor="middle" font-size="18" font-weight="700" fill="#12175f">SCAN TO VERIFY</text>
  <text x="800" y="1012" text-anchor="middle" font-size="13" fill="#4b5563">vahani certificate check</text>
  <text x="800" y="1046" text-anchor="middle" font-size="24" font-weight="700" fill="#12175f">CREDENTIAL ID: ${escapeXml(credentialId)}</text>
</svg>`;
};

const uploadCertificateSvg = async ({ svg, programmeId, credentialId }) => {
  return uploadBufferToS3({
    buffer: Buffer.from(svg, "utf-8"),
    mimeType: "image/svg+xml",
    originalName: `${credentialId}.svg`,
    objectKey: `certificates/${programmeId}/${credentialId}.svg`,
  });
};

export {
  buildCertificateSvg,
  buildCredentialId,
  buildEventAcronym,
  buildVerificationUrl,
  uploadCertificateSvg,
};
