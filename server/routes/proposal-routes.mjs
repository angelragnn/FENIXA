// Rutas /api/proposals (privadas), con sus adjuntos e historial.
import { Router } from 'express';
import multer from 'multer';
import { requireUser } from '../middleware/auth.mjs';
import { validate } from '../middleware/validate.mjs';
import { schemas } from '../validation/schemas.mjs';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 } });

const withId = validate({ params: schemas.IdParams });
const withProposal = validate({ body: schemas.ProposalInput });

export function proposalRoutes(proposals, documents) {
  const router = Router();
  router.use(requireUser);
  router.get('/', proposals.list);
  router.post('/', withProposal, proposals.create);
  router.get('/:id', withId, proposals.get);
  router.put('/:id', withId, withProposal, proposals.update);
  router.delete('/:id', withId, proposals.remove);
  router.get('/:id/history', withId, proposals.history);
  router.get('/:id/files', withId, documents.list);
  router.post('/:id/files', withId, documents.requireOwner, upload.single('file'), documents.upload);
  return router;
}
