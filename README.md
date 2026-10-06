# FENIXA Universidad — Avance 1

Primera entrega básica de una aplicación para orientar la elección de un PC.

## Definición del problema

Las personas que necesitan un computador para estudiar, trabajar o jugar encuentran especificaciones dispersas entre fabricantes y tiendas. El problema del proyecto consiste en relacionar esas características con su necesidad y reconocer qué información falta antes de elegir. FENIXA propone organizar esa información en una aplicación web dirigida a estudiantes y personas con conocimientos básicos de hardware.

## Objetivos del Avance 1

El objetivo general es desarrollar la base de una aplicación web que facilite comprender opciones de computadores según uso y presupuesto, comenzando con una presentación responsive, maquetas de acceso y un backend conectado a SQLite.

Objetivos específicos:

- Explicar el problema y la finalidad de FENIXA en la página inicial.
- Maquetar Login y Registro y permitir acceder a ellos desde la navegación.
- Adaptar la presentación y los formularios a computador y teléfono.
- Implementar el servidor y comprobar una consulta a SQLite mediante `GET /health`.
- Documentar el alcance, las historias de usuario y los pasos para evaluar el avance.

## Alcance y límites

Esta entrega incluye Inicio, Login y Registro maquetados, navegación entre esas vistas, diseño responsive, servidor Node.js, esquema SQLite e indicador de conexión. Los formularios no crean cuentas, no autentican usuarios ni guardan contraseñas.

El catálogo funcional, las comparaciones, el guardado de builds, las recomendaciones, la compatibilidad avanzada, las compras y los precios en vivo quedan para futuras entregas. El prototipo actual demuestra la presentación y la conexión técnica; todavía no recomienda equipos según presupuesto.

## Historias de usuario

- **HU01:** Como visitante, quiero leer la presentación para entender el problema y el propósito de FENIXA. Se acepta cuando el inicio explica la propuesta y ofrece acceso a Login y Registro.
- **HU02:** Como visitante, quiero abrir Login para conocer el formulario previsto. Se acepta cuando muestra correo, contraseña, botón de acceso y el aviso de que todavía no autentica.
- **HU03:** Como visitante, quiero abrir Registro para conocer los datos previstos para una cuenta. Se acepta cuando muestra nombre, correo y contraseña y aclara que no crea cuentas ni guarda datos.
- **HU04:** Como visitante desde un teléfono, quiero revisar el prototipo en una pantalla pequeña. Se acepta al comprobar a 390 píxeles que navegación y campos siguen accesibles sin desplazamiento horizontal, y revisar también escritorio.
- **HU05:** Como evaluador, quiero comprobar la conexión a SQLite. Se acepta cuando `/health` devuelve HTTP 200, `status: ok` y `database: connected`, la prueba termina en PASS y el inicio muestra la conexión.

El documento académico en Word se entrega por separado. Este README y los archivos de `docs/` contienen la definición, las historias de usuario, la arquitectura y el modelo de datos que respaldan el código.

## Modelo de datos

SQLite configura usuarios (`users`), archivos de referencia (`files`) y actividad (`activity`), con claves foráneas, correo único y metadatos de archivo: nombre, ruta, tipo MIME, tamaño y fecha. El esquema incluye índices y restricciones. La interfaz todavía no carga archivos ni guarda usuarios o actividad. En FENIXA los archivos se interpretan como futuras fichas técnicas o imágenes; esta adaptación debe confirmarse con el docente.

El diagrama está en `docs/er-diagram.md`. `npm test` comprueba restricciones e integridad y luego verifica la conexión y la API.

## Configuración

El ejemplo `.env.example` documenta `HOST` (dirección de escucha), `PORT` (puerto) y `DATABASE_PATH` (archivo SQLite). Puedes copiarlo a `.env` para cambiar los valores. El servidor carga `.env` si existe y usa valores predeterminados en caso contrario. `.env` no debe compartirse ni subirse al repositorio.

El frontend está en `dist/`. La configuración del backend está en `server/config.mjs`, el acceso a SQLite en `server/db/database.mjs` y el servidor HTTP en `server/server.mjs`.

