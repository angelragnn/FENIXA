export async function api(url, options = {}) {
  let response;
  try { response = await fetch(url, { credentials:'same-origin', signal:AbortSignal.timeout(15000), ...options, headers: options.body instanceof FormData ? options.headers : {'Content-Type':'application/json',...options.headers} }); }
  catch(error) { throw new Error(error.name==='TimeoutError'?'El servidor está tardando demasiado. Intenta de nuevo.':'No hay conexión con el servidor. Intenta de nuevo.'); }
  if (response.status === 401 && location.pathname === '/dashboard') { location.replace('/login'); throw new Error('La sesión terminó.'); }
  if (response.status === 204) return null;
  let body;try{body=await response.json();}catch{throw new Error('El servidor devolvió una respuesta inesperada. Intenta de nuevo.');}
  if (!response.ok) throw new Error(body.error || 'No se pudo completar la operación.');
  return body.data;
}
