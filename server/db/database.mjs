import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { dbPath, root } from '../config.mjs';

export async function openDatabase() {
  await mkdir(path.dirname(dbPath), { recursive: true });
  const database = new DatabaseSync(dbPath);
  database.exec('PRAGMA foreign_keys = ON');
  database.exec(await readFile(path.join(root, 'server/db/schema.sql'), 'utf8'));
  return database;
}

export function databaseHealth(database) {
  const check = database.prepare('SELECT 1 AS ok').get();
  const schema = database.prepare("SELECT value FROM app_meta WHERE key = 'schema_version'").get();
  return { status: check?.ok === 1 ? 'ok' : 'error', database: check?.ok === 1 ? 'connected' : 'unavailable', schemaVersion: schema?.value || null };
}
