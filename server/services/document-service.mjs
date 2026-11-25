// Servicio de adjuntos: archivos en disco + metadatos en MySQL, con compensación si falla la base.
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { HttpError } from '../middleware/errors.mjs';

const TYPES = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// Comprueba que el contenido real coincida con la extensión declarada.
function hasValidSignature(ext, b) {
  if (ext === '.pdf') return b.subarray(0, 5).toString() === '%PDF-';
  if (ext === '.png') return b.subarray(0, 8).equals(PNG_SIGNATURE);
  return b[0] === 255 && b[1] === 216 && b[2] === 255;
}

export function createDocumentService({ db, storage }) {
  const now = () => new Date().toISOString();

  // Guarda el archivo con nombre UUID (put falla si existe) y registra la fila; si la fila falla, borra el archivo.
  async function add(userId, proposalId, name, mime, buffer, kind) {
    const id = randomUUID();
    const filename = `${id}${kind === 'snapshot' ? '.json' : path.extname(name).toLowerCase()}`;
    await storage.put(filename, buffer, mime);
    try {
      await db.prepare('INSERT INTO documents(id,user_id,proposal_id,name,mime,size,path,kind,created_at,sha256,storage_driver) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
        .run(id, userId, proposalId, name, mime, buffer.length, filename, kind, now(), createHash('sha256').update(buffer).digest('hex'), storage.describe());
    } catch (error) {
      await storage.remove(filename).catch(() => {});
      throw error;
    }
    return { id, filename };
  }

  return {
    storage,
    add,

    list(proposalId) {
      return db.prepare('SELECT id,name,mime,size,kind,created_at FROM documents WHERE proposal_id=? AND deleted=0 ORDER BY created_at DESC').all(proposalId);
    },

    async upload(userId, proposalId, file) {
      if (!file) throw new HttpError(400, 'Selecciona un archivo.');
      const ext = path.extname(file.originalname).toLowerCase();
      const b = file.buffer;
      if (!TYPES[ext] || file.mimetype !== TYPES[ext] || !hasValidSignature(ext, b)) {
        throw new HttpError(400, 'Solo se aceptan PDF, PNG o JPEG con contenido reconocible.');
      }
      const name = path.basename(file.originalname).replace(/[\x00-\x1f]/g, '').slice(0, 180);
      const doc = await add(userId, proposalId, name, TYPES[ext], b, 'upload');
      return { id: doc.id, name, size: b.length };
    },

    // Devuelve el contenido solo si el archivo es del usuario y su decisión no está eliminada.
    async read(userId, fileId) {
      const doc = await db.prepare('SELECT d.* FROM documents d JOIN proposals p ON p.id=d.proposal_id WHERE d.id=? AND d.user_id=? AND d.deleted=0 AND p.deleted=0').get(fileId, userId);
      if (!doc) throw new HttpError(404, 'Archivo no encontrado.');
      const driver = doc.storage_driver || 'local';
      if (driver !== storage.describe()) {
        throw new HttpError(503, `Este archivo está en el almacenamiento "${driver}"; activa STORAGE_DRIVER=${driver} para descargarlo.`);
      }
      try {
        return { buffer: await storage.get(doc.path), name: doc.name, mime: doc.mime };
      } catch (error) {
        if (error.code === 'NOT_FOUND') throw new HttpError(404, 'Archivo no encontrado.');
        throw error;
      }
    }
  };
}
