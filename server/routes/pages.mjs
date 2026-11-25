// Páginas HTML, documentación y archivos estáticos. /dashboard redirige a /login sin sesión.
import express, { Router } from 'express';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';
import { specification } from '../openapi.mjs';

export function pageRoutes(root) {
  const router = Router();
  const client = file => path.join(root, 'client', file);
  router.get('/catalog', (req, res) => res.sendFile(client('catalog.html')));
  router.get('/docs.json', (req, res) => res.json(specification));
  router.use('/docs', swaggerUi.serve, swaggerUi.setup(specification));
  // Páginas con sesión: sin caché, para que el botón atrás tras salir no muestre datos.
  const noStore = (res, file) => { res.set('Cache-Control', 'no-store'); res.sendFile(client(file)); };
  router.get('/dashboard', (req, res) => {
    if (req.user) return noStore(res, 'dashboard.html');
    res.set('Cache-Control', 'no-store').redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  });
  router.get(['/login', '/register'], (req, res) => {
    if (!req.user) return noStore(res, 'auth.html');
    const next = String(req.query.next || '');
    const safe = next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/dashboard';
    res.set('Cache-Control', 'no-store').redirect(safe);
  });
  router.use('/assets', express.static(client('assets')));
  router.get('/', (req, res) => res.sendFile(client('index.html')));
  return router;
}
