// Única fuente de verdad de los payloads: la usan validate.mjs (ajv) y openapi.mjs (/docs).
// Se limitan a palabras clave comunes a JSON Schema draft 7 y OpenAPI 3.0.
// "title" es la etiqueta en español que aparece en los mensajes de error.
const UUID = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
const PURPOSES = ['estudio', 'trabajo', 'juegos'];

export const schemas = {
  Register: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'email', 'password'],
    properties: {
      name: { title: 'nombre', type: 'string', minLength: 2, maxLength: 80 },
      email: { title: 'correo', type: 'string', format: 'email', maxLength: 254, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
      password: { title: 'contraseña', type: 'string', minLength: 10, maxLength: 128 }
    }
  },
  Login: {
    type: 'object',
    additionalProperties: false,
    required: ['email', 'password'],
    properties: {
      email: { title: 'correo', type: 'string', minLength: 1, maxLength: 254 },
      password: { title: 'contraseña', type: 'string', minLength: 1, maxLength: 128 }
    }
  },
  ProposalInput: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'purpose', 'budget'],
    properties: {
      title: { title: 'título', type: 'string', minLength: 3, maxLength: 100 },
      purpose: { title: 'uso', type: 'string', enum: PURPOSES },
      budget: { title: 'presupuesto', type: 'integer', minimum: 1, maximum: 100000000 },
      notes: { title: 'notas', type: 'string', maxLength: 4000 },
      componentIds: { title: 'componentes', type: 'array', uniqueItems: true, maxItems: 20, items: { type: 'integer' } }
    }
  },
  AdviceInput: {
    type: 'object',
    additionalProperties: false,
    required: ['budget', 'purpose'],
    properties: {
      budget: { title: 'presupuesto', type: 'integer', minimum: 100000, maximum: 100000000 },
      purpose: { title: 'uso', type: 'string', enum: PURPOSES },
      programs: { title: 'programas', type: 'string', maxLength: 800 }
    }
  },
  // Los ids de decisiones y archivos son UUID (CHAR(36) en MySQL).
  IdParams: {
    type: 'object',
    required: ['id'],
    properties: { id: { title: 'id', type: 'string', format: 'uuid', pattern: UUID } }
  },
  FileIdParams: {
    type: 'object',
    required: ['fileId'],
    properties: { fileId: { title: 'id del archivo', type: 'string', format: 'uuid', pattern: UUID } }
  },
  FileQuery: {
    type: 'object',
    properties: { inline: { title: 'inline', type: 'string', enum: ['1'] } }
  },
  ValidationError: {
    type: 'object',
    required: ['error'],
    properties: {
      error: { type: 'string', example: 'Datos no válidos: título debe tener al menos 3 caracteres' },
      details: { type: 'array', items: { type: 'object', properties: { campo: { type: 'string' }, motivo: { type: 'string' } } } }
    }
  }
};
