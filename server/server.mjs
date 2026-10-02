import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { dist, host, port } from './config.mjs';
import { openDatabase, databaseHealth } from './db/database.mjs';

const db = await openDatabase();

const json = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
};

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

async function serveStatic(request, response) {
  const requested = request.url === '/' ? '/university.html' : request.url.split('?')[0];
  const filename = path.resolve(dist, `.${requested}`);
  if (!filename.startsWith(`${dist}${path.sep}`) || !existsSync(filename)) {
    json(response, 404, { error: 'Not found' });
    return;
  }
  response.writeHead(200, { 'content-type': contentTypes[path.extname(filename)] || 'application/octet-stream' });
  response.end(await readFile(filename));
}

const server = createServer(async (request, response) => {
  try {
    if (request.method !== 'GET') return json(response, 405, { error: 'Only GET is available in the prototype' });
    if (request.url === '/health') {
      const health = databaseHealth(db);
      return json(response, health.status === 'ok' ? 200 : 503, health);
    }
    if (request.url === '/api/summary') {
      const metadata = db.prepare('SELECT COUNT(*) AS total FROM app_meta').get();
      const events = db.prepare('SELECT COUNT(*) AS total FROM demo_events').get();
      return json(response, 200, { database: 'sqlite', metadataRows: metadata.total, demoEvents: events.total });
    }
    return await serveStatic(request, response);
  } catch (error) {
    return json(response, 500, { status: 'error', message: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`FENIXA Universidad disponible en http://${host}:${port}`);
});
