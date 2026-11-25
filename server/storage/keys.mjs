// Validación de claves de almacenamiento, común a todos los drivers.
// Solo se aceptan [a-zA-Z0-9._/-], sin '..', sin barra inicial y sin segmentos vacíos (protección contra path traversal).
export class StorageError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StorageError';
    this.code = code; // 'INVALID_KEY' | 'EXISTS' | 'NOT_FOUND' | 'BACKEND'
  }
}

export function assertKey(key) {
  if (typeof key !== 'string' || !key || key.length > 200 || !/^[a-zA-Z0-9._/-]+$/.test(key)
    || key.includes('..') || key.startsWith('/') || key.endsWith('/') || key.includes('//')) {
    throw new StorageError('INVALID_KEY', 'Clave de almacenamiento inválida.');
  }
  return key;
}
