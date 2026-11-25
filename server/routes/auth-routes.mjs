// Rutas /api/auth. Registro y login llevan el límite de intentos.
import { Router } from 'express';
import { requireUser } from '../middleware/auth.mjs';
import { validate } from '../middleware/validate.mjs';
import { schemas } from '../validation/schemas.mjs';

export function authRoutes(controller, authLimit) {
  const router = Router();
  router.post('/register', authLimit, validate({ body: schemas.Register }), controller.register);
  router.post('/login', authLimit, validate({ body: schemas.Login }), controller.login);
  router.get('/me', requireUser, controller.me);
  router.post('/logout', requireUser, controller.logout);
  return router;
}
