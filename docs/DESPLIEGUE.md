# Guía de despliegue en un VPS (Ubuntu 24.04)

Esta guía publica Criterio en un servidor propio con Nginx, PM2 y MySQL local.

> Nota sobre variables: la base de datos usa `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD` y `MYSQL_DATABASE` (ver `.env.example`). `TRUST_PROXY` y las variables de Supabase están previstas pero pueden no estar implementadas todavía en `server/`: confirma en el código antes de depender de ellas.

## 1. Servidor y usuario

```bash
ssh root@IP_DEL_VPS
adduser deploy && usermod -aG sudo deploy
# copia tu clave SSH a /home/deploy/.ssh/authorized_keys y entra como deploy
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw enable
sudo apt update && sudo apt upgrade -y
```

El puerto 3002 y el 3306 NO se abren al exterior.

## 2. Node.js 24 (LTS)

Instala Node 24 con NodeSource o nvm y comprueba con `node -v`. Luego: `sudo npm i -g pm2`.

## 3. MySQL 8 solo en local

```bash
sudo apt install -y mysql-server
```

En `/etc/mysql/mysql.conf.d/mysqld.cnf` deja `bind-address = 127.0.0.1` y reinicia. Crea usuario propio y las bases:

```sql
CREATE DATABASE criterio CHARACTER SET utf8mb4;
CREATE DATABASE criterio_test CHARACTER SET utf8mb4;
CREATE USER 'criterio_app'@'localhost' IDENTIFIED BY 'UNA_CLAVE_LARGA';
GRANT ALL ON criterio.* TO 'criterio_app'@'localhost';
GRANT ALL ON criterio_test.* TO 'criterio_app'@'localhost';
```

Comprueba que `ss -tlnp | grep 3306` muestre solo `127.0.0.1`.

## 4. Código

```bash
cd ~ && git clone URL_DEL_REPOSITORIO criterio && cd criterio
npm ci --omit=dev
mkdir -p logs storage/files
```

## 5. Variables (.env.production)

Crea `.env.production` (fuera de Git) con:

```
NODE_ENV=production
HOST=127.0.0.1
PORT=3002
APP_ORIGIN=https://criterio.ejemplo.com
TRUST_PROXY=1
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=criterio_app
MYSQL_PASSWORD=UNA_CLAVE_LARGA
MYSQL_DATABASE=criterio
UPLOAD_DIR=storage/files
```

- `APP_ORIGIN` debe ser exactamente el dominio HTTPS: el servidor rechaza otros orígenes.
- `TRUST_PROXY=1` indica que hay un proxy (Nginx) delante, para ver la IP real en el límite de peticiones y para cookies Secure.
- `NODE_ENV=production` activa las cookies Secure.

El servidor solo carga el archivo `.env` de la raíz (`server/server.mjs`), no `.env.production`. Por eso:

```bash
chmod 600 .env.production
ln -s .env.production .env     # o: cp .env.production .env && chmod 600 .env
```

## 6. PM2

```bash
pm2 start deploy/ecosystem.config.cjs --env production
pm2 save
pm2 startup        # ejecuta el comando que imprime, con sudo
```

Comandos útiles: `pm2 logs criterio`, `pm2 restart criterio`. Se usa una sola instancia porque los adjuntos se guardan en disco local.

## 7. Nginx y HTTPS

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/criterio
# edita server_name con tu dominio
sudo ln -s /etc/nginx/sites-available/criterio /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d criterio.ejemplo.com
```

El DNS (registro A) del dominio debe apuntar antes a la IP del VPS.

## Comprobación tras desplegar

1. `curl -i https://criterio.ejemplo.com/health` devuelve 200.
2. `curl -i https://criterio.ejemplo.com/api/proposals` sin sesión devuelve 401.
3. `curl -i https://criterio.ejemplo.com/.env` devuelve 404.
4. En el navegador: registrar una cuenta e iniciar sesión.
5. Subir un PDF a una decisión y descargarlo de nuevo.

## Mantenimiento

Actualizar: `git pull && npm ci --omit=dev && pm2 restart criterio`. Respaldos: `npm run backup` (datos y documentos con SHA-256 en `storage/backups`); copia esos respaldos fuera del servidor. Ejecuta además `sudo apt upgrade` con regularidad.

## ¿Por qué VPS y no Vercel?

| Tema | Vercel | VPS |
|---|---|---|
| Archivos | Sistema de archivos efímero: los adjuntos se perderían sin Supabase | Disco persistente |
| Cuerpo de petición | Límite de 4,5 MB (los adjuntos son de hasta 5 MiB) | Configurable (6m en Nginx) |
| Ejecución | Funciones sin estado: cada arranque en frío ejecutaría el esquema | Un proceso continuo |
| Licencia | Plan Hobby no comercial | Sin esa restricción |
| Base de datos | Necesitaría MySQL gestionado con TLS | MySQL local, solo 127.0.0.1 |
| Costo | Variable según uso | Fijo |

A cambio, en el VPS tú mantienes el servidor: actualizaciones, seguridad y respaldos con `npm run backup`.

## Opción Supabase Storage (en preparación)

Aún no está activa. Cuando se implemente, se activará con:

```
STORAGE_DRIVER=supabase
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_KEY=...   # solo servidor
SUPABASE_BUCKET=nombre-del-bucket
```

`SUPABASE_SERVICE_KEY` da acceso total: va solo en el `.env` del servidor, nunca en `client/` ni en Git.

## Alternativa sin nube: túnel temporal

Para mostrar el proyecto un rato desde tu PC, sin VPS:

1. Inicia la app en local (puerto 3002) y MySQL en tu máquina.
2. `cloudflared tunnel --url http://127.0.0.1:3002` (solo el puerto 3002; nunca MySQL). Imprime un enlace `https://...trycloudflare.com`.
3. Reinicia la app con `APP_ORIGIN` igual a ese enlace exacto y `NODE_ENV=production` solo en el proceso (no en `.env`).
4. Al terminar, cierra el túnel y reinicia sin esas variables. El enlace es temporal.
