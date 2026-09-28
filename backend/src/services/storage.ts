// Purpose: Cloudflare R2 / S3-compatible live cloud storage service module
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type StorageInput = {
  fileName: string;
  filePath?: string | null;
  docType?: string | null;
};

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function currentDatePath() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}/${month}`;
}

let s3ClientInstance: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3ClientInstance) return s3ClientInstance;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Cloud storage credentials missing: Set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY');
  }

  // Cloudflare R2 S3 Endpoint format: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  const endpoint = process.env.S3_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  s3ClientInstance = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3ClientInstance;
}

/**
 * Resolves or generates the storage key / path for a file.
 */
export function resolveStoragePath(input: StorageInput): string {
  const providedPath = input.filePath?.trim();
  if (providedPath) return providedPath;

  const safeName = sanitizePathSegment(input.fileName);
  const safeType = sanitizePathSegment((input.docType || 'general').toLowerCase());
  const suffix = `${Date.now()}-${safeName}`;

  const prefix = (process.env.STORAGE_PREFIX || 'b2b-corporates').replace(/^\/+|\/+$/g, '');
  return `${prefix}/${safeType}/${currentDatePath()}/${suffix}`;
}

/**
 * Uploads a file buffer directly to Cloudflare R2 / S3 Live Storage.
 */
export async function uploadToCloudStorage(
  fileBuffer: Buffer,
  key: string,
  contentType: string = 'application/octet-stream'
): Promise<{ key: string; url: string }> {
  const driver = (process.env.FILE_STORAGE_DRIVER || 'local').toLowerCase();

  if (driver === 'local') {
    const localBase = (process.env.LOCAL_STORAGE_DIR || 'uploads').replace(/^\/+|\/+$/g, '');
    return { key, url: `/${localBase}/${key}` };
  }

  const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error('Storage bucket missing: Set R2_BUCKET or S3_BUCKET');
  }

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  const publicUrl = process.env.R2_PUBLIC_URL
    ? `${process.env.R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`
    : `https://${bucket}.r2.cloudflarestorage.com/${key}`;

  return { key, url: publicUrl };
}

/**
 * Generates a presigned upload URL for direct client-to-cloud uploads.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET;
  if (!bucket) throw new Error('Storage bucket missing: Set R2_BUCKET or S3_BUCKET');

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

/**
 * Deletes an object from live cloud storage.
 */
export async function deleteFromCloudStorage(key: string): Promise<void> {
  const bucket = process.env.R2_BUCKET || process.env.S3_BUCKET;
  if (!bucket) throw new Error('Storage bucket missing: Set R2_BUCKET or S3_BUCKET');

  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}
