import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ENDPOINT,
  R2_PUBLIC_BASE
} = process.env;

export function isS3Configured() {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_ENDPOINT) return false;
  if (R2_ENDPOINT.includes('<account')) return false;
  try { new URL(R2_ENDPOINT); } catch { return false; }
  return true;
}

export const s3 = isS3Configured() ? new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
}) : null;

export async function putAvatar(buffer, mimetype) {
  if (!isS3Configured() || !s3) throw new Error('S3_NOT_CONFIGURED');
  const ext = (mimetype?.split('/')?.[1] || 'png').toLowerCase();
  const key = `avatars/${rand(16)}.${ext}`;
  await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: buffer, ContentType: mimetype }));
  if (R2_PUBLIC_BASE) return `${R2_PUBLIC_BASE}/${key}`;
  return `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;
}

function rand(n){const a='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';let s='';while(n--)s+=a[Math.floor(Math.random()*a.length)];return s;}
