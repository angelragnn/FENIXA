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
form.addEventListener('submit', async event => {
  event.preventDefault(); button.disabled = true;
  const feedback = document.querySelector('#feedback'); feedback.textContent = 'Comprobando…';
  try {
    await api(`/api/auth/${register ? 'register' : 'login'}`, {method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form)))});
    location.assign('/dashboard');
  } catch(error) { feedback.textContent = error.message; }
  finally { button.disabled = false; }
});
