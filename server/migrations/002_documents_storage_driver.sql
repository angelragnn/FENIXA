-- 002: qué almacenamiento guardó cada archivo ('local' o 'supabase').
-- Idempotente como la 001: el ejecutor omite "ADD COLUMN" si la columna ya existe.
-- Los documentos anteriores quedan en 'local', que es donde realmente están.
ALTER TABLE documents ADD COLUMN storage_driver VARCHAR(20) NOT NULL DEFAULT 'local';
