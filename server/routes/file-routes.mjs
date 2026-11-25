// Ruta /api/files: descarga de un adjunto propio.
import { Router } from 'express';
import { requireUser } from '../middleware/auth.mjs';

export function fileRoutes(documents) {
  const router = Router();
  router.get('/:fileId', requireUser, documents.download);
  return router;
}
