// validate({ body, params, query }): valida con ajv y lanza HttpError(400, 'Datos no válidos', detalles).
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { HttpError } from './errors.mjs';

const options = { allErrors: true, verbose: true };
// El cuerpo JSON ya trae tipos reales: sin coerción. Params y query llegan siempre como texto.
const strictAjv = addFormats(new Ajv(options));
const coercingAjv = addFormats(new Ajv({ ...options, coerceTypes: true }));

const TYPES = { integer: 'un número entero', string: 'texto', array: 'una lista', object: 'un objeto', number: 'un número', boolean: 'verdadero o falso' };

// Traduce un error de ajv a { campo, motivo } en español.
function describe(error) {
  const { keyword, params, parentSchema = {}, instancePath } = error;
  const own = instancePath.split('/').filter(Boolean).join('.');
  let campo = parentSchema.title || own || 'cuerpo';
  if (keyword === 'required') campo = parentSchema.properties?.[params.missingProperty]?.title || params.missingProperty;
  if (keyword === 'additionalProperties') campo = params.additionalProperty;
  const invalidId = 'no tiene un formato de identificador válido';
  const motivos = {
    required: () => 'es obligatorio',
    additionalProperties: () => 'no es un campo permitido',
    type: () => `debe ser ${TYPES[params.type] || params.type}`,
    minLength: () => `debe tener al menos ${params.limit} caracteres`,
    maxLength: () => `no puede superar ${params.limit} caracteres`,
    minimum: () => `debe ser mayor o igual a ${params.limit}`,
    maximum: () => `debe ser menor o igual a ${params.limit}`,
    enum: () => `debe ser uno de: ${params.allowedValues.join(', ')}`,
    uniqueItems: () => 'no admite elementos repetidos',
    maxItems: () => `admite hasta ${params.limit} elementos`,
    minItems: () => `requiere al menos ${params.limit} elementos`,
    format: () => (params.format === 'email' ? 'no es un correo válido' : params.format === 'uuid' ? invalidId : `no cumple el formato ${params.format}`),
    pattern: () => (parentSchema.format === 'uuid' ? invalidId : parentSchema.format === 'email' ? 'no es un correo válido' : 'no tiene un formato válido')
  };
  return { campo, motivo: (motivos[keyword] || (() => error.message))() };
}

const compile = (ajv, schema) => (schema ? ajv.compile(schema) : null);

export function validate({ body, params, query } = {}) {
  const checks = { body: compile(strictAjv, body), params: compile(coercingAjv, params), query: compile(coercingAjv, query) };
  return (req, res, next) => {
    const details = [];
    // pattern y format fallan juntos para el mismo campo: se deja un solo aviso.
    const seen = new Set();
    const run = (part, data) => {
      if (!checks[part] || checks[part](data)) return;
      for (const error of checks[part].errors) {
        const item = describe(error);
        const key = `${item.campo}|${item.motivo}`;
        if (!seen.has(key)) { seen.add(key); details.push(item); }
      }
    };
    // Params y query se validan en copias porque ajv puede convertir tipos in situ.
    const data = { body: req.body === undefined ? {} : req.body, params: { ...req.params }, query: { ...req.query } };
    for (const part of ['body', 'params', 'query']) run(part, data[part]);
    if (details.length) return next(new HttpError(400, 'Datos no válidos', details));
    if (body) req.body = data.body;
    if (params) Object.assign(req.params, data.params);
    // En Express 5 req.query es de solo lectura: se redefine con los valores ya convertidos.
    if (query) Object.defineProperty(req, 'query', { value: data.query, configurable: true, writable: true });
    next();
  };
}
