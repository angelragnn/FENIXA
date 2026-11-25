// Límites de peticiones: uno general para /api y otro más estricto para registro/login.
import { rateLimit } from 'express-rate-limit';

export function apiLimiter(options) {
  return rateLimit({
    windowMs: 60000,
    limit: options.rateLimit || 180,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones. Intenta más tarde.' }
  });
}

export function authLimiter(options) {
  return rateLimit({
    windowMs: 15 * 60000,
    limit: options.authLimit || 20,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Espera 15 minutos.' }
  });
}
