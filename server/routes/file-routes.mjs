// Ruta /api/files: descarga, vista en línea y borrado de un adjunto propio.
import { Router } from 'express';
import { requireUser } from '../middleware/auth.mjs';
import { validate } from '../middleware/validate.mjs';
import { schemas } from '../validation/schemas.mjs';

export function fileRoutes(documents) {
  const router = Router();
  router.get('/:fileId', requireUser, validate({ params: schemas.FileIdParams, query: schemas.FileQuery }), documents.download);
  router.delete('/:fileId', requireUser, validate({ params: schemas.FileIdParams }), documents.remove);
  return router;
}
