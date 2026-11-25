import mysql from 'mysql2/promise';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile, readdir } from 'node:fs/promises';
import { getEnv } from './env.mjs';
// Ejecutor de migraciones versionadas (server/migrations/NNN_*.sql), idempotente.
// La tabla schema_migrations nace en schema.mysql.sql. Un bloqueo de MySQL evita que dos procesos (servidor y pruebas) migren a la vez.
async function runMigrations(pool) {
  const connection = await pool.getConnection();
  try {
    const [[lock]] = await connection.query("SELECT GET_LOCK('fenixa_migrations', 30) AS ok");
    if (Number(lock.ok) !== 1) throw new Error('No se pudo obtener el bloqueo de migraciones (fenixa_migrations): otro proceso está migrando. Inténtalo de nuevo.');
    const directory = new URL('./migrations/', import.meta.url);
    const files = (await readdir(directory)).filter(f => /^\d+_.+\.sql$/.test(f)).sort();
    const [applied] = await connection.query('SELECT version FROM schema_migrations');
    for (const file of files) {
      if (applied.some(row => row.version === file)) continue;
      const sql = (await readFile(new URL(file, directory), 'utf8')).replace(/^\s*--.*$/gm, '');
      // En MySQL los ALTER/CREATE hacen commit implícito: no hay transacción que proteja la migración.
      // La idempotencia la da la comprobación en information_schema y el registro en schema_migrations al final.
      for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) {
        // ALTER TABLE ... ADD COLUMN solo si la columna no existe (la base real ya tiene datos).
        const add = /^ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i.exec(statement);
        if (add) {
          const [found] = await connection.query('SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=?', [add[1], add[2]]);
          if (found.length) continue;
        }
        await connection.query(statement);
      }
      await connection.query('INSERT INTO schema_migrations(version,applied_at) VALUES(?,?)', [file, new Date().toISOString()]);
    }
  } finally {
    await connection.query("SELECT RELEASE_LOCK('fenixa_migrations')").catch(() => {});
    connection.release();
  }
}

export async function openStore(overrides = {}) {
  const pool = mysql.createPool({...getEnv().mysql,connectionLimit:5,...overrides});
  const schema = await readFile(new URL('./schema.mysql.sql',import.meta.url),'utf8');
  for (const statement of schema.split(';').map(s=>s.trim()).filter(Boolean)) await pool.query(statement);
  try { await runMigrations(pool); } catch (error) { await pool.end(); throw error; }
  const catalog = JSON.parse(await readFile(new URL('./data-seeds/catalog.json',import.meta.url),'utf8'));
  const connection = await pool.getConnection();
  let seedError;
  try {
    await connection.beginTransaction();
    for (const c of catalog.categories) await connection.execute('INSERT INTO categories(id,name) VALUES(?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)',[c.id,c.name]);
    for (const p of catalog.products) {
      await connection.execute('INSERT INTO components VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),socket=VALUES(socket),memory_type=VALUES(memory_type),reference_price=VALUES(reference_price)',[p.id,p.category_id,p.name,p.socket,p.memory_type,p.reference_price]);
      await connection.execute('INSERT INTO component_details VALUES(?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE summary=VALUES(summary),image=VALUES(image),specs=VALUES(specs),offers=VALUES(offers),price_min=VALUES(price_min),price_max=VALUES(price_max)',[p.id,p.source_id,p.summary,p.sku,p.source,p.image,JSON.stringify(p.specs),JSON.stringify(p.offers),p.price_min,p.price_max,catalog.importedAt]);
    }
    await connection.commit();
  } catch(error){ await connection.rollback(); seedError=error; }
  finally {connection.release();}
  if(seedError){await pool.end();throw seedError;}
  const context = new AsyncLocalStorage();
  return {
    prepare(sql) {
      const query = async args => (await (context.getStore() || pool).execute(sql,args))[0];
      return {get:async (...args)=>(await query(args))[0],all:async (...args)=>query(args),run:async (...args)=>query(args)};
    },
    async transaction(callback) {
      const connection=await pool.getConnection();
      try {await connection.beginTransaction(); const value=await context.run(connection,callback); await connection.commit();return value;}
      catch(error){await connection.rollback();throw error;} finally{connection.release();}
    },
    close:()=>pool.end()
  };
}
