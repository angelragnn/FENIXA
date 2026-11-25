// PM2 para Criterio. Uso (desde la raíz del proyecto):
//   pm2 start deploy/ecosystem.config.cjs --env production
//
// Secretos: NO van aquí. server/server.mjs ejecuta process.loadEnvFile() sobre
// el archivo ".env" de la raíz del proyecto (no lee ".env.production" por sí
// solo). Por eso en el VPS se crea ".env.production" fuera de Git y se enlaza:
//   cp .env.production .env   (o: ln -s .env.production .env)   y chmod 600
// Las variables que PM2 define abajo tienen prioridad sobre las del archivo.
module.exports = {
  apps: [
    {
      name: 'criterio',
      script: 'server/server.mjs',
      cwd: __dirname + '/..',
      // Una sola instancia en modo fork: los adjuntos se guardan en disco local,
      // así que varias instancias (cluster) o varios servidores no comparten archivos.
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M',
      time: true,
      out_file: './logs/criterio-out.log',
      error_file: './logs/criterio-error.log',
      merge_logs: true,
      env: { NODE_ENV: 'development' },
      env_production: { NODE_ENV: 'production' }
    }
  ]
};
