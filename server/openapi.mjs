const json = schema => ({ 'application/json': { schema } });
const response = description => ({ description });
const payload = (properties, required = Object.keys(properties)) => ({ required: true, content: json({ type: 'object', required, properties }) });
const string = { type: 'string' };
const proposal = { componentIds:{type:'array',uniqueItems:true,maxItems:20,items:{type:'integer'}}, title: { type:'string',minLength:3,maxLength:100 }, purpose:{ type:'string',enum:['estudio','trabajo','juegos'] }, budget:{ type:'integer',minimum:1,maximum:100000000 },notes:{ type:'string',maxLength:4000 } };
const secured = { security:[{sessionCookie:[]}] };
const id = { name:'id',in:'path',required:true,schema:string };
const operation = (summary, status='200', extra={}) => ({ summary, responses:{[status]:response('Operación correcta'),'400':response('Datos inválidos'),'401':response('Sesión requerida'),'404':response('Recurso inexistente o de otro usuario'),'429':response('Límite de peticiones alcanzado')},...extra });
export const specification = {
  openapi:'3.0.3', info:{title:'FENIXA full stack',version:'0.2.0',description:'Propuestas de PC, sesiones y documentos privados. Presupuesto en pesos colombianos enteros. Las mutaciones desde un navegador requieren el origen configurado en APP_ORIGIN.'},
  components:{securitySchemes:{sessionCookie:{type:'apiKey',in:'cookie',name:'fenixa_session'}}},
  paths:{
    '/api/advice':{post:operation('Propone hasta tres alternativas de referencia según presupuesto y uso','200',{requestBody:payload({budget:{type:'integer',minimum:100000,maximum:100000000},purpose:{type:'string',enum:['estudio','trabajo','juegos']},programs:{type:'string',maxLength:800}},['budget','purpose'])})},
    '/api/catalog':{get:operation('Catálogo original importado: fichas, imágenes y ofertas históricas')},
    '/api/reference-builds':{get:operation('Builds de referencia del proyecto original','200',secured)},
    '/api/components':{get:operation('Componentes y categorías de referencia','200',secured)},
    '/health':{get:operation('Comprueba una consulta real a MySQL')},
    '/health/live':{get:operation('Comprueba que el servidor responde')},
    '/api/auth/register':{post:operation('Crea la cuenta e inicia sesión','201',{requestBody:payload({name:{type:'string',minLength:2,maxLength:80},email:{type:'string',format:'email'},password:{type:'string',minLength:10,maxLength:128}}),responses:{201:response('Cuenta creada; cookie HttpOnly emitida'),400:response('Datos inválidos'),409:response('Correo registrado'),429:response('Demasiados intentos')}})},
    '/api/auth/login':{post:operation('Inicia sesión','200',{requestBody:payload({email:string,password:string})})},
    '/api/auth/me':{get:operation('Consulta la cuenta actual','200',secured)},
    '/api/auth/logout':{post:operation('Revoca la sesión','204',secured)},
    '/api/proposals':{get:operation('Lista tus propuestas','200',secured),post:operation('Crea una propuesta y su versión JSON','201',{...secured,requestBody:payload(proposal,['title','purpose','budget'])})},
    '/api/proposals/{id}':{parameters:[id],get:operation('Consulta tu propuesta','200',secured),put:operation('Reemplaza los datos y genera otra versión JSON','200',{...secured,requestBody:payload(proposal,['title','purpose','budget'])}),delete:operation('Elimina de las consultas (borrado lógico)','204',secured)},
    '/api/proposals/{id}/history':{parameters:[id],get:operation('Historial de versiones de la propuesta','200',secured)},
    '/api/proposals/{id}/files':{parameters:[id],get:operation('Lista adjuntos y versiones JSON','200',secured),post:operation('Adjunta PDF, PNG o JPEG (hasta 5 MiB)','201',{...secured,requestBody:{required:true,content:{'multipart/form-data':{schema:{type:'object',required:['file'],properties:{file:{type:'string',format:'binary'}}}}}},responses:{201:response('Archivo y metadatos guardados'),400:response('Tipo o formulario inválido'),401:response('Sesión requerida'),404:response('Propuesta no encontrada'),413:response('Archivo excede 5 MiB')}})},
    '/api/files/{fileId}':{parameters:[{...id,name:'fileId'}],get:operation('Descarga privada del archivo','200',secured)}
  }
};
