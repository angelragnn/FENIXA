// Ensamblado de la aplicación: middleware global, servicios, controladores, rutas y errores.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { getEnv } from './env.mjs';
import { createStorage } from './storage/index.mjs';
import { openStore } from './store.mjs';
import { attachUser } from './middleware/auth.mjs';
import { originControl } from './middleware/origin.mjs';
import { apiLimiter, authLimiter } from './middleware/rate-limit.mjs';
import { notFound, errorHandler } from './middleware/errors.mjs';
import { createAuthService } from './services/auth-service.mjs';
import { createDocumentService } from './services/document-service.mjs';
import { createProposalService } from './services/proposal-service.mjs';
import { createCatalogService } from './services/catalog-service.mjs';
import { createAuthController } from './controllers/auth-controller.mjs';
import { createProposalController } from './controllers/proposal-controller.mjs';
import { createDocumentController } from './controllers/document-controller.mjs';
import { createCatalogController } from './controllers/catalog-controller.mjs';
import { authRoutes } from './routes/auth-routes.mjs';
import { proposalRoutes } from './routes/proposal-routes.mjs';
import { fileRoutes } from './routes/file-routes.mjs';
import { catalogRoutes } from './routes/catalog-routes.mjs';
import { healthRoutes } from './routes/health-routes.mjs';
import { pageRoutes } from './routes/pages.mjs';

export async function createApp(options = {}) {
  const env = getEnv();
  const db = await openStore(options.database);
  const filesDir = path.resolve(options.uploadDir || path.join(env.root, 'storage/files'));
  // Almacenamiento de adjuntos: se puede inyectar (options.storage) o se elige por STORAGE_DRIVER; con uploadDir (pruebas) siempre es local.
  const storage = options.storage || createStorage({ driver: options.storageDriver || (options.uploadDir ? 'local' : env.storage.driver), filesDir, supabase: env.storage.supabase });
  const origin = options.origin || 'http://127.0.0.1:3002';
  // Servicios (lógica) -> controladores (req/res) -> rutas (URLs).
  const auth = createAuthService({ db });
  const documents = createDocumentService({ db, storage });
  const proposals = createProposalService({ db, documents });
  const catalog = createCatalogService({ db });
  const authController = createAuthController({ auth, secureCookies: options.secureCookies || false });
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy);
  app.use(helmet({ contentSecurityPolicy: { directives: { 'script-src': ["'self'", "'unsafe-inline'"], 'upgrade-insecure-requests': null } } }));
  app.use(cors({ origin, credentials: true }));
  app.use(healthRoutes(db));
  app.use(express.json({ limit: '32kb' }));
  app.use(originControl(origin));
  app.use('/api', apiLimiter(options));
  app.use(attachUser(auth));
  app.use('/api/auth', authRoutes(authController, authLimiter(options)));
  app.use('/api/proposals', proposalRoutes(createProposalController({ proposals }), createDocumentController({ documents, proposals })));
  app.use('/api/files', fileRoutes(createDocumentController({ documents, proposals })));
  app.use('/api', catalogRoutes(createCatalogController({ catalog })));
  app.use(pageRoutes(env.root));
  app.use(notFound);
  app.use(errorHandler(options));
  return { app, db };
}
