// Rutas de salud: /health comprueba MySQL de verdad; /health/live solo el proceso.
import { Router } from 'express';

export function healthRoutes(db) {
  const router = Router();
  router.get('/health', async (req, res) => {
    try {
      await db.prepare('SELECT 1').get();
      res.json({ status: 'ok', database: 'connected', engine: 'mysql' });
    } catch {
      res.status(503).json({ status: 'error', database: 'unavailable' });
    }
  });
  router.get('/health/live', (req, res) => res.json({ status: 'ok' }));
  return router;
}
