import mysql from 'mysql2/promise';
import {stat,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.loadEnvFile(path.join(root,'.env'));
const directory=path.resolve(root,process.env.UPLOAD_DIR||'storage/files');
const connection=await mysql.createConnection({host:process.env.MYSQL_HOST,port:Number(process.env.MYSQL_PORT||3306),user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE});
try {
 const [documents]=await connection.query('SELECT id,path,size FROM documents');const missing=[],incorrect=[];
 for(const doc of documents){
  if(doc.path!==path.basename(doc.path)||['.','..'].includes(doc.path)){incorrect.push(doc.id);continue;}
  try{const file=await stat(path.join(directory,doc.path));if(!file.isFile()||file.size!==Number(doc.size))incorrect.push(doc.id);}catch(error){if(error.code==='ENOENT')missing.push(doc.id);else throw error;}
 }
 const known=new Set(documents.map(d=>d.path));const entries=await readdir(directory,{withFileTypes:true});
 const orphaned=entries.filter(e=>e.isFile()&&!known.has(e.name)).map(e=>e.name);
 const result={registered:documents.length,missing,incorrect,orphaned,readOnly:true};
 console.log(JSON.stringify(result,null,2));if(missing.length||incorrect.length||orphaned.length)process.exitCode=1;
}catch(error){if(error.code!=='ER_NO_SUCH_TABLE')throw error;console.error('Faltan las tablas de la base principal. Ejecuta npm start una vez para crearlas y vuelve a intentarlo.');process.exitCode=1;}finally{await connection.end();}
