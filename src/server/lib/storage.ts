import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { env } from '../config/env.js';

const LOCAL_STORAGE_ROOT = path.resolve(process.cwd(), '.local-storage');

let s3Client: S3Client | null = null;

if (env.isS3Configured) {
  s3Client = new S3Client({
    region: env.S3_REGION || 'auto',
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: env.s3ForcePathStyle,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

export const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const ALLOWED_BRAND_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);
export const ALLOWED_VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

/**
 * Valida magic bytes reais do arquivo para impedir upload malicioso com extensão falsificada (LGPD & Segurança)
 */
export function verifyFileSignature(buffer: Buffer, mimeType: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  if (mimeType === 'image/svg+xml') {
    const snippet = buffer.subarray(0, 512).toString('utf8').toLowerCase();
    // Impede <script> ou handlers inline em SVG de marca oficial
    if (snippet.includes('<script') || snippet.includes('javascript:') || snippet.includes('onload=')) {
      return false;
    }
    return snippet.includes('<svg') || snippet.includes('<?xml');
  }
  if (mimeType === 'video/webm') {
    // EBML header 0x1A 0x45 0xDF 0xA3
    return (
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    );
  }
  if (mimeType === 'video/mp4' || mimeType === 'video/quicktime') {
    // ISO Base Media File Format: bytes 4..7 == 'ftyp' ou 'moov' ou 'mdat' ou 'wide'
    if (buffer.length < 12) return false;
    const boxType = buffer.subarray(4, 8).toString('ascii');
    return ['ftyp', 'moov', 'mdat', 'wide', 'free'].includes(boxType);
  }

  return false;
}

export interface StoredObjectResult {
  key: string;
  mimeType: string;
  size: number;
  driver: 's3' | 'local';
}

export async function uploadObject(params: {
  folder: 'avatars' | 'evidences' | 'banners' | 'brand';
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
}): Promise<StoredObjectResult> {
  const ext = EXT_BY_MIME[params.mimeType] || '';
  const datePrefix = new Date().toISOString().slice(0, 10);
  const key = `${params.folder}/${datePrefix}/${crypto.randomUUID()}${ext}`;

  if (s3Client && env.S3_BUCKET) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: params.buffer,
        ContentType: params.mimeType,
        ContentDisposition: 'inline',
      })
    );
    return {
      key,
      mimeType: params.mimeType,
      size: params.buffer.length,
      driver: 's3',
    };
  }

  // Fallback isolado apenas quando S3 não estiver configurado em ambiente local/dev
  const fullPath = path.join(LOCAL_STORAGE_ROOT, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, params.buffer);

  return {
    key,
    mimeType: params.mimeType,
    size: params.buffer.length,
    driver: 'local',
  };
}

export async function getPrivateSignedUrl(key: string): Promise<string | null> {
  if (!key) return null;
  const normalizedKey = normalizeSafeKey(key);
  if (!normalizedKey) return null;

  if (s3Client && env.S3_BUCKET) {
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: normalizedKey,
    });
    return getSignedUrl(s3Client, command, { expiresIn: env.S3_SIGNED_URL_TTL });
  }
  return null;
}

export async function getObjectStream(
  key: string
): Promise<{ stream: Readable; contentLength?: number; contentType?: string } | null> {
  const normalizedKey = normalizeSafeKey(key);
  if (!normalizedKey) return null;

  if (s3Client && env.S3_BUCKET) {
    try {
      const output = await s3Client.send(
        new GetObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: normalizedKey,
        })
      );
      if (!output.Body) return null;
      return {
        stream: output.Body as Readable,
        contentLength: output.ContentLength,
        contentType: output.ContentType,
      };
    } catch {
      return null;
    }
  }

  const fullPath = path.join(LOCAL_STORAGE_ROOT, normalizedKey);
  if (!fullPath.startsWith(LOCAL_STORAGE_ROOT) || !fsSync.existsSync(fullPath)) {
    return null;
  }
  const stat = await fs.stat(fullPath);
  const ext = path.extname(fullPath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
  };
  return {
    stream: fsSync.createReadStream(fullPath),
    contentLength: stat.size,
    contentType: mimeMap[ext] || 'application/octet-stream',
  };
}

export async function deleteObject(key: string | null | undefined): Promise<void> {
  if (!key) return;
  const normalizedKey = normalizeSafeKey(key);
  if (!normalizedKey) return;

  if (s3Client && env.S3_BUCKET) {
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: normalizedKey,
        })
      );
    } catch {
      // ignore if already removed
    }
    return;
  }

  const fullPath = path.join(LOCAL_STORAGE_ROOT, normalizedKey);
  if (fullPath.startsWith(LOCAL_STORAGE_ROOT) && fsSync.existsSync(fullPath)) {
    await fs.unlink(fullPath).catch(() => {});
  }
}

function normalizeSafeKey(key: string): string | null {
  const cleaned = key.replace(/\\/g, '/').replace(/^\/+/, '');
  if (cleaned.includes('..') || cleaned.startsWith('/')) {
    return null;
  }
  return cleaned;
}

export function getStorageStatus() {
  return {
    driver: env.isS3Configured ? 's3-external-object-storage' : 'local-dev-fallback',
    s3Configured: env.isS3Configured,
    bucket: env.S3_BUCKET || null,
  };
}
