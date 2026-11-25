# Arquitectura del avance 2

Navegador (client/) → Express (server/app.mjs) → rutas → middleware → controladores → servicios → almacenamiento y MySQL.

## Capas

- **Routes** (`server/routes/`): cada URL con sus middleware y su controlador.
- **Middleware** (`server/middleware/`): sesión (`auth.mjs`), control de origen (`origin.mjs`), límites de peticiones (`rate-limit.mjs`), validación con ajv (`validate.mjs`) y errores centralizados (`errors.mjs`).
- **Controllers** (`server/controllers/`): traducen `req` y `res` a llamadas del servicio. Aquí se escriben la cookie de sesión y los encabezados de descarga.
- **Services** (`server/services/`): la lógica de negocio y el SQL parametrizado. Cada decisión y adjunto se comprueba contra su propietario.
- **Storage** (`server/storage/`): guarda los archivos. Ver la sección siguiente.

El ensamblado de todas las capas está en `server/app.mjs`. El arranque (`server/server.mjs`) solo carga `.env` y lo pasa a esa función.

## Almacenamiento conmutable

Los adjuntos y las versiones JSON pasan por una interfaz común con cinco operaciones: `put` (no sobrescribe), `get`, `remove` (idempotente), `exists` y `describe`. Hay dos drivers:

- **local** (por defecto): archivos en la carpeta `UPLOAD_DIR` (en `.env.example`, `storage/files`).
- **supabase**: archivos en un bucket privado de Supabase Storage, con `fetch` nativo y sin SDK. Las descargas siempre pasan por la API, que comprueba el dueño.

Cada documento guarda en MySQL el driver con el que se escribió (`documents.storage_driver`). Si el driver activo no coincide, la descarga responde 503 hasta reactivar el driver original.

`server.mjs` pasa el driver elegido en `STORAGE_DRIVER` a `createApp`; `UPLOAD_DIR` solo es la carpeta del driver local. Las pruebas inyectan una carpeta temporal y usan siempre el driver local.

MySQL guarda cuentas, sesiones, decisiones, componentes, relaciones, metadatos de documentos e historial. El acceso se hace con un pool de mysql2 (`server/store.mjs`). `db.transaction` reserva una conexión con AsyncLocalStorage, así que dos peticiones simultáneas no mezclan sus consultas.

## Migraciones

El esquema base está en `server/schema.mysql.sql` y se crea con `CREATE TABLE IF NOT EXISTS`. Los cambios posteriores están en `server/migrations/NNN_*.sql`:

- `001_documents_sha256.sql`: añade la huella SHA-256 de cada documento.
- `002_documents_storage_driver.sql`: añade el driver de almacenamiento de cada documento.

El ejecutor de `store.mjs` aplica al arrancar las migraciones que falten, en orden. Registra cada una en la tabla `schema_migrations`. Un bloqueo `GET_LOCK` impide que dos procesos (por ejemplo, el servidor y las pruebas) migren a la vez. Una migración `ADD COLUMN` se omite si la columna ya existe, así que es segura en bases con datos.

## Errores y respuestas

Un middleware final convierte cualquier error en `{ "error": "mensaje" }`. Los errores propios usan `HttpError`. Las validaciones devuelven 400 con `details` (campo y motivo). Las violaciones de unicidad devuelven 409, los archivos mayores de 5 MiB devuelven 413 y los errores inesperados devuelven 500 con un mensaje genérico.

## Límites conocidos

- Disco y MySQL no comparten una transacción. Si el proceso se corta a mitad de una escritura, puede quedar un archivo sin fila o una fila sin archivo; `npm run audit:files` lo detecta.
- Los respaldos (`npm run backup`, `restore:check`, `audit:files`) solo funcionan con el driver local.
- La documentación OpenAPI (`/docs`) cubre las rutas actuales, pero aún puede ampliarse.

Ver README para ejecución, configuración, endpoints y verificación. El esquema vigente es `server/schema.mysql.sql` más las migraciones; `server/db/` y `dist/` son referencia histórica del avance 1 y no se usan.
