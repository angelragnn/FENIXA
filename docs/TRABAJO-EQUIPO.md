# Integración del Avance 2

Repositorio: https://github.com/angelragnn/FENIXA. Base observada el 5 de noviembre de 2026: fe55110ce37e919cbd8ad1eb79f24ab35e60e8db. El trabajo local se preparó con asistencia de IA y se reparte por módulos para su revisión e integración; esta tabla no acredita por sí sola autoría, trabajo ni revisión.

| Orden | Responsable de integración | Rama propuesta | Parte técnica | PR / revisor / resultado |
|---|---|---|---|---|
| 1 | Ángel David Aragón Ordóñez | avance2/angel-mysql-catalogo | Modelo MySQL, pool, seed, catálogo y compatibilidad compartida | Pendiente |
| 2 | Juan Jacob Daz Hernández | avance2/juan-backend-acceso | Express, autenticación, CRUD, ficheros y OpenAPI | Pendiente |
| 3 | Bryan Stiven Leyton | avance2/bryan-interfaz | Interfaz, formularios, consumo asíncrono, catálogo y panel | Pendiente |
| 4 | Iván Alejandro Valencia Guaza | avance2/ivan-pruebas-respaldo | Pruebas, auditoría, respaldo, instalación y demo | Pendiente |

Crear cada rama desde origin/main DESPUÉS de integrar el PR anterior. Los archivos de los cuatro paquetes no se solapan, pero tienen dependencias funcionales; la demo completa requiere los cuatro. No usar commits con --author de otro compañero, fechas inventadas ni afirmar que un paquete preparado es un desarrollo individual desde cero.

Cada integrante revisa el código, ejecuta las comprobaciones de su módulo, hace correcciones justificadas si encuentra problemas y redacta un PR con qué integró y cómo lo probó. Otro compañero revisa el diff y registra observaciones reales antes de integrar. Después del cuarto PR, ejecutar npm test y la demo completa y registrar el SHA evaluado. No inventar observaciones ni resultados para llenar la tabla.
