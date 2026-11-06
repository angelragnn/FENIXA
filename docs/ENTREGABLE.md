# Avance 2 — alcance y demostración

Fuente de requisitos: Guía oficial del proyecto final Aplicación Web Full-Stack, páginas 4 y 6, entregada por el estudiante. El hito pide repositorio con ramas/PR y demo breve: login/registro con base de datos, rutas públicas/privadas, CRUD consumido por el cliente y subida multipart con persistencia básica.

| Criterio | Peso en el avance | Evidencia técnica disponible | Falta del equipo |
|---|---|---|---|
| Login y rutas públicas/privadas | 40% | Registro/login/logout MySQL; URL privada redirige y API exige sesión | Demostrar sesión, recarga y salida |
| API REST y base de datos | 40% | CRUD desde cliente, códigos HTTP, validación, errores y OpenAPI | Revisar contrato y explicar consultas |
| Ficheros | 0% en la tabla, sí es entregable | Multipart, físico en disco, autor/metadatos MySQL y descarga privada | Subir y descargar un archivo real en demo |
| Trabajo en Git | 20% | Cuatro módulos preparados para integrar | Commits propios, PR, revisión entre pares y trazabilidad reales |

El reparto no garantiza una nota ni sustituye trabajo del equipo. El código se prepara como una base para revisar y demostrar. La evaluación final incluye además calidad, persistencia dual completa, integración y despliegue/ejecución reproducible; no confundir esta entrega con un producto terminado.

## Demo breve sugerida

1. Abrir / y /catalog sin sesión. Intentar /dashboard directamente: debe redirigir a /login.
2. Registrar una cuenta propia. Consultar necesidades y guardar una decisión con piezas reales.
3. Listar, abrir, editar y recargar: los cambios guardados deben seguir allí.
4. Adjuntar un PDF/PNG/JPEG real menor a 5 MiB. Descargarlo y mostrar metadata de propietario y propuesta en MySQL, sin mostrar contraseñas ni hashes.
5. Iniciar otra cuenta y comprobar que no puede abrir la decisión ni el adjunto ajenos.
6. Volver, eliminar lógicamente una decisión y comprobar que ya no se consulta ni descarga.
7. Cerrar sesión, intentar URL privada y mostrar PR revisados y resultados reales de pruebas.

Usar cuentas de demostración propias. Registrar las pruebas en docs/VALIDACION-AVANCE-2.md y la revisión en docs/TRABAJO-EQUIPO.md.
