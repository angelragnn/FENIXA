# Arquitectura del avance 2

Navegador (client/) → Express → pool mysql2 → MySQL 8.
Express también guarda adjuntos/versiones en storage/files. Esta carpeta no se sirve como estática; las descargas filtran por propietario.

El dashboard es una ruta HTML protegida. La API valida la cookie contra sessions y filtra cada propuesta por user_id. Contraseñas con scrypt, consultas parametrizadas, errores centralizados y límites de peticiones.

El pool usa AsyncLocalStorage para que una transacción reserve su conexión, evitando mezclar consultas de usuarios simultáneos. El disco requiere compensación porque no participa en la transacción de MySQL.

Ver README para ejecución, límites actuales y documentación OpenAPI. El esquema vigente es server/schema.mysql.sql; server/db/ y dist/ son referencia histórica del avance 1.
