import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const probe = createServer();
probe.listen(0, '127.0.0.1');
await once(probe, 'listening');
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const child = spawn(process.execPath, ['server/server.mjs'], {
  cwd: root,
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let errors = '';
child.stderr.on('data', chunk => { errors += chunk; });
try {
  await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`Servidor sin respuesta: ${errors}`)), 10000);
    child.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes('FENIXA Universidad disponible')) { clearTimeout(timer); resolve(); }
    });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Servidor detenido (${code}): ${errors}`)); });
  });
  const base = `http://127.0.0.1:${port}`;
  const response = await fetch(`${base}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', database: 'connected', schemaVersion: '2' });
  const page = await fetch(base).then(result => result.text());
  for (const marker of ['FENIXA Universidad', 'id="login"', 'id="registro"']) assert.ok(page.includes(marker));
  const summary = await fetch(`${base}/api/summary`).then(result => result.json());
  assert.equal(summary.database, 'sqlite');
  assert.ok(summary.metadataRows >= 1);
  assert.equal((await fetch(`${base}/health`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${base}/no-existe`)).status, 404);
  console.log('PASS: pagina inicial, Login/Registro, /health conectado a SQLite y respuestas de la API.');
} finally {
  const closed = once(child, 'exit');
  child.kill();
  await closed;
}
