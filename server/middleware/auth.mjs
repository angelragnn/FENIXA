// Autenticación: adjunta el usuario de la sesión (si hay) y exige sesión en rutas privadas.
import { HttpError } from './errors.mjs';

export function attachUser(authService) {
  return async (req, res, next) => {
    req.user = await authService.userFromRequest(req);
    next();
  };
}

export function requireUser(req, res, next) {
  next(req.user ? undefined : new HttpError(401, 'Inicia sesión para continuar.'));
}
