// Ruta /api/files: descarga de un adjunto propio.
import { Router } from 'express';
import { requireUser } from '../middleware/auth.mjs';
import { validate } from '../middleware/validate.mjs';
import { schemas } from '../validation/schemas.mjs';

export function fileRoutes(documents) {
  const router = Router();
  router.get('/:fileId', requireUser, validate({ params: schemas.FileIdParams }), documents.download);
  return router;
}
