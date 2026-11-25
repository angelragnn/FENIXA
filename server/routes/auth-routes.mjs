// Rutas /api/auth. Registro y login llevan el límite de intentos.
import { Router } from 'express';
import { requireUser } from '../middleware/auth.mjs';

export function authRoutes(controller, authLimit) {
  const router = Router();
  router.post('/register', authLimit, controller.register);
  router.post('/login', authLimit, controller.login);
  router.get('/me', requireUser, controller.me);
  router.post('/logout', requireUser, controller.logout);
  return router;
}
