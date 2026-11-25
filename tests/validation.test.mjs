import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.mjs';
process.loadEnvFile('.env');

test('Validación de payloads, identificadores, migraciones y huella sha256', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'fenixa-test-'));
  const { app, db } = await createApp({ database: { database: 'fenixa_test' }, uploadDir: dir, authLimit: 100, rateLimit: 1000, quiet: true });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  const call = (route, method = 'GET', body, session = cookie) => fetch(base + route, {
    method,
    headers: { ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }), ...(session ? { cookie: session } : {}) },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body)
  });
  try {
    const r = await call('/api/auth/register', 'POST', { name: 'Validación', email: `${randomUUID()}@example.test`, password: 'Aprendiendo2026!' });
    assert.equal(r.status, 201);
    cookie = r.headers.get('set-cookie').split(';')[0];

    await t.test('payload inválido responde 400 con details legibles (campo + motivo)', async () => {
      let res = await call('/api/proposals', 'POST', { title: 'x', purpose: 'ocio', budget: -5, extra: 1 });
      assert.equal(res.status, 400);
      let body = await res.json();
      assert.match(body.error, /^Datos no válidos/);
      const campos = Object.fromEntries(body.details.map(d => [d.campo, d.motivo]));
      assert.match(campos['título'], /al menos 3/);
      assert.match(campos['uso'], /estudio, trabajo, juegos/);
      assert.match(campos['presupuesto'], /mayor o igual a 1/);
      assert.match(campos['extra'], /no es un campo permitido/);
      res = await call('/api/auth/register', 'POST', { name: 'Ana', email: 'no-es-correo', password: 'corta' });
      assert.equal(res.status, 400);
      body = await res.json();
      assert.ok(body.details.some(d => d.campo === 'correo') && body.details.some(d => d.campo === 'contraseña'));
      res = await call('/api/auth/login', 'POST', {});
      assert.equal(res.status, 400);
      assert.deepEqual((await res.json()).details.map(d => d.campo).sort(), ['contraseña', 'correo']);
      res = await call('/api/advice', 'POST', { budget: 'mucho', purpose: 'estudio' });
      assert.equal(res.status, 400);
      assert.ok((await res.json()).details.some(d => d.campo === 'presupuesto' && /entero/.test(d.motivo)));
    });

    await t.test('id con formato inválido responde 400; UUID válido inexistente sigue siendo 404', async () => {
      // Convención: un id mal formado es un dato no válido (400); uno bien formado que no existe o es ajeno, 404.
      let res = await call('/api/proposals/123');
      assert.equal(res.status, 400);
      assert.deepEqual((await res.json()).details, [{ campo: 'id', motivo: 'no tiene un formato de identificador válido' }]);
      assert.equal((await call('/api/proposals/no-es-uuid/files')).status, 400);
      assert.equal((await call('/api/files/xyz')).status, 400);
      assert.equal((await call(`/api/proposals/${randomUUID()}`)).status, 404);
      assert.equal((await call(`/api/files/${randomUUID()}`)).status, 404);
    });

    await t.test('migración 001 registrada y documents.sha256 existe', async () => {
      const applied = await db.prepare('SELECT version FROM schema_migrations').all();
      assert.ok(applied.some(m => m.version === '001_documents_sha256.sql'));
      const column = await db.prepare("SELECT data_type,character_maximum_length AS len FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='documents' AND column_name='sha256'").get();
      assert.equal(column.len, 64);
    });

    await t.test('sha256 guardado tras subir un PDF coincide con el del archivo', async () => {
      const proposal = await (await call('/api/proposals', 'POST', { title: 'PC con adjunto', purpose: 'estudio', budget: 3000000, componentIds: [1, 2, 3] })).json();
      const pdf = Buffer.from('%PDF-1.4\nContenido para huella\n%%EOF');
      const form = new FormData();
      form.append('file', new Blob([pdf], { type: 'application/pdf' }), 'huella.pdf');
      const res = await call(`/api/proposals/${proposal.data.id}/files`, 'POST', form);
      assert.equal(res.status, 201);
      const row = await db.prepare('SELECT path,sha256 FROM documents WHERE id=?').get((await res.json()).data.id);
      assert.equal(row.sha256, createHash('sha256').update(pdf).digest('hex'));
      assert.equal(row.sha256, createHash('sha256').update(await readFile(path.join(dir, row.path))).digest('hex'));
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await db.close();
    await rm(dir, { recursive: true, force: true });
  }
});
