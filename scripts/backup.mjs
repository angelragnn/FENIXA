import mysql from 'mysql2/promise';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tables=['accounts','categories','components','component_details','proposals','proposal_components','documents','history'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const config=()=>({host:process.env.MYSQL_HOST||'127.0.0.1',port:Number(process.env.MYSQL_PORT||3308),user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE||'fenixa'});
function filename(directory,name){
  if(typeof name!=='string'||name!==path.basename(name)||!name||name==='.'||name==='..')throw Error('Ruta de documento inválida.');
  return path.join(directory,name);
}

export async function backup(){
  const connection=await mysql.createConnection(config());
  const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8);
  const directory=path.join(root,'storage/backups',id);
  await mkdir(path.join(directory,'files'),{recursive:true});
  const data={};
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    for(const table of tables){const [rows]=await connection.query(`SELECT * FROM ${table}`);data[table]=rows;}
    await connection.commit();
  } catch(error){await connection.rollback();throw error;} finally{await connection.end();}
  const payload=Buffer.from(JSON.stringify({version:1,tables:data},null,2));
  await writeFile(path.join(directory,'database.json'),payload,{flag:'wx'});
  const documents=[];
  const sourceDir=path.resolve(root,process.env.UPLOAD_DIR||'storage/files');
  for(const doc of data.documents){
    const source=filename(sourceDir,doc.path);const bytes=await readFile(source);
    if(bytes.length!==Number(doc.size))throw Error(`Tamaño incoherente en documento ${doc.id}. Respaldo incompleto.`);
    await copyFile(source,filename(path.join(directory,'files'),doc.path));
    documents.push({path:doc.path,size:bytes.length,sha256:hash(bytes)});
  }
  const manifest={version:1,createdAt:new Date().toISOString(),sourceDatabase:config().database,databaseSha256:hash(payload),counts:Object.fromEntries(tables.map(t=>[t,data[t].length])),documents,sessionsIncluded:false};
  // El manifiesto se escribe solo al terminar: su ausencia indica un respaldo incompleto.
  await writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
  await writeFile(path.join(root,'storage/backups/latest.json'),JSON.stringify({directory}));
  return {directory,counts:manifest.counts,files:documents.length};
}

export async function restoreCheck(directory){
  const manifest=JSON.parse(await readFile(path.join(directory,'manifest.json'),'utf8'));
  const bytes=await readFile(path.join(directory,'database.json'));
  if(manifest.version!==1||hash(bytes)!==manifest.databaseSha256)throw Error('Respaldo incompleto o alterado.');
  const payload=JSON.parse(bytes);const targetDatabase='fenixa_test';
  if(config().database===targetDatabase||manifest.sourceDatabase===targetDatabase)throw Error('El ensayo requiere una fuente principal diferente de fenixa_test.');
  for(const table of tables)if(!Array.isArray(payload.tables?.[table]))throw Error('Tabla ausente del respaldo.');
  const output=path.join(root,'storage/restore-check',randomUUID(),'files');await mkdir(output,{recursive:true});
  for(const doc of manifest.documents){
    const source=filename(path.join(directory,'files'),doc.path);const data=await readFile(source);
    if(data.length!==doc.size||hash(data)!==doc.sha256)throw Error('Un fichero del respaldo está incompleto o alterado.');
    await copyFile(source,filename(output,doc.path));
    if(hash(await readFile(filename(output,doc.path)))!==doc.sha256)throw Error('La copia restaurada no coincide.');
  }
  for(const doc of payload.tables.documents)if(!manifest.documents.some(f=>f.path===doc.path&&f.size===Number(doc.size)))throw Error('Metadatos sin fichero en el respaldo.');
  const connection=await mysql.createConnection({...config(),database:targetDatabase});
  try {
    const [[identity]]=await connection.query('SELECT DATABASE() AS name');
    if(identity.name!==targetDatabase)throw Error('La conexión no apunta a fenixa_test.');
    const schema=await readFile(path.join(root,'server/schema.mysql.sql'),'utf8');
    for(const sql of schema.split(';').map(s=>s.trim()).filter(s=>s.startsWith('CREATE TABLE')))await connection.query(sql);
    await connection.query('SET FOREIGN_KEY_CHECKS=0');
    await connection.beginTransaction();
    await connection.query('DELETE FROM sessions');
    for(const table of [...tables].reverse())await connection.query(`DELETE FROM ${table}`);
    for(const table of tables){
      const rows=payload.tables[table];
      for(const row of rows){
        const keys=Object.keys(row);if(keys.some(k=>!/^[a-z_]+$/.test(k)))throw Error('Columna inválida.');
        const values=keys.map(k=>row[k]!==null&&typeof row[k]==='object'?JSON.stringify(row[k]):row[k]);
        await connection.execute(`INSERT INTO ${table} (${keys.map(k=>'`'+k+'`').join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,values);
      }
      const [[count]]=await connection.query(`SELECT COUNT(*) AS total FROM ${table}`);
      if(Number(count.total)!==Number(manifest.counts[table]))throw Error('Conteo restaurado incorrecto.');
    }
    // Comprobar relaciones explícitamente: reactivar FOREIGN_KEY_CHECKS no revisa filas previas.
    const [[orphans]]=await connection.query('SELECT COUNT(*) AS total FROM proposal_components pc LEFT JOIN proposals p ON p.id=pc.proposal_id LEFT JOIN components c ON c.id=pc.component_id WHERE p.id IS NULL OR c.id IS NULL');
    if(orphans.total)throw Error('Relaciones huérfanas después de restaurar.');
    const [[missing]]=await connection.query('SELECT COUNT(*) AS total FROM documents d LEFT JOIN accounts a ON a.id=d.user_id LEFT JOIN proposals p ON p.id=d.proposal_id WHERE a.id IS NULL OR p.id IS NULL');
    if(missing.total)throw Error('Metadatos huérfanos después de restaurar.');
    await connection.commit();
  }catch(error){await connection.rollback();throw error;}finally{await connection.query('SET FOREIGN_KEY_CHECKS=1');await connection.end();}
  return {database:targetDatabase,counts:manifest.counts,files:manifest.documents.length,restoredFiles:output,sessionsRestored:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  process.loadEnvFile(path.join(root,'.env'));
  if(process.argv[2]==='restore-check'){
    const latest=JSON.parse(await readFile(path.join(root,'storage/backups/latest.json'),'utf8'));
    console.log(JSON.stringify(await restoreCheck(latest.directory),null,2));
  }else console.log(JSON.stringify(await backup(),null,2));
}
