# Registro de validación

## Comprobación de la copia que origina los paquetes

5 de noviembre de 2026: npm test contra MySQL real; 17 pruebas aprobadas y 0 fallos. Incluye casos del asesor y flujo de sesiones/CRUD/ficheros con dos cuentas. No acredita ejecución por los integrantes ni el resultado de futuros cambios.

## Parte 4 antes del merge

Esta prueba se hizo sobre la rama de la parte 4, antes de integrarla, no sobre el main final.

- SHA probado: origin/main 78374c24aca7c6a91bb7b90b617a3fc632a04932 (partes 1 a 3 integradas) más CAMBIOS.patch aplicado sin commit.
- Persona y fecha: Juan Jacob Daz Hernández (mxr4nn-dot), 5 de noviembre de 2026. Los comandos y la demo los ejecutó Claude Code en el PC de trabajo, a petición de Juan.
- Entorno: Windows 11, Node.js 24.22.1, npm 11.19.1 y una instancia privada de MySQL 9.4 en 127.0.0.1:3308, creada solo para esta copia.
- npm ci: 91 paquetes instalados y 0 vulnerabilidades.
- npm start: GET /health respondió 200 con database connected y engine mysql.
- npm test: 17 pruebas, 17 aprobadas y 0 fallos, antes de la demo y de nuevo después de restore:check. tests/integration.test.mjs usa fenixa_test.
- Demo de docs/ENTREGABLE.md en escritorio (Brave):
  - / y /catalog abrieron sin sesión; /dashboard redirigió a /login.
  - Se registró una cuenta y se guardó una decisión con 6 piezas del catálogo. La edición siguió allí tras recargar.
  - Se adjuntó un PDF de prueba de 193 bytes creado para la demo y se descargó con HTTP 200. MySQL registró su propietario y propuesta.
  - Otra cuenta recibió 404 al consultar la decisión y el adjunto, y al intentar borrar la decisión.
  - Tras el borrado lógico, la decisión y el adjunto respondieron 404.
  - Tras cerrar sesión, /dashboard redirigió a /login y la API respondió 401.
- Pantalla de 390 px (navegador integrado de la app con emulación de 390x844, porque la ventana de Brave no se redujo): sin desplazamiento horizontal en /, /catalog, /register y /dashboard. No se repitió allí el flujo completo.
- npm run audit:files: antes de la demo, 0 documentos registrados; después, 3 registrados (2 versiones JSON y el PDF), sin faltantes, tamaños incorrectos ni huérfanos.
- npm run backup y npm run restore:check, sin npm test simultáneo: terminaron bien sin documentos y de nuevo con datos de demo (3 cuentas, 1 propuesta, 3 documentos). Los conteos restaurados en fenixa_test coincidieron. Los respaldos no se suben.
- Errores encontrados: ninguno en la aplicación, y no se corrigió código.
- Límites: los formularios se completaron y enviaron con scripts en la página. En el borrado, la confirmación del navegador se aceptó por script. La descarga se comprobó con una petición desde la página, no con el diálogo de descarga. No se probó en un teléfono real.
- PR revisados por un compañero: PR #6, #7, #8 y #9 sin revisiones en GitHub.

## Main integrado con las cuatro partes

- SHA de main probado: 502fe5e50632ca4301a04863c1f84263d0366837 (merge del PR #9). Su contenido es idéntico al del commit 2e243bc probado en la rama.
- Persona y fecha: Juan Jacob Daz Hernández (mxr4nn-dot), 5 de noviembre de 2026. Juan pidió hacer el merge sin esperar la revisión de Iván. El merge, los comandos y la demo los ejecutó Claude Code a petición de Juan.
- Entorno: el mismo de la sección anterior.
- npm ci: 91 paquetes instalados y 0 vulnerabilidades.
- npm test: 17 pruebas, 17 aprobadas y 0 fallos.
- npm start: GET /health respondió con database connected y engine mysql.
- Demo de docs/ENTREGABLE.md en escritorio (Brave), con cuentas nuevas:
  - /, /catalog y la redirección de /dashboard a /login funcionaron sin sesión.
  - Registro, decisión con 6 piezas, edición y recarga funcionaron.
  - El PDF de prueba de 193 bytes se subió y se descargó con HTTP 200.
  - Otra cuenta recibió 404 en la decisión, el adjunto y el borrado.
  - Tras el borrado lógico, la decisión y el adjunto respondieron 404.
  - Tras cerrar sesión, /dashboard redirigió a /login y la API respondió 401.
- Pantalla de 390 px (emulación en el navegador integrado de la app): sin desplazamiento horizontal en /, /catalog y /dashboard.
- npm run audit:files: 6 documentos registrados, sin faltantes, tamaños incorrectos ni huérfanos.
- npm run backup y npm run restore:check, sin npm test simultáneo: terminaron bien con 5 cuentas y 6 documentos. Los datos restaurados en fenixa_test coincidieron.
- Errores encontrados: ninguno en la aplicación, y no se corrigió código.
- Límites: los mismos de la sección anterior. Falta que un compañero revise y que cada integrante pruebe en su propio equipo.
