export async function api(url, options = {}) {
  let response;
  try { response = await fetch(url, { credentials:'same-origin', signal:AbortSignal.timeout(15000), ...options, headers: options.body instanceof FormData ? options.headers : {'Content-Type':'application/json',...options.headers} }); }
  catch(error) { throw new Error(error.name==='TimeoutError'?'El servidor está tardando demasiado. Intenta de nuevo.':'Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.'); }
  if (response.status === 401 && location.pathname === '/dashboard') { location.replace('/login?next='+encodeURIComponent(location.pathname+location.search)); throw new Error('La sesión terminó.'); }
  if (response.status === 204) return null;
  let body;try{body=await response.json();}catch{throw new Error('El servidor devolvió una respuesta inesperada. Intenta de nuevo.');}
  if (!response.ok) { const list = [].concat(body.details || []).map(d => typeof d === 'string' ? d : d?.message || [d?.field, d?.error].filter(Boolean).join(': ')).filter(Boolean); const extra = [].concat(body.details || []).slice(1).map(d => typeof d === 'string' ? d : d?.message || [d?.campo ?? d?.field, d?.motivo ?? d?.error].filter(Boolean).join(': ')).filter(Boolean); const error = new Error((body.error || 'No se pudo completar la operación.') + (extra.length ? ' ' + extra.join(' · ') : '')); error.status = response.status; error.details = body.details; throw error; }
  return body.data;
}
