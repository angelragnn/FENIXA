import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
try {
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(await readFile(new URL('../server/db/schema.sql', import.meta.url), 'utf8'));
  db.exec("INSERT INTO users(id, name, email) VALUES (1, 'Usuario de prueba', 'demo@example.test')");
  assert.throws(() => db.exec("INSERT INTO users(name,email) VALUES ('Otro','DEMO@example.test')"), /UNIQUE/);
  assert.throws(() => db.exec("INSERT INTO files(user_id,original_name,storage_path,mime_type,size_bytes) VALUES (999,'ficha.pdf','fichas/1.pdf','application/pdf',10)"), /FOREIGN KEY/);
  assert.throws(() => db.exec("INSERT INTO files(user_id,original_name,storage_path,mime_type,size_bytes) VALUES (1,'ficha.pdf','fichas/1.pdf','application/pdf',-1)"), /CHECK/);
  db.exec("INSERT INTO files(id,user_id,original_name,storage_path,mime_type,size_bytes) VALUES (1,1,'ficha.pdf','fichas/1.pdf','application/pdf',10)");
  db.exec("INSERT INTO activity(user_id,file_id,action) VALUES (1,1,'consulta de ficha')");
  db.exec('DELETE FROM users WHERE id=1');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM files').get().n, 0);
  const entry = db.prepare('SELECT user_id,file_id FROM activity').get();
  assert.equal(entry.user_id, null);
  assert.equal(entry.file_id, null);
  console.log('PASS: esquema, referencias, correo unico, metadatos y eliminacion consistente.');
} finally { db.close(); }
