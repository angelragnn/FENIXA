# Criterio — Avance 2 de FENIXA

Asesor de compra de computadores para estudio, trabajo o juegos: presupuesto en COP → alternativas explicadas → decisión privada con cotizaciones. Nombre provisional; continúa la temática de PCs entregada en el Avance 1.

## Ejecutar una copia nueva

Requiere Node.js 24+, npm y MySQL 8+. Seguir [la preparación de MySQL](docs/INSTALACION-MYSQL.md), crear fenixa y fenixa_test y configurar .env a partir de .env.example. Cada integrante usa credenciales propias. No se incluyen cuentas, adjuntos ni la instancia de datos del computador original.

```powershell
npm ci
npm start
```

Abrir http://127.0.0.1:3002. `GET /health` consulta realmente MySQL; `/health/live` comprueba solo que el servidor responda. El arranque crea las tablas e importa el catálogo. Las migraciones futuras necesitarán un proceso propio; el esquema actual no modifica automáticamente columnas existentes.

HOST y PORT controlan la web. APP_ORIGIN debe coincidir exactamente con el origen del navegador. En HTTPS, NODE_ENV=production habilita cookies Secure; no activarlo al probar únicamente en HTTP local. UPLOAD_DIR señala los ficheros. No se distribuyen scripts para reconfigurar la instancia privada de MySQL de otro computador.

## Funciones del segundo avance

- Registro, login y logout conectados a MySQL; contraseñas con scrypt y sal.
- Ruta /dashboard y API privadas, redirección al login y sesiones revocables mediante cookie HttpOnly/SameSite=Strict.
- CRUD de decisiones y componentes, consultas parametrizadas y filtro por propietario.
- Subida multipart de PDF/PNG/JPEG hasta 5 MiB, documento físico más metadatos en MySQL, descarga privada, versiones JSON e historial.
- Asesor público y catálogo con comparación. La interfaz maneja carga y errores; permite buscar y ordenar decisiones y abrir enlaces privados por ID.
- Borrador temporal sessionStorage por usuario con recuperación tras recarga. Solo Guardar persiste la decisión en MySQL; logout explícito elimina el borrador.

## Arquitectura y datos

client/ contiene HTML/CSS/JavaScript sin framework. server/app.mjs coordina Express; server/store.mjs usa un pool mysql2 y AsyncLocalStorage para transacciones; security.mjs gestiona credenciales y sesiones; advisor.mjs aplica reglas de recomendación. client/assets/compatibility.js comparte comprobaciones de hardware. El esquema está en server/schema.mysql.sql y el seed en server/data-seeds/catalog.json.

MySQL guarda cuentas, sesiones, propuestas, categorías, componentes, relaciones, documentos e historial. storage/files guarda adjuntos y versiones JSON con nombres, precios y fuentes al guardar. Las descargas no son estáticas: requieren sesión y propietario. El borrado de propuestas es lógico y bloquea sus descargas.

dist/, server/db/ y server/config.mjs se conservan como referencia histórica del Avance 1: el arranque actual no los usa. Los auxiliares de prueba y ejecución antiguos que asumían SQLite se retiraron; usar los comandos actuales de este README.

## API

Swagger en /docs; OpenAPI en /docs.json. Asesor: POST /api/advice. Catálogo público: GET /api/catalog. Registro, login, me y logout: /api/auth/*. Componentes y plantillas con sesión: /api/components y /api/reference-builds. Decisiones: GET/POST /api/proposals y GET/PUT/DELETE /api/proposals/:id. Adjuntos e historial: /api/proposals/:id/files y /api/proposals/:id/history. Descarga: GET /api/files/:fileId.

## Verificación y operaciones

```powershell
npm test
npm run audit:files
npm run backup
npm run restore:check
```

El 5 de noviembre de 2026 se verificaron 17 pruebas (17 aprobadas, 0 fallos) sobre la copia local que origina esta entrega, usando MySQL real. El resultado del repositorio integrado debe verificarse nuevamente y registrarse en docs/VALIDACION-AVANCE-2.md. Las pruebas incluyen sesiones, duplicados, permisos de dos cuentas, CRUD, rollback y compensación de archivo, subida/descarga y casos límite del asesor.

npm test usa fenixa_test. audit:files y backup usan la base principal: en una copia nueva, ejecutar npm start una vez antes para crear sus tablas.

backup guarda tablas y documentos con manifiesto SHA-256 en storage/backups, sin sesiones; contiene datos privados. restore:check verifica y restaura SOLO en fenixa_test y una carpeta aparte; reemplaza datos de pruebas, nunca ejecutar junto con npm test. audit:files es de lectura y detecta faltantes, tamaños incorrectos y huérfanos; no borra ni repara.

## Límites y entrega

180 productos públicos y cinco registros didácticos de legado; 177 fotos transparentes y tres pendientes. Los precios y ofertas son históricos, no cotizaciones actuales. Cuatro plantillas curadas no equivalen a optimización exhaustiva; no se calculan FPS ni rendimiento de los programas escritos por el visitante. La compatibilidad es parcial.

Disco y MySQL no comparten una transacción ante cortes abruptos; se compensa el fallo normal. La firma de archivos es básica y falta política de retención. Para el final: ampliar documentación OpenAPI, separación de controladores/servicios, accesibilidad, perfiles y datos verificables. Esta es una base académica de desarrollo y demo local; los enlaces temporales anteriores pueden haber caducado.

Ver docs/ENTREGABLE.md para la rúbrica y la demo; docs/TRABAJO-EQUIPO.md para responsables y evidencias reales. No se han creado commits ni PR por los integrantes al preparar los paquetes. Cada persona debe revisar, probar, adaptar lo necesario y describir con fidelidad su integración y el apoyo recibido.


## Revisión local posterior al PR #11

Sobre main b8115c7 se corrigió el descarte prematuro de borradores al cancelar o fallar una eliminación. La suite local pasa 21 pruebas (0 fallos). Ver [evidencia y límites de la revisión](docs/REVISION-2026-11-05.md). La comprobación visual de esta sesión se interrumpió; no se afirma una validación completa de navegador después del cambio.
