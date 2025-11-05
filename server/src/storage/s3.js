import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ENDPOINT,
  R2_PUBLIC_BASE
} = process.env;

// consider S3 ready only if EVERY field looks valid
export function isS3Configured() {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_ENDPOINT) return false;
  if (R2_ENDPOINT.includes('<accountid>')) return false;
  try { new URL(R2_ENDPOINT); } catch { return false; }
  return true;
}

export const s3 = isS3Configured()
  ? new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY
      }
    })
  : null;

export async function putAvatar(buffer, mimetype) {
  if (!isS3Configured() || !s3) throw new Error('S3_NOT_CONFIGURED');

  const ext = (mimetype?.split('/')?.[1] || 'png').toLowerCase();
  const key = `avatars/${cryptoRandom(16)}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype
  }));

  if (R2_PUBLIC_BASE) return `${R2_PUBLIC_BASE}/${key}`;
  return `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;
}

function cryptoRandom(len = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
