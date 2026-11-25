// Errores: clase HttpError y middleware final que los traduce a {error: mensaje}.
import multer from 'multer';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

// Ruta no encontrada: pasa un 404 al manejador final.
export function notFound(req, res, next) {
  next(new HttpError(404, 'Ruta no encontrada.'));
}

// Convierte cualquier error en estado + mensaje seguro para el cliente.
function translate(error) {
  if (error instanceof SyntaxError && error.type === 'entity.parse.failed') return { status: 400, message: 'JSON mal formado' };
  if (error.code === 'ER_DUP_ENTRY') return { status: 409, message: 'El registro ya existe.' };
  if (error.code === 'ER_NO_REFERENCED_ROW_2') return { status: 400, message: 'Referencia inválida a un registro inexistente.' };
  if (error instanceof multer.MulterError) {
    return {
      status: error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
      message: 'Archivo demasiado grande o formulario multipart inválido (máximo 5 MB, un archivo).'
    };
  }
  if (error instanceof HttpError) {
    // Con detalles de validación, el mensaje incluye el primero para que el cliente lo muestre.
    const first = error.details?.[0];
    return { status: error.status, message: first ? `${error.message}: ${first.campo} ${first.motivo}` : error.message, details: error.details };
  }
  // Errores 4xx de Express o body-parser (por ejemplo, cuerpo demasiado grande).
  if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) return { status: error.status, message: error.message };
  return { status: 500, message: 'Error interno del servidor.' };
}

export function errorHandler(options = {}) {
  return (error, req, res, next) => {
    if (res.headersSent) return next(error);
    const { status, message, details } = translate(error);
    if (status >= 500 && !options.quiet) console.error(error);
    res.status(status).json(details ? { error: message, details } : { error: message });
  };
}
