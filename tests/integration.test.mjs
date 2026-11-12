import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createApp } from '../server/app.mjs';
process.loadEnvFile('.env');

test('Flujo real en MySQL: sesiones, CRUD, componentes, ficheros y aislamiento',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'fenixa-test-'));
  const {app,db}=await createApp({database:{database:'fenixa_test'},uploadDir:dir,authLimit:100,rateLimit:1000,quiet:true});
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;let cookie='';let second='';let id;let fileId;
  async function call(route,method='GET',body,session=cookie){return fetch(base+route,{method,redirect:'manual',headers:{...(body instanceof FormData?{}:{'content-type':'application/json'}),...(session?{cookie:session}:{})},body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body)});}
  try {
    await t.test('health consulta MySQL y URL privada redirige',async()=>{assert.equal((await (await call('/health')).json()).engine,'mysql');const r=await call('/dashboard');assert.equal(r.status,302);assert.equal(r.headers.get('location'),'/login');assert.equal((await call('/api/proposals')).status,401);});
    await t.test('catálogo original público en MySQL con 180 componentes y 10 categorías',async()=>{
      const r=await call('/api/catalog');assert.equal(r.status,200);const rows=(await r.json()).data;
      assert.equal(rows.length,180);assert.equal(new Set(rows.map(p=>p.category_id)).size,10);
      assert.ok(rows.every(p=>p.source_id&&p.image&&p.summary));assert.ok(rows.some(p=>p.specs.values.socket==='AM5'));
      assert.equal((await call('/api/reference-builds')).status,401);
    });
    const email=`${randomUUID()}@example.test`; const password='Aprendiendo2026!';
    await t.test('registro, correo único, contraseña protegida y sesión',async()=>{
      let r=await call('/api/auth/register','POST',{name:'Estudiante',email,password});assert.equal(r.status,201);cookie=r.headers.get('set-cookie').split(';')[0];assert.match(r.headers.get('set-cookie'),/HttpOnly/);
      assert.equal((await call('/api/auth/register','POST',{name:'Otra',email,password})).status,409);
      const account=await db.prepare('SELECT * FROM accounts WHERE email=?').get(email);assert.notEqual(account.password_hash,password);assert.ok(account.password_hash.includes(':'));
      assert.equal((await call('/api/auth/me')).status,200);assert.equal((await call('/dashboard')).status,200);
    });
    await t.test('un fallo al confirmar revierte datos y limpia la versión física',async()=>{
      const before=(await db.prepare('SELECT COUNT(*) AS total FROM proposals').get()).total;
      const filesBefore=(await readdir(dir)).length;
      const transaction=db.transaction;
      db.transaction=callback=>transaction(async()=>{await callback();throw Error('Fallo controlado de confirmación');});
      try {
        const response=await call('/api/proposals','POST',{title:'Fallo de prueba',purpose:'estudio',budget:3000000,componentIds:[1,2,3]});
        assert.equal(response.status,500);
        assert.equal((await db.prepare('SELECT COUNT(*) AS total FROM proposals').get()).total,before);
        assert.equal((await readdir(dir)).length,filesBefore);
      } finally {db.transaction=transaction;}
    });
    await t.test('build de referencia importada y selección real guardadas con sus relaciones',async()=>{
      const builds=(await (await call('/api/reference-builds')).json()).data;const seedBuilds=JSON.parse(await readFile(new URL('../server/data-seeds/catalog.json',import.meta.url),'utf8')).builds;assert.equal(builds.length,seedBuilds.length);assert.ok(builds.length>=10);
      const input={title:builds[0].name,purpose:'estudio',budget:3500000,componentIds:builds[0].componentIds};
      const r=await call('/api/proposals','POST',input);assert.equal(r.status,201);const saved=(await r.json()).data;
      const row=(await (await call(`/api/proposals/${saved.id}`)).json()).data;assert.equal(row.components.length,builds[0].componentIds.length);
      assert.ok(row.components.some(p=>p.name.includes('Ryzen')));assert.ok(row.compatibility.some(p=>p.includes('coincidente')));
      await call(`/api/proposals/${saved.id}`,'DELETE');
    });
    await t.test('validación, creación, lectura, edición y versiones duales',async()=>{
      assert.equal((await call('/api/proposals','POST',{title:'x'})).status,400);
      const input={title:'PC para multimedia',purpose:'estudio',budget:3000000,notes:'Render y clases',componentIds:[1,2,3]};
      let r=await call('/api/proposals','POST',input);assert.equal(r.status,201);id=(await r.json()).data.id;
      let row=(await (await call(`/api/proposals/${id}`)).json()).data;assert.equal(row.components.length,3);assert.ok(row.compatibility.some(x=>x.includes('coincidente')));
      assert.equal((await call(`/api/proposals/${id}`,'PUT',{...input,componentIds:[1,4,3]})).status,200);
      row=(await (await call(`/api/proposals/${id}`)).json()).data;assert.ok(row.compatibility.some(x=>x.includes('incompatible')));
      const files=(await (await call(`/api/proposals/${id}/files`)).json()).data;assert.equal(files.length,2);
      const snapshot=await (await call(`/api/files/${files[0].id}`)).json();assert.equal(snapshot.title,input.title);assert.equal(snapshot.priceBasis,'historical');assert.ok(snapshot.components.every(p=>p.name&&Number.isInteger(p.referencePrice)));
      assert.equal((await call(`/api/proposals/${id}`,'PUT',{...input,componentIds:[999999]})).status,400);
    });
    await t.test('subida multipart, descarga íntegra y rechazo de tipo/tamaño',async()=>{
      const pdf=Buffer.from('%PDF-1.4\nDocumento de prueba\n%%EOF');const data=new FormData();data.append('file',new Blob([pdf],{type:'application/pdf'}),'cotizacion.pdf');
      let r=await call(`/api/proposals/${id}/files`,'POST',data);assert.equal(r.status,201);fileId=(await r.json()).data.id;
      assert.deepEqual(Buffer.from(await (await call(`/api/files/${fileId}`)).arrayBuffer()),pdf);
      const metadata=await db.prepare('SELECT * FROM documents WHERE id=?').get(fileId);assert.deepEqual(await readFile(path.join(dir,metadata.path)),pdf);
      const bad=new FormData();bad.append('file',new Blob(['falso'],{type:'application/pdf'}),'falso.pdf');assert.equal((await call(`/api/proposals/${id}/files`,'POST',bad)).status,400);
      const large=new FormData();large.append('file',new Blob([Buffer.alloc(6*1024*1024)],{type:'application/pdf'}),'grande.pdf');assert.equal((await call(`/api/proposals/${id}/files`,'POST',large)).status,413);
    });
    await t.test('otra cuenta no accede ni modifica datos o descargas',async()=>{
      const r=await call('/api/auth/register','POST',{name:'Segunda',email:`${randomUUID()}@example.test`,password});second=r.headers.get('set-cookie').split(';')[0];
      assert.equal((await call(`/api/proposals/${id}`,'GET',undefined,second)).status,404);
      assert.equal((await call(`/api/files/${fileId}`,'GET',undefined,second)).status,404);
      assert.equal((await call(`/api/proposals/${id}`,'DELETE',undefined,second)).status,404);
    });
    await t.test('logout revoca cookie; login recupera datos; eliminación bloquea archivos',async()=>{
      assert.equal((await call('/api/auth/logout','POST')).status,204);assert.equal((await call('/api/auth/me')).status,401);
      assert.equal((await call('/api/auth/login','POST',{email,password:'incorrecta'})).status,401);
      let r=await call('/api/auth/login','POST',{email,password});assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];
      assert.equal((await call(`/api/proposals/${id}`)).status,200);
      assert.equal((await call(`/api/proposals/${id}`,'DELETE')).status,204);
      assert.equal((await call(`/api/files/${fileId}`)).status,404);assert.equal((await call(`/api/proposals/${id}`)).status,404);
      assert.equal((await call('/docs.json')).status,200);
    });
  } finally {
    await new Promise(resolve=>server.close(resolve)); await db.close(); await rm(dir,{recursive:true,force:true});
  }
});
