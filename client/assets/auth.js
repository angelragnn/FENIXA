import { api } from './api.js';
const register = location.pathname === '/register';
document.title = `${register ? 'Crear cuenta' : 'Entrar'} · Criterio`;
document.querySelector('h1').textContent = register ? 'Tu próxima PC empieza aquí.' : 'Qué bueno verte de nuevo.';
const form = document.querySelector('form');
form.elements.name.closest('label').hidden = !register;
form.elements.name.required = register;
form.elements.password.autocomplete = register ? 'new-password' : 'current-password';
document.querySelector('#switch').innerHTML = register ? '¿Ya tienes cuenta? <a href="/login">Entra aquí</a>' : '¿Primera vez? <a href="/register">Crea tu cuenta</a>';
const button = form.querySelector('button'); button.textContent = register ? 'Crear mi cuenta' : 'Entrar';
// Solo rutas internas: empieza por '/', no por '//', sin '\\' ni esquema.
const next=(()=>{const value=new URLSearchParams(location.search).get('next')||'';return value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')&&!/[\u0000-\u001f]/.test(value)&&!/^\/[^/?#]*:/.test(value)?value:'/dashboard';})();
if(next!=='/dashboard')document.querySelector('#switch a').href+=`?next=${encodeURIComponent(next)}`;
form.addEventListener('submit', async event => {
  event.preventDefault(); button.disabled = true; form.setAttribute('aria-busy','true');
  const feedback = document.querySelector('#feedback'); feedback.textContent = 'Comprobando…';
  try {
    await api(`/api/auth/${register ? 'register' : 'login'}`, {method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form)))});
    location.assign(next);
  } catch(error) { feedback.textContent = error.message; }
  finally { button.disabled = false; form.removeAttribute('aria-busy'); }
});
