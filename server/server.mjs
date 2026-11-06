import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (existsSync(path.join(root, '.env'))) process.loadEnvFile(path.join(root, '.env'));
const port = Number(process.env.PORT || 3002);
const host = process.env.HOST || '127.0.0.1';
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('PORT inválido');
const { app, db } = await createApp({
  origin: process.env.APP_ORIGIN || `http://${host}:${port}`,
  uploadDir: process.env.UPLOAD_DIR && path.resolve(root, process.env.UPLOAD_DIR),
  secureCookies: process.env.NODE_ENV === 'production'
});
const server = app.listen(port, host, () => console.log(`FENIXA full stack: http://${host}:${port}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => { db.close().then(() => process.exit(0)); }));
