import express from 'express';
import {advise} from './advisor.mjs';
import {checkPart,asPart} from '../client/assets/compatibility.js';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import swaggerUi from 'swagger-ui-express';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, unlinkSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore } from './store.mjs';
import { digest, hashPassword, verifyPassword, sessionToken } from './security.mjs';
import { specification } from './openapi.mjs';

const referenceBuilds = JSON.parse(readFileSync(new URL('./data-seeds/catalog.json',import.meta.url),'utf8')).builds;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fail = (status, message) => Object.assign(new Error(message), { status });
const now = () => new Date().toISOString();
function proposalInput(body) {
  const { title, purpose, budget, notes = '' } = body || {};
  if (typeof title !== 'string' || title.trim().length < 3 || title.length > 100) throw fail(400, 'El título debe tener entre 3 y 100 caracteres.');
  if (!['estudio', 'trabajo', 'juegos'].includes(purpose)) throw fail(400, 'Elige estudio, trabajo o juegos.');
  if (!Number.isSafeInteger(budget) || budget <= 0 || budget > 100000000) throw fail(400, 'El presupuesto debe ser un entero positivo de hasta 100 millones de COP.');
  if (typeof notes !== 'string' || notes.length > 4000) throw fail(400, 'Las notas admiten hasta 4000 caracteres.');
  return { title: title.trim(), purpose, budget, notes };
}

export async function createApp(options = {}) {
  const db = await openStore(options.database);
  const filesDir = path.resolve(options.uploadDir || path.join(root, 'storage/files'));
  mkdirSync(filesDir, { recursive: true });
  const origin = options.origin || 'http://127.0.0.1:3002';
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { 'script-src': ["'self'", "'unsafe-inline'"], 'upgrade-insecure-requests': null } } }));
  app.use(cors({ origin, credentials: true }));
  app.get('/health', async (req, res) => {
    try { await db.prepare('SELECT 1').get(); res.json({ status: 'ok', database: 'connected', engine: 'mysql' }); }
    catch { res.status(503).json({ status: 'error', database: 'unavailable' }); }
  });
  app.get('/health/live', async (req, res) => res.json({ status: 'ok' }));
  app.use(express.json({ limit: '32kb' }));
  app.use(async (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && req.get('origin') && req.get('origin') !== origin) return next(fail(403, 'Origen no permitido.'));
    next();
  });
  app.use('/api', rateLimit({ windowMs: 60000, limit: options.rateLimit || 180, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Demasiadas peticiones. Intenta más tarde.' } }));
  const authLimit = rateLimit({ windowMs: 15 * 60000, limit: options.authLimit || 20, legacyHeaders: false, message: { error: 'Demasiados intentos. Espera 15 minutos.' } });
  async function attachUser(req, res, next) {
    const token = sessionToken(req);
    if (token) req.user = await db.prepare('SELECT a.id,a.name,a.email FROM sessions s JOIN accounts a ON a.id=s.user_id WHERE s.token_hash=? AND s.expires>?').get(digest(token), Date.now());
    next();
  }
  app.use(attachUser);
  const authenticated = (req, res, next) => req.user ? next() : next(fail(401, 'Inicia sesión para continuar.'));
  async function startSession(user, res) {
    const token = randomBytes(32).toString('hex');
    await db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
    await db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token), user.id, Date.now() + 8 * 3600000);
    res.cookie('fenixa_session', token, { httpOnly: true, sameSite: 'strict', secure: options.secureCookies || false, maxAge: 8 * 3600000, path: '/' });
  }
  app.post('/api/auth/register', authLimit, async (req, res) => {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 80 || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 10 || password.length > 128) throw fail(400, 'Revisa nombre, correo y contraseña (10 a 128 caracteres).');
    const passwordHash = await hashPassword(password);
    const user = { id: randomUUID(), name: name.trim(), email: email.toLowerCase().trim() };
    try { await db.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run(user.id, user.name, user.email, passwordHash); }
    catch (error) { if (error.code === 'ER_DUP_ENTRY') throw fail(409, 'Ese correo ya está registrado.'); throw error; }
    await startSession(user, res); res.status(201).json({ data: user });
  });
  app.post('/api/auth/login', authLimit, async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 128) throw fail(400, 'Correo y contraseña requeridos.');
    const user = await db.prepare('SELECT * FROM accounts WHERE email=?').get(email.trim().toLowerCase());
    // También se deriva un hash ante un correo desconocido para reducir diferencias de tiempo.
    const valid = user ? await verifyPassword(password, user.password_hash) : (await hashPassword(password), false);
    if (!valid) throw fail(401, 'Credenciales incorrectas.');
    const old = sessionToken(req); if (old) await db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(old));
    await startSession(user, res); res.json({ data: { id: user.id, name: user.name, email: user.email } });
  });
  app.get('/api/auth/me', authenticated, async (req, res) => res.json({ data: req.user }));
  app.post('/api/auth/logout', authenticated, async (req, res) => {
    await db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(sessionToken(req)));
    res.clearCookie('fenixa_session', { path: '/' }); res.status(204).end();
  });
  async function owned(req) {
    const row = await db.prepare('SELECT * FROM proposals WHERE id=? AND user_id=? AND deleted=0').get(req.params.id, req.user.id);
    if (!row) throw fail(404, 'Propuesta no encontrada.'); return row;
  }
  async function addDocument(userId, proposalId, name, mime, buffer, kind) {
    const id = randomUUID(); const filename = `${id}${kind === 'snapshot' ? '.json' : path.extname(name).toLowerCase()}`;
    writeFileSync(path.join(filesDir, filename), buffer, { flag: 'wx' });
    try { await db.prepare('INSERT INTO documents(id,user_id,proposal_id,name,mime,size,path,kind,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id, userId, proposalId, name, mime, buffer.length, filename, kind, now()); }
    catch (error) { unlinkSync(path.join(filesDir, filename)); throw error; }
    return { id, filename };
  }
  // El registro del dominio, su versión JSON y la actividad se confirman juntos.
  async function saveProposal(req, existing) {
    const input = proposalInput(req.body); const stamp = now();
    const ids = req.body?.componentIds || [];
    if (!Array.isArray(ids) || ids.length > 20 || ids.some(id=>!Number.isSafeInteger(id)) || new Set(ids).size !== ids.length) throw fail(400,'Lista de componentes inválida.');
    const pieces = ids.length ? await db.prepare(`SELECT c.*,d.source FROM components c LEFT JOIN component_details d ON d.component_id=c.id WHERE c.id IN (${ids.map(()=>'?').join(',')})`).all(...ids) : [];
    if (pieces.length !== ids.length) throw fail(400,'Algún componente no existe.');
    if (new Set(pieces.map(p=>p.category_id)).size !== pieces.length) throw fail(400,'Elige una sola pieza por categoría en esta versión.');
    const row = { id: existing?.id || randomUUID(), user_id: req.user.id, ...input, created_at: existing?.created_at || stamp, updated_at: stamp };
    let document;
    return db.transaction(async () => {
    try {
      if (existing) await db.prepare('UPDATE proposals SET title=?,purpose=?,budget=?,notes=?,updated_at=? WHERE id=?').run(row.title, row.purpose, row.budget, row.notes, stamp, row.id);
      else await db.prepare('INSERT INTO proposals(id,user_id,title,purpose,budget,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(row.id,row.user_id,row.title,row.purpose,row.budget,row.notes,stamp,stamp);
      await db.prepare('DELETE FROM proposal_components WHERE proposal_id=?').run(row.id);
      for (const piece of pieces) await db.prepare('INSERT INTO proposal_components VALUES(?,?,?)').run(row.id,piece.id,1);
      row.componentIds = ids;
      row.priceBasis='historical';
      row.components=pieces.map(p=>({id:p.id,name:p.name,categoryId:p.category_id,referencePrice:p.reference_price,source:p.source||null}));
      document = await addDocument(req.user.id, row.id, 'propuesta.json', 'application/json', Buffer.from(JSON.stringify(row, null, 2)), 'snapshot');
      await db.prepare('INSERT INTO history(user_id,proposal_id,action,created_at) VALUES(?,?,?,?)').run(req.user.id,row.id,existing ? 'Propuesta actualizada' : 'Propuesta creada',stamp);
      return row;
    } catch (error) { throw error; }
    }).catch(error=>{if(document)rmSync(path.join(filesDir,document.filename),{force:true});throw error;});
  }
  app.post('/api/advice', async(req,res)=>{const products=await db.prepare('SELECT c.*,d.image,d.specs FROM components c JOIN component_details d ON d.component_id=c.id').all();res.json({data:advise(products,referenceBuilds,req.body)});});
  app.get('/api/reference-builds', authenticated, (req,res)=>res.json({data:referenceBuilds}));
  // Catálogo público de builds completas: cada build con sus piezas, fotos y suma de referencia, de menor a mayor precio.
  app.get('/api/builds', async(req,res)=>{
    const rows=await db.prepare('SELECT c.id,c.category_id,c.name,c.reference_price,cat.name AS category,d.image,d.summary,d.source FROM components c JOIN categories cat ON cat.id=c.category_id JOIN component_details d ON d.component_id=c.id').all();
    const byId=new Map(rows.map(p=>[p.id,p]));
    const data=referenceBuilds.map(build=>{
      const parts=build.componentIds.map(id=>byId.get(id)).filter(Boolean);
      const priced=parts.filter(p=>p.reference_price>0);
      return {id:build.id,name:build.name,use:build.use==='gaming'?'juegos':build.use,short:build.short||'',description:build.description||'',tags:build.tags||[],notes:build.notes||[],componentIds:parts.map(p=>p.id),parts,total:priced.reduce((sum,p)=>sum+p.reference_price,0),missingPrices:parts.length-priced.length,hasDedicatedGpu:parts.some(p=>p.category_id===11)};
    }).sort((a,b)=>a.total-b.total);
    res.json({data});
  });
  app.get('/api/catalog', (req,res,next)=>{ res.set('Cache-Control','no-store');next(); }, async(req,res)=>res.json({data:await db.prepare('SELECT c.*,cat.name AS category,d.source_id,d.summary,d.sku,d.source,d.image,d.specs,d.offers,d.price_min,d.price_max,d.imported_at FROM components c JOIN categories cat ON cat.id=c.category_id JOIN component_details d ON d.component_id=c.id ORDER BY c.id').all()}));
  app.get('/catalog', (req,res)=>res.sendFile(path.join(root,'client/catalog.html')));
  app.get('/api/components', authenticated, async(req,res)=>res.json({data:await db.prepare('SELECT c.*,cat.name AS category,d.source_id,d.image,d.specs,d.summary FROM components c JOIN categories cat ON cat.id=c.category_id LEFT JOIN component_details d ON d.component_id=c.id ORDER BY c.id').all()}));
  app.use('/api/proposals', authenticated);
  app.get('/api/proposals', async (req, res) => res.json({ data: await db.prepare('SELECT * FROM proposals WHERE user_id=? AND deleted=0 ORDER BY updated_at DESC').all(req.user.id) }));
  app.post('/api/proposals', async (req, res) => res.status(201).json({ data: await saveProposal(req) }));
  app.get('/api/proposals/:id', async (req, res) => {
    const row=await owned(req);
    row.components=await db.prepare('SELECT c.*,pc.quantity,d.image,d.specs,d.summary FROM proposal_components pc JOIN components c ON c.id=pc.component_id LEFT JOIN component_details d ON d.component_id=c.id WHERE pc.proposal_id=?').all(row.id);
    row.componentIds=row.components.map(c=>c.id);
    row.compatibilityChecks=row.components.map(p=>({componentId:p.id,...checkPart(asPart(p),row.components.filter(other=>other.category_id!==p.category_id).map(asPart))}));
    const cpu=row.components.find(c=>c.category_id===1); const board=row.components.find(c=>c.category_id===2); const ram=row.components.find(c=>c.category_id===3);
    row.compatibility=[];
    if(cpu?.socket && board?.socket) row.compatibility.push(cpu.socket===board.socket ? 'Socket CPU/placa coincidente.' : 'Advertencia: socket CPU/placa incompatible.');
    if(board?.memory_type && ram?.memory_type) row.compatibility.push(board.memory_type===ram.memory_type ? 'Generación de RAM coincidente.' : 'Advertencia: generación de RAM incompatible.');
    if ((cpu && !cpu.socket) || (board && (!board.socket || !board.memory_type)) || (ram && !ram.memory_type)) row.compatibility.push('Faltan especificaciones verificadas para comprobar alguna de las piezas.');
    row.compatibility.push('Comprobación parcial: revisar BIOS, potencia, conectores, dimensiones y refrigeración.');
    res.json({data:row});
  });
  app.put('/api/proposals/:id', async (req, res) => res.json({ data: await saveProposal(req, await owned(req)) }));
  app.delete('/api/proposals/:id', async (req, res) => {
    const row = await owned(req); await db.prepare('UPDATE proposals SET deleted=1 WHERE id=?').run(row.id); res.status(204).end();
  });
  app.get('/api/proposals/:id/history', async (req, res) => { await owned(req); res.json({ data: await db.prepare('SELECT action,created_at FROM history WHERE proposal_id=? ORDER BY id DESC').all(req.params.id) }); });
  app.get('/api/proposals/:id/files', async (req, res) => {
    await owned(req); res.json({ data: await db.prepare('SELECT id,name,mime,size,kind,created_at FROM documents WHERE proposal_id=? AND deleted=0 ORDER BY created_at DESC').all(req.params.id) });
  });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 } });
  app.post('/api/proposals/:id/files', async (req, res, next) => { await owned(req); next(); }, upload.single('file'), async (req, res) => {
    const file = req.file; if (!file) throw fail(400, 'Selecciona un archivo.');
    const ext = path.extname(file.originalname).toLowerCase();
    const types = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
    const b = file.buffer;
    const signature = ext === '.pdf' ? b.subarray(0,5).toString() === '%PDF-' : ext === '.png' ? b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : b[0] === 255 && b[1] === 216 && b[2] === 255;
    if (!types[ext] || file.mimetype !== types[ext] || !signature) throw fail(400, 'Solo se aceptan PDF, PNG o JPEG con contenido reconocible.');
    const name = path.basename(file.originalname).replace(/[\x00-\x1f]/g, '').slice(0,180);
    const doc = await addDocument(req.user.id, req.params.id, name, types[ext], b, 'upload');
    res.status(201).json({ data: { id: doc.id, name, size: b.length } });
  });
  app.get('/api/files/:fileId', authenticated, async (req, res) => {
    const doc = await db.prepare('SELECT d.* FROM documents d JOIN proposals p ON p.id=d.proposal_id WHERE d.id=? AND d.user_id=? AND d.deleted=0 AND p.deleted=0').get(req.params.fileId, req.user.id);
    if (!doc) throw fail(404, 'Archivo no encontrado.');
    res.download(path.join(filesDir, doc.path), doc.name);
  });
  app.get('/docs.json', async (req, res) => res.json(specification));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specification));
  app.get('/dashboard', (req, res) => req.user ? res.sendFile(path.join(root, 'client/dashboard.html')) : res.redirect('/login'));
  app.get(['/login','/register'], (req, res) => req.user ? res.redirect('/dashboard') : res.sendFile(path.join(root, 'client/auth.html')));
  app.use('/assets', express.static(path.join(root, 'client/assets')));
  app.get('/', (req, res) => res.sendFile(path.join(root, 'client/index.html')));
  app.use((req, res, next) => next(fail(404, 'Ruta no encontrada.')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error instanceof multer.MulterError ? (error.code === 'LIMIT_FILE_SIZE' ? 413 : 400) : error.status || 500;
    if (status >= 500 && !options.quiet) console.error(error);
    res.status(status).json({ error: status >= 500 ? 'Error interno del servidor.' : error instanceof multer.MulterError ? 'Archivo demasiado grande o formulario multipart inválido (máximo 5 MB, un archivo).' : error.message });
  });
  return { app, db };
}
