# Preparar MySQL para el equipo

Instalar Node.js 24+, Git y MySQL 8+. El servicio de MySQL debe estar encendido. Una instalación estándar suele usar 3306; revisar el puerto de cada equipo. La instancia privada del computador de Ángel usa 3308: su carpeta de datos y sus contraseñas no se distribuyen.

## Crear bases y usuario

Abrir MySQL Workbench o la consola con una cuenta administradora. Este ejemplo debe adaptarse: reemplazar la contraseña de muestra por una nueva antes de ejecutarlo. No borrar ni recrear bases existentes con datos.

```sql
CREATE DATABASE IF NOT EXISTS fenixa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS fenixa_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fenixa_app'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_CLAVE_POR_UNA_PROPIA';
GRANT ALL PRIVILEGES ON fenixa.* TO 'fenixa_app'@'localhost';
GRANT ALL PRIVILEGES ON fenixa_test.* TO 'fenixa_app'@'localhost';
```

Si el usuario ya existe, revisar sus permisos y usar su contraseña vigente; no cambiarla por inferencia ni crear una cuenta root sin clave.

En la raíz del repositorio, copiar .env.example a .env y completar MYSQL_PORT y MYSQL_PASSWORD con los datos propios. Nunca subir .env. Mantener MYSQL_DATABASE=fenixa; las pruebas de integración usan expresamente fenixa_test.

```powershell
Copy-Item .env.example .env
npm ci
```

El repositorio integrado arranca con `npm start`: crea tablas e importa el catálogo. Abrir http://127.0.0.1:3002/health y comprobar `database: connected` y `engine: mysql`. No hace falta importar manualmente el SQL: el servidor lo ejecuta.

Durante la integración por cuatro PR, la aplicación completa y `npm test` requieren las cuatro partes. Antes se puede revisar conexión, esquema y módulos sin prometer una demo completa.

APP_ORIGIN debe coincidir con la dirección del navegador. HOST=127.0.0.1 solo escucha en el computador local. No abrir MySQL públicamente. Un enlace temporal de Cloudflare no es un despliegue permanente ni acompaña estos archivos.
