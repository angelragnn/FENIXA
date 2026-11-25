# Criterio — Avance 2 de FENIXA

Asesor de compra de computadores para estudio, trabajo o juegos: presupuesto en COP → alternativas explicadas → decisión privada con cotizaciones. Nombre provisional; continúa la temática de PCs entregada en el Avance 1.

## Ejecutar una copia nueva

Requiere Node.js 24+, npm y MySQL 8+. Cada integrante usa credenciales propias. No se incluyen cuentas, adjuntos ni la instancia de datos del computador original.

### 1. Crear bases y usuario (obligatorio antes de `npm start`)

Ejecuta este SQL con una cuenta administradora de MySQL. Cambia antes la contraseña de muestra. La guía completa está en [la preparación de MySQL](docs/INSTALACION-MYSQL.md).

```sql
CREATE DATABASE IF NOT EXISTS fenixa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS fenixa_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fenixa_app'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_CLAVE_POR_UNA_PROPIA';
GRANT ALL PRIVILEGES ON fenixa.* TO 'fenixa_app'@'localhost';
GRANT ALL PRIVILEGES ON fenixa_test.* TO 'fenixa_app'@'localhost';
```

La app usa la base `fenixa`. `npm test` usa `fenixa_test`.

### 2. Crear .env

En PowerShell:

```powershell
Copy-Item .env.example .env
```

En Git Bash:

```bash
cp .env.example .env
```

Después edita .env:

- `MYSQL_PASSWORD`: la misma clave que pusiste en `CREATE USER`.
- `MYSQL_PORT`: el puerto de tu MySQL (3306 por defecto).

Nunca subas .env a Git.

### 3. Instalar y arrancar

```powershell
npm ci
npm start
```

`npm ci` puede mostrar la advertencia `npm warn install-scripts` de @scarf/scarf. Es inofensiva.

Abre http://127.0.0.1:3002 (con el valor de `PORT`, 3002 por defecto). `APP_ORIGIN` debe coincidir exactamente con la dirección que usa el navegador. `GET /health` consulta realmente MySQL; `/health/live` comprueba solo que el servidor responda.

Al arrancar, el servidor hace tres cosas, en este orden:

1. Crea las tablas base con `server/schema.mysql.sql` (`CREATE TABLE IF NOT EXISTS`).
2. Aplica las migraciones de `server/migrations/` que falten. Cada archivo se registra en la tabla `schema_migrations`, así que se aplica una sola vez aunque reinicies el servidor.
3. Importa el catálogo desde `server/data-seeds/catalog.json`.

Para cambiar el esquema de una base que ya tiene datos, se añade una migración nueva con un número mayor; no se editan las anteriores.

## Configuración

Las variables se leen una vez en `server/env.mjs`. Nunca escribas valores reales en el README ni en Git.

| Variable | Para qué sirve | Por defecto |
|---|---|---|
| `HOST` | Dirección donde escucha la web | `127.0.0.1` |
| `PORT` | Puerto de la web | `3002` |
| `APP_ORIGIN` | Origen exacto del navegador (esquema, dominio y puerto). Las peticiones que cambian datos con otro origen reciben 403 | `http://HOST:PORT` |
| `NODE_ENV` | Con `production` las cookies son `Secure`. No lo actives si pruebas solo en HTTP local | sin definir |
| `MYSQL_HOST` | Servidor MySQL | `127.0.0.1` |
| `MYSQL_PORT` | Puerto MySQL | `3306` |
| `MYSQL_USER` | Usuario de la aplicación | `fenixa_app` |
| `MYSQL_PASSWORD` | Contraseña del usuario de MySQL | sin valor por defecto |
| `MYSQL_DATABASE` | Base de datos principal | `fenixa` |
| `UPLOAD_DIR` | Carpeta de adjuntos y versiones JSON en disco | `storage/files` en `.env.example` |
| `TRUST_PROXY` | Confía en el proxy (Nginx, túnel). `1` = un salto; vacío o `false` = desactivado | `false` |
| `STORAGE_DRIVER` | Dónde se guardan los archivos: `local` o `supabase` | `local` |
| `SUPABASE_URL` | URL del proyecto Supabase (solo con `STORAGE_DRIVER=supabase`) | sin definir |
| `SUPABASE_SERVICE_KEY` | Clave de servicio de Supabase. Solo en el servidor, nunca en `client/` ni en Git | sin definir |
| `SUPABASE_BUCKET` | Bucket privado de Supabase (solo con `STORAGE_DRIVER=supabase`) | sin definir |

Con `STORAGE_DRIVER=supabase` las tres variables `SUPABASE_*` son obligatorias: si falta una, el servidor no arranca y dice cuál.

El driver se elige con `STORAGE_DRIVER`; `UPLOAD_DIR` solo indica la carpeta del driver local. (Las pruebas automáticas fuerzan el driver local con una carpeta temporal.)

## Arquitectura del backend (entrega final)

Flujo de una petición:

1. **Routes** (`server/routes/`): asocian cada URL con sus middleware y su controlador.
2. **Middleware** (`server/middleware/`):
   - globales: cabeceras con helmet, CORS, JSON de hasta 32 kB, control de origen (`origin.mjs`), límite general de 180 peticiones por minuto en `/api` y `attachUser` (lee la cookie de sesión);
   - por ruta: `requireUser` (401 sin sesión), `validate` (valida el cuerpo, los parámetros y la consulta con ajv y responde 400 con la lista de campos), `multer` (sube un único archivo de hasta 5 MiB) y el límite de 20 intentos cada 15 minutos en registro y login.
3. **Controllers** (`server/controllers/`): leen `req`, llaman al servicio y escriben `res` (código de estado, JSON y cookie).
4. **Services** (`server/services/`): contienen la lógica y el SQL parametrizado. Comprueban siempre que la decisión o el archivo sea del usuario.
5. **Storage** (`server/storage/`): guardan los archivos en disco (`local`) o en Supabase Storage. Ambos drivers tienen la misma interfaz: `put`, `get`, `remove`, `exists` y `describe`. MySQL se usa a través de `server/store.mjs`.
6. **Errores** (`server/middleware/errors.mjs`): un middleware final convierte cualquier fallo en `{ "error": "mensaje" }`:
   - `HttpError` usa su estado y su mensaje;
   - JSON mal formado: 400;
   - correo o nombre duplicado (`ER_DUP_ENTRY`): 409;
   - referencia a un registro inexistente: 400;
   - archivo mayor de 5 MiB (multer): 413; otros errores de multipart: 400;
   - errores 4xx de Express: su mismo estado;
   - cualquier otro error: 500 con un mensaje genérico, sin detalles internos.

Árbol de carpetas (resumen):

```
client/              HTML, CSS y JavaScript sin framework
server/
  server.mjs         arranque: carga .env y levanta el servidor
  app.mjs            ensamblado de Express (middleware, servicios, controladores, rutas)
  env.mjs            lectura y validación de variables
  store.mjs          pool mysql2, transacciones con AsyncLocalStorage y migraciones
  security.mjs       contraseñas con scrypt y tokens de sesión
  advisor.mjs        reglas del asesor
  openapi.mjs        especificación para `/docs/`
  routes/            URLs
  middleware/        autenticación, origen, límites, validación y errores
  controllers/       req/res
  services/          lógica de negocio y SQL
  validation/        esquemas (ajv y Swagger)
  storage/           driver local y driver Supabase
  migrations/        cambios de esquema versionados (NNN_*.sql)
  data-seeds/        catálogo importado
  schema.mysql.sql   esquema base
scripts/             respaldo, restauración de prueba y auditoría de archivos
tests/               pruebas con MySQL real
storage/             archivos y respaldos locales (datos privados, no se comparten)
```

## Persistencia dual

Cada adjunto o versión se guarda en dos sitios:

- **Archivo físico**: con nombre UUID (por ejemplo `3f2a…-uuid.pdf`). Nunca se sobrescribe: el driver local usa `wx` y Supabase usa `x-upsert: false`.
- **Metadatos en MySQL** (tabla `documents`): identificador, dueño, decisión, nombre original, tipo MIME, tamaño, SHA-256, ruta o clave del archivo, tipo (`upload` o `snapshot`), driver (`local` o `supabase`) y fecha de creación.
- **Versión JSON automática**: cada vez que guardas una decisión (crear o actualizar), se genera un archivo `propuesta.json` con los componentes y sus precios de referencia. Se guarda como `snapshot` en la misma transacción que la decisión y queda en el historial.

Si falla la fila en MySQL, se borra el archivo recién escrito. Si falla la transacción de la decisión, se borra su versión JSON. Aun así, disco y MySQL no comparten una transacción: ante un corte brusco puede quedar un archivo sin fila o al revés. `npm run audit:files` detecta esos casos.

## Despliegue

Recomendado: un VPS Ubuntu con Nginx como proxy HTTPS, PM2 con una sola instancia y MySQL 8 escuchando solo en 127.0.0.1. Las variables van en `.env.production` (enlazado a `.env` en el servidor) con `TRUST_PROXY=1` y `NODE_ENV=production`. Supabase Storage es opcional para los adjuntos; MySQL sigue guardando los datos.

Pasos completos en [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md).

## Funciones del segundo avance

- Registro, login y logout conectados a MySQL; contraseñas con scrypt y sal.
- Ruta /dashboard y API privadas, redirección al login y sesiones revocables mediante cookie HttpOnly/SameSite=Strict.
- CRUD de decisiones y componentes, consultas parametrizadas y filtro por propietario.
- Subida multipart de PDF/PNG/JPEG hasta 5 MiB, documento físico más metadatos en MySQL, descarga privada, vista en el navegador, borrado de adjuntos, versiones JSON e historial.
- Solo builds completas: el asesor y el panel ofrecen diez PCs enteras (de unos 2,3 a 9 millones COP) armadas con piezas del catálogo; ya no se arma pieza por pieza. El asesor ordena primero las que caben en el presupuesto y son del uso elegido, y entre ellas la que más lo aprovecha.
- Asesor público y catálogo con comparación. La interfaz maneja carga y errores; permite buscar y ordenar decisiones y abrir enlaces privados por ID.
- Borrador temporal sessionStorage por usuario con recuperación tras recarga. Solo Guardar persiste la decisión en MySQL; logout explícito elimina el borrador.

## Ciclo completo para la demo

1. **Landing** (`/`): el asesor público y el catálogo (`/catalog`), sin cuenta.
2. **Registro o login** (`/register`, `/login`): si intentas entrar a `/dashboard` sin sesión, el sistema te lleva a `/login?next=…` y, al entrar, vuelve a esa ruta.
3. **Panel privado** (`/dashboard`): escribes presupuesto y uso y eliges una build completa de la lista.
4. **Guardar**: la decisión se escribe en MySQL y se crea su versión JSON automática.
5. **Subir cotización**: PDF, PNG o JPEG de hasta 5 MiB.
6. **Ver, descargar o eliminar**: ver abre el archivo en el navegador (`?inline=1`); eliminar quita el adjunto, pero las versiones JSON no se pueden borrar (409).
7. **Historial**: se revisan los cambios de la decisión (creación, actualización y adjuntos eliminados).

## API

Swagger en `/docs/`; OpenAPI en `/docs.json`.

Públicas (sin sesión):

- `GET /health` y `GET /health/live`: salud del servicio y de MySQL.
- `POST /api/advice`: propone alternativas según presupuesto y uso.
- `GET /api/builds`: builds completas con piezas, fotos y suma de referencia.
- `GET /api/catalog`: catálogo de piezas con datos históricos.
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`.
- Páginas: `/`, `/catalog`, `/login`, `/register`, `/docs/`.

Con sesión:

- `GET /api/components` y `GET /api/reference-builds`.
- `GET /api/proposals` y `POST /api/proposals`.
- `GET /api/proposals/:id`, `PUT /api/proposals/:id` y `DELETE /api/proposals/:id` (borrado lógico: bloquea también las descargas de la decisión).
- `GET /api/proposals/:id/history`.
- `GET /api/proposals/:id/files` (lista) y `POST /api/proposals/:id/files` (sube un archivo en el campo `file`).
- `GET /api/files/:fileId` descarga el archivo. Con `?inline=1` lo muestra en el navegador (solo PDF, PNG y JPEG).
- `DELETE /api/files/:fileId` borra un adjunto propio. Responde 409 para las versiones JSON.
- Página: `/dashboard`.

Cada ruta que cambia datos comprueba el origen (`APP_ORIGIN`). Todas las respuestas de error tienen la forma `{ "error": "…" }`; las de validación incluyen `details` con el campo y el motivo.

## Verificación y operaciones

```powershell
npm test
npm run audit:files
npm run backup
npm run restore:check
```

npm test: 44 pruebas con MySQL real; usa la base fenixa_test. Las pruebas incluyen sesiones, duplicados, permisos de dos cuentas, CRUD, rollback y compensación de archivo, subida/descarga y casos límite del asesor.

audit:files y backup usan la base principal: en una copia nueva, ejecutar npm start una vez antes para crear sus tablas.

backup guarda tablas y documentos con manifiesto SHA-256 en storage/backups, sin sesiones; contiene datos privados. restore:check verifica y restaura SOLO en fenixa_test y una carpeta aparte; reemplaza datos de pruebas, nunca ejecutar junto con npm test. audit:files es de lectura y detecta faltantes, tamaños incorrectos y huérfanos; no borra ni repara. Estas herramientas solo trabajan con el driver local.

## Límites y entrega

180 productos públicos y cinco registros didácticos de legado; 177 fotos transparentes y tres pendientes. Los precios y ofertas son históricos, no cotizaciones actuales. Diez builds curadas no equivalen a optimización exhaustiva; no se calculan FPS ni rendimiento de los programas escritos por el visitante. La compatibilidad es parcial.

Disco y MySQL no comparten una transacción ante cortes abruptos; se compensa el fallo normal. La firma de archivos es básica y falta política de retención. Para el final: ampliar documentación OpenAPI, separación de controladores/servicios, accesibilidad, perfiles y datos verificables. Esta es una base académica de desarrollo y demo local; los enlaces temporales anteriores pueden haber caducado.

Ver docs/ENTREGABLE.md para la rúbrica y la demo; docs/TRABAJO-EQUIPO.md para responsables y evidencias reales. El historial del equipo está en docs/TRABAJO-EQUIPO.md. Cada persona debe revisar, probar, adaptar lo necesario y describir con fidelidad su integración y el apoyo recibido.

## Revisión local de borradores

Al cancelar o fallar una eliminación, el borrador ya no se descarta. Ver [evidencia y límites de la revisión](docs/REVISION-2026-11-05.md). La validación visual completa de ese cambio no está confirmada.

## Builds completas (11 de noviembre de 2026)

El panel reemplaza el selector por categoría por una lista de builds completas con su precio de referencia y si caben en el presupuesto escrito. El catálogo público muestra solo las builds completas (GET /api/builds, sin sesión): filtro por uso y presupuesto, piezas de cada build, comparación de hasta tres y botón para guardarla. El ejemplo de la portada sigue el presupuesto y el uso escritos y muestra la build que elige el asesor; los presupuestos rápidos son 2,5 / 4 / 6,5 / 9,5 M. Las propuestas antiguas armadas pieza por pieza se conservan como «Selección anterior». La API sigue aceptando componentIds, así que la restricción a builds es de la interfaz. Seis builds nuevas (Inicial, Multitarea, Gaming Inicial, Creación, Gaming Plus, Gaming Alto) usan precios históricos del catálogo y pasan el comprobador parcial de compatibilidad.
