// Rutas /api/proposals (privadas), con sus adjuntos e historial.
import { Router } from 'express';
import multer from 'multer';
import { requireUser } from '../middleware/auth.mjs';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 } });

export function proposalRoutes(proposals, documents) {
  const router = Router();
  router.use(requireUser);
  router.get('/', proposals.list);
  router.post('/', proposals.create);
  router.get('/:id', proposals.get);
  router.put('/:id', proposals.update);
  router.delete('/:id', proposals.remove);
  router.get('/:id/history', proposals.history);
  router.get('/:id/files', documents.list);
  router.post('/:id/files', documents.requireOwner, upload.single('file'), documents.upload);
  return router;
}
