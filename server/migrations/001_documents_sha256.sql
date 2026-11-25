-- 001: huella SHA-256 de cada documento, para detectar archivos alterados en disco.
-- Es compatible con la base existente: el ejecutor omite "ADD COLUMN" si la columna ya existe
-- (instalaciones nuevas la traen desde schema.mysql.sql). Los documentos anteriores quedan con NULL.
--
-- Fechas: created_at/updated_at siguen siendo VARCHAR(30) con ISO 8601 en UTC. No se convierten a
-- DATETIME en esta migración porque la base real ya tiene filas y una conversión fallida o con zona
-- horaria distinta podría alterar datos; el formato ISO ordena bien como texto. Si se hace, será otra
-- migración con copia de seguridad previa.
ALTER TABLE documents ADD COLUMN sha256 CHAR(64) NULL;
