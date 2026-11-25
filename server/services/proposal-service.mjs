// Servicio de decisiones: decisión + componentes + versión JSON + historial, todo en una transacción.
import { randomUUID } from 'node:crypto';
import { checkPart, asPart } from '../../client/assets/compatibility.js';
import { HttpError } from '../middleware/errors.mjs';

// El esquema (validation/schemas.mjs) ya comprueba tipos y rangos; aquí solo queda lo que no expresa:
// el título cuenta sin espacios al inicio y al final.
function proposalInput(body) {
  const { title, purpose, budget, notes = '' } = body;
  if (title.trim().length < 3) throw new HttpError(400, 'El título debe tener entre 3 y 100 caracteres.');
  return { title: title.trim(), purpose, budget, notes };
}

// Avisos de compatibilidad parcial según socket y generación de RAM.
function compatibilityNotes(components) {
  const cpu = components.find(c => c.category_id === 1);
  const board = components.find(c => c.category_id === 2);
  const ram = components.find(c => c.category_id === 3);
  const notes = [];
  if (cpu?.socket && board?.socket) notes.push(cpu.socket === board.socket ? 'Socket CPU/placa coincidente.' : 'Advertencia: socket CPU/placa incompatible.');
  if (board?.memory_type && ram?.memory_type) notes.push(board.memory_type === ram.memory_type ? 'Generación de RAM coincidente.' : 'Advertencia: generación de RAM incompatible.');
  if ((cpu && !cpu.socket) || (board && (!board.socket || !board.memory_type)) || (ram && !ram.memory_type)) {
    notes.push('Faltan especificaciones verificadas para comprobar alguna de las piezas.');
  }
  notes.push('Comprobación parcial: revisar BIOS, potencia, conectores, dimensiones y refrigeración.');
  return notes;
}

export function createProposalService({ db, documents }) {
  const now = () => new Date().toISOString();

  // Devuelve la decisión solo si pertenece al usuario y no está eliminada.
  async function owned(userId, id) {
    const row = await db.prepare('SELECT * FROM proposals WHERE id=? AND user_id=? AND deleted=0').get(id, userId);
    if (!row) throw new HttpError(404, 'Propuesta no encontrada.');
    return row;
  }

  // Crea o actualiza; si la transacción falla se borra la versión JSON ya escrita en disco.
  async function save(userId, body, existing) {
    const input = proposalInput(body);
    const stamp = now();
    const ids = body.componentIds || [];
    const pieces = ids.length
      ? await db.prepare(`SELECT c.*,d.source FROM components c LEFT JOIN component_details d ON d.component_id=c.id WHERE c.id IN (${ids.map(() => '?').join(',')})`).all(...ids)
      : [];
    if (pieces.length !== ids.length) throw new HttpError(400, 'Algún componente no existe.');
    if (new Set(pieces.map(p => p.category_id)).size !== pieces.length) throw new HttpError(400, 'Elige una sola pieza por categoría en esta versión.');
    const row = { id: existing?.id || randomUUID(), user_id: userId, ...input, created_at: existing?.created_at || stamp, updated_at: stamp };
    let document;
    // db.transaction se busca en el momento de usarlo (las pruebas lo sustituyen).
    return db.transaction(async () => {
      if (existing) await db.prepare('UPDATE proposals SET title=?,purpose=?,budget=?,notes=?,updated_at=? WHERE id=?').run(row.title, row.purpose, row.budget, row.notes, stamp, row.id);
      else await db.prepare('INSERT INTO proposals(id,user_id,title,purpose,budget,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(row.id, row.user_id, row.title, row.purpose, row.budget, row.notes, stamp, stamp);
      await db.prepare('DELETE FROM proposal_components WHERE proposal_id=?').run(row.id);
      for (const piece of pieces) await db.prepare('INSERT INTO proposal_components VALUES(?,?,?)').run(row.id, piece.id, 1);
      row.componentIds = ids;
      row.priceBasis = 'historical';
      row.components = pieces.map(p => ({ id: p.id, name: p.name, categoryId: p.category_id, referencePrice: p.reference_price, source: p.source || null }));
      document = await documents.add(userId, row.id, 'propuesta.json', 'application/json', Buffer.from(JSON.stringify(row, null, 2)), 'snapshot');
      await db.prepare('INSERT INTO history(user_id,proposal_id,action,created_at) VALUES(?,?,?,?)').run(userId, row.id, existing ? 'Propuesta actualizada' : 'Propuesta creada', stamp);
      return row;
    }).catch(async error => {
      // Compensación: la versión JSON ya estaba guardada aunque la transacción haya fallado.
      if (document) await documents.discard(document.filename);
      throw error;
    });
  }

  return {
    owned,

    list(userId) {
      return db.prepare('SELECT * FROM proposals WHERE user_id=? AND deleted=0 ORDER BY updated_at DESC').all(userId);
    },

    create(userId, body) {
      return save(userId, body);
    },

    async update(userId, id, body) {
      return save(userId, body, await owned(userId, id));
    },

    async get(userId, id) {
      const row = await owned(userId, id);
      row.components = await db.prepare('SELECT c.*,pc.quantity,d.image,d.specs,d.summary FROM proposal_components pc JOIN components c ON c.id=pc.component_id LEFT JOIN component_details d ON d.component_id=c.id WHERE pc.proposal_id=?').all(row.id);
      row.componentIds = row.components.map(c => c.id);
      row.compatibilityChecks = row.components.map(p => ({
        componentId: p.id,
        ...checkPart(asPart(p), row.components.filter(other => other.category_id !== p.category_id).map(asPart))
      }));
      row.compatibility = compatibilityNotes(row.components);
      return row;
    },

    async remove(userId, id) {
      const row = await owned(userId, id);
      await db.prepare('UPDATE proposals SET deleted=1 WHERE id=?').run(row.id);
    },

    async history(userId, id) {
      await owned(userId, id);
      return db.prepare('SELECT action,created_at FROM history WHERE proposal_id=? ORDER BY id DESC').all(id);
    }
  };
}
