// Configuración del entorno: se lee y valida process.env una sola vez (la primera vez que se pide).
// Es perezosa a propósito: las pruebas y server.mjs cargan el .env después de importar los módulos.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let cached;

// TRUST_PROXY: vacío o "false" = desactivado; "true" = confiar; número = saltos; otro texto = valor de Express.
function parseTrustProxy(value) {
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

function parsePort(value, fallback, name) {
  const port = Number(value || fallback);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error(`${name} inválido`);
  return port;
}

export function getEnv() {
  if (cached) return cached;
  const e = process.env;
  const host = e.HOST || '127.0.0.1';
  const port = parsePort(e.PORT, 3002, 'PORT');
  cached = Object.freeze({
    root,
    host,
    port,
    appOrigin: e.APP_ORIGIN || `http://${host}:${port}`,
    secureCookies: e.NODE_ENV === 'production',
    uploadDir: e.UPLOAD_DIR && path.resolve(root, e.UPLOAD_DIR),
    trustProxy: parseTrustProxy(e.TRUST_PROXY),
    mysql: Object.freeze({
      host: e.MYSQL_HOST || '127.0.0.1',
      port: parsePort(e.MYSQL_PORT, 3306, 'MYSQL_PORT'),
      user: e.MYSQL_USER || 'fenixa_app',
      password: e.MYSQL_PASSWORD,
      database: e.MYSQL_DATABASE || 'fenixa'
    })
  });
  return cached;
}
