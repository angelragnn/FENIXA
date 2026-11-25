import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.mjs';
import { getEnv } from './env.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));
// El entorno se lee después de cargar .env.
const env = getEnv();
const { app, db } = await createApp({
  origin: env.appOrigin,
  uploadDir: env.uploadDir,
  secureCookies: env.secureCookies
});
const server = app.listen(env.port, env.host, () => console.log(`FENIXA full stack: http://${env.host}:${env.port}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => { db.close().then(() => process.exit(0)); }));
