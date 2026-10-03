import { spawn, execFile } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const share = process.argv.includes('--share');
const port = 3001;
const url = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server/server.mjs'], {
  cwd: root,
  env: { ...process.env, HOST: share ? '0.0.0.0' : '127.0.0.1', PORT: String(port) },
  stdio: ['inherit', 'pipe', 'inherit'],
});

let opened = false;
let startup = '';
child.stdout.on('data', chunk => {
  process.stdout.write(chunk);
  startup += chunk;
  if (opened || !startup.includes('FENIXA Universidad disponible')) return;
  opened = true;
  console.log(`Abre ${url}. Para detener el servidor, pulsa Ctrl+C.`);
  if (share) {
    console.log('En la misma Wi-Fi, tu amigo puede probar estas direcciones IPv4:');
    for (const addresses of Object.values(networkInterfaces())) {
      for (const address of addresses || []) {
        if (address.family === 'IPv4' && !address.internal) {
          console.log(`  http://${address.address}:${port}`);
        }
      }
    }
  }
  if (process.platform === 'win32' && !process.argv.includes('--no-browser')) {
    execFile('cmd.exe', ['/d', '/c', 'start', '', url], error => {
      if (error) console.log(`Abre manualmente ${url} en tu navegador.`);
    });
  }
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => {
  if (code && !opened) console.error('No se pudo iniciar. Si el puerto 3001 esta ocupado, cierra la otra ventana del servidor y reintenta.');
  process.exitCode = code || 0;
});
process.on('SIGINT', () => child.kill());
process.on('SIGTERM', () => child.kill());
