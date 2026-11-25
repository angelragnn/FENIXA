// Servicio de autenticación: cuentas y sesiones en MySQL. No conoce req/res salvo para leer la cookie.
import { randomBytes, randomUUID } from 'node:crypto';
import { HttpError } from '../middleware/errors.mjs';
import { digest, hashPassword, verifyPassword, sessionToken } from '../security.mjs';

const SESSION_MS = 8 * 3600000;

export function createAuthService({ db }) {
  // Crea la sesión y devuelve el token que el controlador pondrá en la cookie.
  async function startSession(user) {
    const token = randomBytes(32).toString('hex');
    await db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
    await db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token), user.id, Date.now() + SESSION_MS);
    return token;
  }

  return {
    sessionMs: SESSION_MS,

    async userFromRequest(req) {
      const token = sessionToken(req);
      if (!token) return undefined;
      return db.prepare('SELECT a.id,a.name,a.email FROM sessions s JOIN accounts a ON a.id=s.user_id WHERE s.token_hash=? AND s.expires>?').get(digest(token), Date.now());
    },

    async register(body) {
      const { name, email, password } = body || {};
      const invalid = typeof name !== 'string' || name.trim().length < 2 || name.length > 80
        || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        || typeof password !== 'string' || password.length < 10 || password.length > 128;
      if (invalid) throw new HttpError(400, 'Revisa nombre, correo y contraseña (10 a 128 caracteres).');
      const passwordHash = await hashPassword(password);
      const user = { id: randomUUID(), name: name.trim(), email: email.toLowerCase().trim() };
      try {
        await db.prepare('INSERT INTO accounts VALUES(?,?,?,?)').run(user.id, user.name, user.email, passwordHash);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Ese correo ya está registrado.');
        throw error;
      }
      return { user, token: await startSession(user) };
    },

    async login(body, req) {
      const { email, password } = body || {};
      if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 128) {
        throw new HttpError(400, 'Correo y contraseña requeridos.');
      }
      const account = await db.prepare('SELECT * FROM accounts WHERE email=?').get(email.trim().toLowerCase());
      // También se deriva un hash ante un correo desconocido para reducir diferencias de tiempo.
      const valid = account ? await verifyPassword(password, account.password_hash) : (await hashPassword(password), false);
      if (!valid) throw new HttpError(401, 'Credenciales incorrectas.');
      const old = sessionToken(req);
      if (old) await db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(old));
      const user = { id: account.id, name: account.name, email: account.email };
      return { user, token: await startSession(account) };
    },

    async logout(req) {
      await db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(sessionToken(req)));
    }
  };
}
