// Control de origen: en peticiones que modifican datos, si llega Origin debe ser el configurado.
import { HttpError } from './errors.mjs';

const METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

export function originControl(origin) {
  return (req, res, next) => {
    const sent = req.get('origin');
    if (METHODS.includes(req.method) && sent && sent !== origin) return next(new HttpError(403, 'Origen no permitido.'));
    next();
  };
}
