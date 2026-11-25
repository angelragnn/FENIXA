# Preparar MySQL para el equipo

Instalar Node.js 24+, Git y MySQL 8+. El servicio de MySQL debe estar encendido. Una instalación estándar suele usar el puerto 3306; revisa el de tu equipo. Si usas otra instancia o puerto, ajusta `MYSQL_PORT` en `.env`. Las carpetas de datos y las contraseñas de otras instalaciones no se distribuyen.

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

### Si aparece «Access denied» con MYSQL_HOST=127.0.0.1

Para MySQL, `127.0.0.1` y `localhost` son hosts distintos. Si la app usa `MYSQL_HOST=127.0.0.1` y recibe «Access denied», crea también esta cuenta con los mismos permisos. La clave debe ser la misma:

```sql
CREATE USER 'fenixa_app'@'127.0.0.1' IDENTIFIED BY 'CAMBIA_ESTA_CLAVE_POR_UNA_PROPIA';
GRANT ALL PRIVILEGES ON fenixa.* TO 'fenixa_app'@'127.0.0.1';
GRANT ALL PRIVILEGES ON fenixa_test.* TO 'fenixa_app'@'127.0.0.1';
```

## Configurar .env

En la raíz del repositorio, copia `.env.example` a `.env`:

```powershell
Copy-Item .env.example .env
```

En Git Bash, el comando es `cp .env.example .env`.

Después completa:

- `MYSQL_PASSWORD`: la misma clave que pusiste en `CREATE USER`.
- `MYSQL_PORT`: el puerto de tu MySQL (3306 por defecto).

Mantén `MYSQL_DATABASE=fenixa`; las pruebas de integración usan `fenixa_test`. Nunca subas .env a Git.

## Arrancar

```powershell
npm ci
npm start
```

El servidor crea las tablas e importa el catálogo. Abrir http://127.0.0.1:3002/health (con el valor de `PORT`, 3002 por defecto) y comprobar `database: connected` y `engine: mysql`. No hace falta importar manualmente el SQL: el servidor lo ejecuta.

`APP_ORIGIN` debe coincidir exactamente con la dirección que usa el navegador. `HOST=127.0.0.1` solo escucha en el computador local. No abrir MySQL públicamente. Un enlace temporal de Cloudflare no es un despliegue permanente ni acompaña estos archivos.
