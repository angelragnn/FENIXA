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

## Abrir en Windows

1. Instala Node.js 24 o superior si todavía no está instalado.
2. Extrae el ZIP completo. No ejecutes los archivos dentro del ZIP.
3. Abre la carpeta extraída y haz doble clic en `INICIAR.cmd`.
4. Se abre el navegador en http://127.0.0.1:3001. Si no se abre, pega esa dirección manualmente.
5. Mantén abierta la ventana negra. Para detener el servidor, pulsa Ctrl+C.

No hay dependencias externas; no necesitas ejecutar `npm install`.
La base de datos SQLite se crea automáticamente al iniciar.

## Alternativa desde CMD

Abre la carpeta extraída en el Explorador, escribe `cmd` en su barra de dirección y pulsa Enter. En esa ventana ejecuta:

```cmd
npm start
```

Después abre http://127.0.0.1:3001 en el navegador.

Para comprobar la conexión a la base de datos, ejecuta:

```cmd
npm run health
```

Este comando realiza la prueba y termina; no deja la página abierta.

## Qué demostrar

- Inicio: propuesta y problema del proyecto.
- Login y Registro: formularios maquetados y responsive.
- Indicador «Backend conectado a SQLite» en el inicio.
- http://127.0.0.1:3001/health: devuelve `status: ok` y `database: connected`.

Los formularios validan campos vacíos, formato del correo, nombre de al menos dos caracteres y contraseña de al menos ocho. Muestran errores y confirmación visual. Todavía no crean cuentas ni autentican usuarios.
El aviso de módulo SQLite experimental que algunas versiones de Node imprimen no equivale a un fallo; comprueba el resultado de `/health`.

## Compartir con un amigo

Puedes enviarle el ZIP por correo, Drive o WhatsApp. Tu amigo debe extraerlo, tener Node.js 24 o superior y abrir `INICIAR.cmd`. Así puede correrlo en su propio equipo, aunque no estén en la misma red.

Para que lo vea desde tu computador, ambos deben estar en la misma Wi-Fi. Cierra primero el servidor con Ctrl+C y abre `COMPARTIR-WIFI.cmd`. La ventana muestra direcciones como `http://192.168.1.25:3001`; comparte la dirección correspondiente a tu adaptador Wi-Fi. Si aparecen varias, identifica el adaptador con `ipconfig`.

Mantén el servidor abierto. Si Windows solicita acceso, permite redes privadas. Algunas redes universitarias aíslan los equipos y esta modalidad puede no funcionar. `localhost` y `127.0.0.1` siempre apuntan al computador de quien abre el enlace; tu amigo debe usar tu IPv4.

Para verlo desde otra red, comparte el ZIP. Este paquete no incluye un enlace público alojado.

## Entrega académica

Entrega el código, este README, `docs/architecture.md` y `docs/er-diagram.md`. Consulta `docs/ENTREGABLE.md` para la correspondencia con el hito.

El trabajo del equipo se organiza en `feature/interfaz`, `feature/backend`, `feature/modelo-datos` y `feature/documentacion`. Cada integrante revisa y adapta su parte, realiza uno o dos commits desde su identidad y abre un pull request hacia `main`. Las evidencias se registran en `docs/TRABAJO-EQUIPO.md` después de realizar los aportes. La preparación de los paquetes no acredita por sí sola contribuciones ni trabajo equitativo.
