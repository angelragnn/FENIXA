# Problema, alcance y arquitectura

## Problema

Al elegir un PC, las personas encuentran especificaciones dispersas y dificultad para relacionar uso, presupuesto y componentes. FENIXA propone organizar esa información para facilitar la elección.

## Alcance del Avance 1

La primera entrega incluye una página de presentación, vistas de Login y Registro maquetadas, un backend mínimo y una conexión a SQLite comprobable mediante `/health`.

Los formularios incluyen validación visual y feedback, pero no crean cuentas. El catálogo, el guardado de builds y la autenticación quedan para futuras entregas.

## Arquitectura general

El navegador carga HTML, CSS y JavaScript de `dist/university.html`. El backend de Node.js sirve esa página y atiende las consultas de la interfaz. SQLite almacena los datos mínimos del prototipo en un archivo local que se crea automáticamente.

Flujo: navegador → servidor Node.js → SQLite.

- Frontend: `dist/university.html` y `dist/university.js`.
- Backend: `server/server.mjs`.
- Configuración: `server/config.mjs` y `.env.example`.
- Acceso a datos: `server/db/database.mjs`.
- Esquema de la base de datos: `server/db/schema.sql`.
- Base de datos generada: `server/data/university.sqlite`.
- Prueba: `scripts/test-health.mjs`.
- Integridad de datos: `scripts/test-model.mjs`.

`HOST`, `PORT` y `DATABASE_PATH` son las variables de configuración. El servidor carga `.env` si existe; este archivo se excluye con `.gitignore`.

## Endpoints

| Ruta | Resultado |
| --- | --- |
| `GET /` | Página inicial y formularios maquetados |
| `GET /health` | Consulta real a SQLite y estado de la conexión |
| `GET /api/summary` | Cantidad de registros de metadatos y eventos |

El código usa módulos nativos de Node.js y no requiere paquetes externos.
