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
  router.get('/dashboard', (req, res) => (req.user ? res.sendFile(client('dashboard.html')) : res.redirect('/login')));
  router.get(['/login', '/register'], (req, res) => (req.user ? res.redirect('/dashboard') : res.sendFile(client('auth.html'))));
  router.use('/assets', express.static(client('assets')));
  router.get('/', (req, res) => res.sendFile(client('index.html')));
  return router;
}
