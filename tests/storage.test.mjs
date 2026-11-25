import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStorage } from '../server/storage/index.mjs';

test('driver local: put/get/exists/remove, duplicado y claves peligrosas', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'fenixa-storage-'));
  try {
    const storage = createStorage({ driver: 'local', filesDir: dir });
    assert.equal(storage.describe(), 'local');
    const data = Buffer.from('hola');
    assert.equal(await storage.exists('a.pdf'), false);
    await storage.put('a.pdf', data, 'application/pdf');
    assert.equal(await storage.exists('a.pdf'), true);
    assert.deepEqual(await storage.get('a.pdf'), data);
    await assert.rejects(storage.put('a.pdf', data, 'application/pdf'), { code: 'EXISTS' });
    await storage.remove('a.pdf');
    await storage.remove('a.pdf'); // idempotente
    assert.equal(await storage.exists('a.pdf'), false);
    await assert.rejects(storage.get('a.pdf'), { code: 'NOT_FOUND' });
    for (const bad of ['../x', 'a/../b', '/etc/passwd', 'a b', 'a\\b', '', 'a//b', 'a/']) {
      await assert.rejects(storage.put(bad, data, 'x/y'), { code: 'INVALID_KEY' }, `debía rechazar ${JSON.stringify(bad)}`);
      await assert.rejects(storage.get(bad), { code: 'INVALID_KEY' });
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('createStorage rechaza drivers desconocidos y supabase sin configuración', () => {
  assert.throws(() => createStorage({ driver: 'ftp' }), /desconocido/);
  assert.throws(() => createStorage({ driver: 'supabase', supabase: { url: 'https://x.supabase.co' } }), /SUPABASE_URL/);
});

test('driver supabase con fetch simulado: URL, método y cabeceras', async () => {
  const original = globalThis.fetch;
  const calls = [];
  let reply = () => new Response('', { status: 200 });
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), ...init }); return reply(); };
  try {
    const storage = createStorage({ driver: 'supabase', supabase: { url: 'https://abc.supabase.co/', serviceKey: 'svc-key', bucket: 'adjuntos' } });
    assert.equal(storage.describe(), 'supabase');
    const data = Buffer.from('contenido');

    await storage.put('u1/doc.pdf', data, 'application/pdf');
    let c = calls.at(-1);
    assert.equal(c.url, 'https://abc.supabase.co/storage/v1/object/adjuntos/u1/doc.pdf');
    assert.equal(c.method, 'POST');
    assert.equal(c.headers.Authorization, 'Bearer svc-key');
    assert.equal(c.headers.apikey, 'svc-key');
    assert.equal(c.headers['Content-Type'], 'application/pdf');
    assert.equal(c.headers['x-upsert'], 'false');
    assert.equal(c.body, data);

    reply = () => new Response('{"error":"Duplicate","message":"The resource already exists"}', { status: 400 });
    await assert.rejects(storage.put('u1/doc.pdf', data, 'application/pdf'), { code: 'EXISTS' });

    reply = () => new Response(data, { status: 200 });
    assert.deepEqual(await storage.get('u1/doc.pdf'), data);
    c = calls.at(-1);
    assert.equal(c.url, 'https://abc.supabase.co/storage/v1/object/authenticated/adjuntos/u1/doc.pdf');
    assert.equal(c.method, 'GET');
    assert.equal(c.headers.Authorization, 'Bearer svc-key');

    reply = () => new Response('{"error":"not_found"}', { status: 404 });
    await assert.rejects(storage.get('u1/doc.pdf'), { code: 'NOT_FOUND' });
    assert.equal(await storage.exists('u1/doc.pdf'), false);

    reply = () => new Response('', { status: 200 });
    assert.equal(await storage.exists('u1/doc.pdf'), true);
    assert.equal(calls.at(-1).method, 'HEAD');

    reply = () => new Response('[]', { status: 200 });
    await storage.remove('u1/doc.pdf');
    c = calls.at(-1);
    assert.equal(c.url, 'https://abc.supabase.co/storage/v1/object/adjuntos');
    assert.equal(c.method, 'DELETE');
    assert.equal(c.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(c.body), { prefixes: ['u1/doc.pdf'] });

    reply = () => new Response('boom', { status: 500 });
    await assert.rejects(storage.put('k.pdf', data, 'application/pdf'), { code: 'BACKEND' });

    const before = calls.length;
    await assert.rejects(storage.get('../secreto'), { code: 'INVALID_KEY' });
    assert.equal(calls.length, before, 'una clave inválida no debe llegar a la red');
  } finally { globalThis.fetch = original; }
});
