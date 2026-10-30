import multer from 'multer';
import { env } from '../config/env.js';

export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxImageBytes,
    files: 1,
  },
});

export const uploadEvidence = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(env.maxVideoBytes, env.maxImageBytes),
    files: 2,
  },
});

export const uploadSpreadsheet = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});
