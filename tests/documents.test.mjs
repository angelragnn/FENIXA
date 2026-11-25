import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createApp } from '../server/app.mjs';
process.loadEnvFile('.env');

test('Adjuntos: vista en línea, borrado y propiedad', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'fenixa-docs-'));
  const { app, db } = await createApp({ database: { database: 'fenixa_test' }, uploadDir: dir, authLimit: 100, rateLimit: 1000, quiet: true });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (route, method = 'GET', body, cookie) => fetch(base + route, {
    method, redirect: 'manual',
    headers: { ...(body instanceof FormData ? {} : { 'content-type': 'application/json' }), ...(cookie ? { cookie } : {}) },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body)
  });
  const register = async () => {
    const r = await call('/api/auth/register', 'POST', { name: 'Estudiante', email: `${randomUUID()}@example.test`, password: 'Aprendiendo2026!' });
    assert.equal(r.status, 201);
    return r.headers.get('set-cookie').split(';')[0];
  };
  try {
    const owner = await register();
    const other = await register();
    const r = await call('/api/proposals', 'POST', { title: 'Adjuntos de prueba', purpose: 'estudio', budget: 3000000, componentIds: [1, 2, 3] }, owner);
    assert.equal(r.status, 201);
    const proposalId = (await r.json()).data.id;
    const upload = async () => {
      const data = new FormData();
      data.append('file', new Blob([Buffer.from('%PDF-1.4\nPrueba\n%%EOF')], { type: 'application/pdf' }), 'cotización.pdf');
      const res = await call(`/api/proposals/${proposalId}/files`, 'POST', data, owner);
      assert.equal(res.status, 201);
      return (await res.json()).data.id;
    };
    const snapshotId = (await (await call(`/api/proposals/${proposalId}/files`, 'GET', undefined, owner)).json()).data.find(f => f.kind === 'snapshot').id;

    await t.test('inline de un PDF propio: Content-Disposition inline, tipo, nosniff y CSP restrictiva', async () => {
      const id = await upload();
      const res = await call(`/api/files/${id}?inline=1`, 'GET', undefined, owner);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-disposition'), /^inline/);
      assert.match(res.headers.get('content-type'), /^application\/pdf/);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
      assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
      assert.match(await res.text(), /^%PDF-/);
      assert.match((await call(`/api/files/${id}`, 'GET', undefined, owner)).headers.get('content-disposition'), /^attachment/);
      assert.equal((await call(`/api/files/${id}?inline=1`, 'GET', undefined, other)).status, 404);
      assert.equal((await call(`/api/files/${id}?inline=1`)).status, 401);
    });

    await t.test('inline de una versión JSON no se muestra en línea', async () => {
      const res = await call(`/api/files/${snapshotId}?inline=1`, 'GET', undefined, owner);
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-disposition'), /^attachment/);
    });

    await t.test('DELETE propio: 204, luego 404, sin fila ni archivo y con historial', async () => {
      const id = await upload();
      const filesBefore = (await readdir(dir)).length;
      assert.equal((await call(`/api/files/${id}`, 'DELETE', undefined, owner)).status, 204);
      assert.equal((await call(`/api/files/${id}`, 'GET', undefined, owner)).status, 404);
      assert.equal((await call(`/api/files/${id}`, 'DELETE', undefined, owner)).status, 404);
      assert.equal(await db.prepare('SELECT id FROM documents WHERE id=?').get(id), undefined);
      assert.equal((await readdir(dir)).length, filesBefore - 1);
      const history = (await (await call(`/api/proposals/${proposalId}/history`, 'GET', undefined, owner)).json()).data;
      assert.ok(history.some(h => h.action.startsWith('Adjunto eliminado')));
    });

    await t.test('DELETE con el archivo físico ausente sigue siendo 204', async () => {
      const id = await upload();
      const row = await db.prepare('SELECT path FROM documents WHERE id=?').get(id);
      await rm(path.join(dir, row.path));
      assert.equal((await call(`/api/files/${id}`, 'DELETE', undefined, owner)).status, 204);
    });

    await t.test('DELETE ajeno: 404 y el archivo sigue intacto', async () => {
      const id = await upload();
      assert.equal((await call(`/api/files/${id}`, 'DELETE', undefined, other)).status, 404);
      assert.equal((await call(`/api/files/${id}`, 'GET', undefined, owner)).status, 200);
      assert.equal((await call(`/api/files/${id}`, 'DELETE')).status, 401);
    });

    await t.test('DELETE de una versión JSON automática: 409 y sigue existiendo', async () => {
      const res = await call(`/api/files/${snapshotId}`, 'DELETE', undefined, owner);
      assert.equal(res.status, 409);
      assert.match((await res.json()).error, /no se pueden eliminar/);
      assert.equal((await call(`/api/files/${snapshotId}`, 'GET', undefined, owner)).status, 200);
    });

    await t.test('una transacción fallida no pierde el archivo físico', async () => {
      const id = await upload();
      const transaction = db.transaction;
      db.transaction = callback => transaction(async () => { await callback(); throw Error('Fallo controlado'); });
      try {
        assert.equal((await call(`/api/files/${id}`, 'DELETE', undefined, owner)).status, 500);
      } finally { db.transaction = transaction; }
      assert.equal((await call(`/api/files/${id}`, 'GET', undefined, owner)).status, 200);
    });

    await t.test('id mal formado o inline inválido: 400', async () => {
      assert.equal((await call('/api/files/no-es-uuid', 'DELETE', undefined, owner)).status, 400);
      assert.equal((await call('/api/files/no-es-uuid?inline=1', 'GET', undefined, owner)).status, 400);
      assert.equal((await call(`/api/files/${randomUUID()}?inline=2`, 'GET', undefined, owner)).status, 400);
    });
  } finally {
    await new Promise(resolve => server.close(resolve));
    await db.close();
    await rm(dir, { recursive: true, force: true });
  }
});
