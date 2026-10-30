import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  PUBLIC_APP_URL: z.string().optional(),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória para conexão ao PostgreSQL'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter pelo menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECURE: z.string().optional(),

  STORAGE_DRIVER: z.enum(['s3', 'local']).default('s3'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.string().default('false'),
  S3_SIGNED_URL_TTL: z.coerce.number().default(900),

  MAX_IMAGE_SIZE_MB: z.coerce.number().default(10),
  MAX_VIDEO_SIZE_MB: z.coerce.number().default(60),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:sipat.morvanfigueiredo@senai.br'),

  LGPD_MEDIA_RETENTION_DAYS: z.coerce.number().default(90),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[ENV ERROR] Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

export const isS3Configured = Boolean(
  data.S3_BUCKET &&
    data.S3_ACCESS_KEY_ID &&
    data.S3_SECRET_ACCESS_KEY &&
    data.STORAGE_DRIVER === 's3'
);

export const env = {
  ...data,
  isProd: data.NODE_ENV === 'production',
  cookieSecure:
    data.COOKIE_SECURE !== undefined
      ? data.COOKIE_SECURE === 'true'
      : data.NODE_ENV === 'production',
  s3ForcePathStyle: data.S3_FORCE_PATH_STYLE === 'true',
  isS3Configured,
  maxImageBytes: data.MAX_IMAGE_SIZE_MB * 1024 * 1024,
  maxVideoBytes: data.MAX_VIDEO_SIZE_MB * 1024 * 1024,
};

