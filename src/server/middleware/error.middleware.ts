import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    res.status(400).json({
      error: firstIssue?.message || 'Dados inválidos enviados na requisição.',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: 'O arquivo enviado excede o tamanho máximo permitido pela plataforma.',
      });
      return;
    }
    res.status(400).json({ error: `Erro no envio de arquivo: ${err.message}` });
    return;
  }

  console.error('[UNHANDLED API ERROR]', err);
  const message = err instanceof Error ? err.message : 'Erro interno inesperado no servidor.';
  res.status(500).json({ error: message });
}
