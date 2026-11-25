// Driver Supabase Storage con fetch nativo (sin SDK). Bucket PRIVADO: la clave de servicio nunca sale del servidor
// y las descargas pasan por nuestra API, que ya comprueba el dueño.
// Endpoints comprobados contra la documentación pública de Supabase Storage (vía context7):
//   POST   {url}/storage/v1/object/{bucket}/{key}                 subir (x-upsert:false => 400 si existe)
//   GET    {url}/storage/v1/object/authenticated/{bucket}/{key}   descargar objeto privado con Authorization
//   DELETE {url}/storage/v1/object/{bucket}  body {"prefixes":[key]}  borrar
// exists() usa HEAD sobre el endpoint authenticated (suposición razonable, no verificada contra un proyecto real).
import { assertKey, StorageError } from './keys.mjs';

export function createSupabaseStorage({ url, serviceKey, bucket }) {
  if (!url || !serviceKey || !bucket) throw new Error('Supabase requiere SUPABASE_URL, SUPABASE_SERVICE_KEY y SUPABASE_BUCKET.');
  const root = `${url.replace(/\/+$/, '')}/storage/v1/object`;
  const auth = { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey };
  const encode = key => assertKey(key).split('/').map(encodeURIComponent).join('/');
  const bucketPath = encodeURIComponent(bucket);

  async function failure(response, action) {
    let detail = '';
    try { detail = (await response.text()).slice(0, 200); } catch { /* sin cuerpo */ }
    return new StorageError('BACKEND', `Supabase Storage rechazó ${action} (HTTP ${response.status}) ${detail}`.trim());
  }

  return {
    describe: () => 'supabase',

    async put(key, buffer, contentType = 'application/octet-stream') {
      const response = await fetch(`${root}/${bucketPath}/${encode(key)}`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': contentType, 'x-upsert': 'false' },
        body: buffer
      });
      if (response.ok) return;
      // Supabase responde 400 o 409 con "Duplicate"/"already exists" cuando la clave existe.
      const text = await response.clone().text().catch(() => '');
      if (response.status === 409 || /already exists|duplicate/i.test(text)) throw new StorageError('EXISTS', 'El archivo ya existe.');
      throw await failure(response, 'la subida');
    },

    async get(key) {
      const response = await fetch(`${root}/authenticated/${bucketPath}/${encode(key)}`, { method: 'GET', headers: auth });
      if (response.status === 404 || response.status === 400) throw new StorageError('NOT_FOUND', 'Archivo no encontrado.');
      if (!response.ok) throw await failure(response, 'la descarga');
      return Buffer.from(await response.arrayBuffer());
    },

    // Idempotente: Supabase devuelve 200 con lista vacía si el objeto no existe.
    async remove(key) {
      assertKey(key);
      const response = await fetch(`${root}/${bucketPath}`, {
        method: 'DELETE',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [key] })
      });
      if (!response.ok && response.status !== 404) throw await failure(response, 'el borrado');
    },

    async exists(key) {
      const response = await fetch(`${root}/authenticated/${bucketPath}/${encode(key)}`, { method: 'HEAD', headers: auth });
      if (response.ok) return true;
      if (response.status === 404 || response.status === 400) return false;
      throw await failure(response, 'la comprobación');
    }
  };
}
