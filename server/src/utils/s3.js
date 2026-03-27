import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import path from "path";

const region = process.env.AWS_REGION || process.env.AWS_S3_REGION;
const bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME;
const accessKeyId =
  process.env.AWS_ACCESS_KEY_ID || process.env.AWS_S3_ACCESS_KEY_ID;
const secretAccessKey =
  process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_S3_SECRET_ACCESS_KEY;
const endpoint = process.env.AWS_S3_ENDPOINT || process.env.S3_ENDPOINT;
const publicBaseUrl =
  process.env.AWS_S3_PUBLIC_BASE_URL || process.env.S3_PUBLIC_BASE_URL;

const getMissingS3Config = () => {
  const missing = [];

  if (!region) missing.push("AWS_REGION");
  if (!bucket) missing.push("AWS_S3_BUCKET");
  if (!accessKeyId) missing.push("AWS_ACCESS_KEY_ID");
  if (!secretAccessKey) missing.push("AWS_SECRET_ACCESS_KEY");

  return missing;
};

const s3Client =
  region && bucket && accessKeyId && secretAccessKey
    ? new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        ...(endpoint ? { endpoint } : {}),
      })
    : null;

const sanitizeSegment = (value) =>
  String(value || "file")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const buildPublicUrl = (key) => {
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
  }

  if (endpoint) {
    return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`;
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

const uploadBufferToS3 = async ({
  buffer,
  mimeType,
  originalName,
  folder = "uploads",
}) => {
  if (!s3Client || !bucket) {
    const missingConfig = getMissingS3Config();
    throw new Error(
      `S3 is not configured. Missing: ${missingConfig.join(", ") || "bucket/client configuration"}`,
    );
  }

  const ext = path.extname(originalName || "");
  const fileName = sanitizeSegment(path.basename(originalName || "file", ext));
  const timestamp = Date.now();
  const randomToken = Math.round(Math.random() * 1e9);
  const key = `${folder}/${timestamp}-${randomToken}-${fileName || "file"}${ext.toLowerCase()}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType || "application/octet-stream",
    }),
  );

  return {
    key,
    url: buildPublicUrl(key),
  };
};

export { uploadBufferToS3 };
