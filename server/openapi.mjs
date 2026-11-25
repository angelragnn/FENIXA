// Especificación OpenAPI para /docs. Los esquemas de entrada vienen de validation/schemas.mjs:
// son los mismos objetos que ajv usa para validar, así documentación y validación no se separan.
import { schemas } from './validation/schemas.mjs';

const ref = name => ({ $ref: `#/components/schemas/${name}` });
const jsonBody = name => ({ required: true, content: { 'application/json': { schema: ref(name) } } });
const secured = { security: [{ sessionCookie: [] }] };
const pathParam = (name, schema) => ({ name, in: 'path', required: true, schema: schema.properties[name] });
const idParam = pathParam('id', schemas.IdParams);
const fileIdParam = pathParam('fileId', schemas.FileIdParams);

const errorBody = description => ({ description, content: { 'application/json': { schema: ref('ValidationError') } } });
const standard = {
  400: errorBody('Datos no válidos: el cuerpo "details" lista cada campo y su motivo'),
  401: errorBody('Sesión requerida'),
  404: errorBody('Recurso inexistente o de otro usuario'),
  409: errorBody('El registro ya existe (por ejemplo, correo ya registrado)'),
  413: errorBody('Cuerpo o archivo demasiado grande'),
  429: errorBody('Límite de peticiones alcanzado')
};

// success: { código: descripción }; errors: códigos de error que esa operación puede devolver.
const operation = (summary, success, errors = [], extra = {}) => ({
  summary,
  responses: {
    ...Object.fromEntries(Object.entries(success).map(([code, description]) => [code, { description }])),
    ...Object.fromEntries(errors.map(code => [code, standard[code]])),
    429: standard[429]
  },
  ...extra
});

export const specification = {
  openapi: '3.0.3',
  info: { title: 'FENIXA full stack', version: '0.2.0', description: 'Propuestas de PC, sesiones y documentos privados. Presupuesto en pesos colombianos enteros. Las mutaciones desde un navegador requieren el origen configurado en APP_ORIGIN.' },
  components: { securitySchemes: { sessionCookie: { type: 'apiKey', in: 'cookie', name: 'fenixa_session' } }, schemas },
  paths: {
    '/api/advice': { post: operation('Propone hasta tres alternativas de referencia según presupuesto y uso', { 200: 'Alternativas de referencia' }, [400, 413], { requestBody: jsonBody('AdviceInput') }) },
    '/api/catalog': { get: operation('Catálogo original importado: fichas, imágenes y ofertas históricas', { 200: 'Catálogo completo' }) },
    '/api/reference-builds': { get: { ...operation('Builds de referencia del proyecto original (legado: usa /api/builds)', { 200: 'Builds de referencia' }, [401], secured), deprecated: true } },
    '/api/builds': { get: operation('Catálogo público de builds completas con piezas, fotos y suma de referencia', { 200: 'Builds ordenadas por precio' }) },
    '/api/components': { get: operation('Componentes y categorías de referencia', { 200: 'Componentes' }, [401], secured) },
    '/health': { get: operation('Comprueba una consulta real a MySQL', { 200: 'MySQL responde' }) },
    '/health/live': { get: operation('Comprueba que el servidor responde', { 200: 'Proceso activo' }) },
    '/api/auth/register': { post: operation('Crea la cuenta e inicia sesión', { 201: 'Cuenta creada; cookie HttpOnly emitida' }, [400, 409, 413], { requestBody: jsonBody('Register') }) },
    '/api/auth/login': { post: operation('Inicia sesión', { 200: 'Sesión iniciada; cookie HttpOnly emitida' }, [400, 401, 413], { requestBody: jsonBody('Login') }) },
    '/api/auth/me': { get: operation('Consulta la cuenta actual', { 200: 'Cuenta actual' }, [401], secured) },
    '/api/auth/logout': { post: operation('Revoca la sesión', { 204: 'Sesión revocada' }, [401], secured) },
    '/api/proposals': {
      get: operation('Lista tus propuestas', { 200: 'Propuestas del usuario' }, [401], secured),
      post: operation('Crea una propuesta y su versión JSON', { 201: 'Propuesta creada' }, [400, 401, 413], { ...secured, requestBody: jsonBody('ProposalInput') })
    },
    '/api/proposals/{id}': {
      parameters: [idParam],
      get: operation('Consulta tu propuesta', { 200: 'Propuesta con componentes y compatibilidad' }, [400, 401, 404], secured),
      put: operation('Reemplaza los datos y genera otra versión JSON', { 200: 'Propuesta actualizada' }, [400, 401, 404, 413], { ...secured, requestBody: jsonBody('ProposalInput') }),
      delete: operation('Elimina de las consultas (borrado lógico)', { 204: 'Propuesta eliminada' }, [400, 401, 404], secured)
    },
    '/api/proposals/{id}/history': { parameters: [idParam], get: operation('Historial de versiones de la propuesta', { 200: 'Historial' }, [400, 401, 404], secured) },
    '/api/proposals/{id}/files': {
      parameters: [idParam],
      get: operation('Lista adjuntos y versiones JSON', { 200: 'Adjuntos de la propuesta' }, [400, 401, 404], secured),
      post: operation('Adjunta PDF, PNG o JPEG (hasta 5 MiB); se guarda su huella SHA-256', { 201: 'Archivo y metadatos guardados' }, [400, 401, 404, 413], {
        ...secured,
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } } } }
      })
    },
    '/api/files/{fileId}': {
      parameters: [fileIdParam],
      get: operation('Descarga privada del archivo; con ?inline=1 los PDF/PNG/JPEG se muestran en el navegador (CSP restrictiva y nosniff); las versiones JSON siempre se descargan', { 200: 'Contenido del archivo' }, [400, 401, 404], {
        ...secured,
        parameters: [{ name: 'inline', in: 'query', required: false, schema: schemas.FileQuery.properties.inline }]
      }),
      delete: operation('Elimina un adjunto propio (fila, historial y archivo); las versiones JSON automáticas no se pueden eliminar', { 204: 'Adjunto eliminado' }, [400, 401, 404, 409], secured)
    }
  }
};
