// Driver local: archivos en una carpeta del disco (comportamiento original de la app).
import { mkdirSync, writeFileSync } from 'node:fs';
import { readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { assertKey, StorageError } from './keys.mjs';

export function createLocalStorage({ filesDir }) {
  const base = path.resolve(filesDir);
  mkdirSync(base, { recursive: true });

  // La clave ya está validada; esta comprobación extra garantiza que la ruta final queda dentro de la carpeta.
  function resolveKey(key) {
    assertKey(key);
    const full = path.resolve(base, key);
    if (!full.startsWith(base + path.sep)) throw new StorageError('INVALID_KEY', 'Clave de almacenamiento inválida.');
    return full;
  }

  return {
    describe: () => 'local',
    filesDir: base,

    // Falla si ya existe (flag 'wx'). contentType no se usa en disco: el tipo vive en MySQL.
    async put(key, buffer, _contentType) {
      const full = resolveKey(key);
      mkdirSync(path.dirname(full), { recursive: true });
      try {
        writeFileSync(full, buffer, { flag: 'wx' });
      } catch (error) {
        if (error.code === 'EEXIST') throw new StorageError('EXISTS', 'El archivo ya existe.');
        throw error;
      }
    },

    async get(key) {
      try {
        return await readFile(resolveKey(key));
      } catch (error) {
        if (error.code === 'ENOENT') throw new StorageError('NOT_FOUND', 'Archivo no encontrado.');
        throw error;
      }
    },

    // Idempotente: borrar algo que no existe no es un error.
    async remove(key) {
      await rm(resolveKey(key), { force: true });
    },

    async exists(key) {
      try {
        return (await stat(resolveKey(key))).isFile();
      } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
      }
    }
  };
}
