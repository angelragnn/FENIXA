import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.mjs';
process.loadEnvFile('.env');

test('JSON roto en una ruta de API responde 400 con mensaje en español',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'fenixa-test-'));
  const {app,db}=await createApp({database:{database:'fenixa_test'},uploadDir:dir,quiet:true});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  try {
    const r=await fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:'{"email":'});
    assert.equal(r.status,400);
    assert.deepEqual(await r.json(),{error:'JSON mal formado'});
  } finally {
    await new Promise(resolve=>server.close(resolve));await db.close();await rm(dir,{recursive:true,force:true});
  }
});
