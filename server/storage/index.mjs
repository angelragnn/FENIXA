// Almacenamiento de archivos conmutable. Interfaz común de todos los drivers:
//   put(key, buffer, contentType)  guarda; falla si la clave ya existe
//   get(key)                       devuelve un Buffer; falla con code NOT_FOUND si no existe
//   remove(key)                    borra; idempotente
//   exists(key)                    true/false
//   describe()                     'local' | 'supabase'
import { createLocalStorage } from './local.mjs';
import { createSupabaseStorage } from './supabase.mjs';

export { StorageError } from './keys.mjs';

export function createStorage({ driver = 'local', filesDir, supabase } = {}) {
  if (driver === 'local') {
    if (!filesDir) throw new Error('El driver local requiere filesDir.');
    return createLocalStorage({ filesDir });
  }
  if (driver === 'supabase') return createSupabaseStorage(supabase || {});
  throw new Error(`STORAGE_DRIVER desconocido: ${driver}`);
}
