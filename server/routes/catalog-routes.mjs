// Rutas públicas del catálogo y del asesor; reference-builds y components exigen sesión.
import { Router } from 'express';
import { requireUser } from '../middleware/auth.mjs';

export function catalogRoutes(controller) {
  const router = Router();
  router.post('/advice', controller.advice);
  router.get('/reference-builds', requireUser, controller.referenceBuilds);
  router.get('/builds', controller.builds);
  router.get('/catalog', controller.catalog);
  router.get('/components', requireUser, controller.components);
  return router;
}
