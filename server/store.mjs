import mysql from 'mysql2/promise';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile } from 'node:fs/promises';
export async function openStore(overrides = {}) {
  const pool = mysql.createPool({host:process.env.MYSQL_HOST || '127.0.0.1',port:Number(process.env.MYSQL_PORT || 3306),user:process.env.MYSQL_USER || 'fenixa_app',password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE || 'fenixa',connectionLimit:5,...overrides});
  const schema = await readFile(new URL('./schema.mysql.sql',import.meta.url),'utf8');
  for (const statement of schema.split(';').map(s=>s.trim()).filter(Boolean)) await pool.query(statement);
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
