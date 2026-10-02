import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);
export const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT debe ser un entero entre 1 y 65535.');
export const host = process.env.HOST || '127.0.0.1';
export const dist = path.join(root, 'dist');
export const dbPath = path.resolve(root, process.env.DATABASE_PATH || 'server/data/university.sqlite');
