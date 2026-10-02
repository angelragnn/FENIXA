const sections = ['inicio', 'login', 'registro'];
function show(id) {
  sections.forEach(name => {
    const node = document.getElementById(name);
    node.hidden = name !== id;
    node.classList.toggle('active', name === id);
  });
  document.querySelector('.features').hidden = id !== 'inicio';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => show(button.dataset.view)));

for (const form of document.querySelectorAll('.auth form')) {
  form.noValidate = true;
  const feedback = form.querySelector('[role="status"]');
  for (const input of form.querySelectorAll('input')) {
    const error = document.createElement('small');
    error.id = `${input.id}-error`;
    error.style.color = '#ff9cb5';
    error.setAttribute('aria-live', 'polite');
    input.setAttribute('aria-describedby', error.id);
    input.after(error);
    const validate = () => {
      if (input.name === 'name') input.setCustomValidity(input.value.trim().length < 2 ? 'Escribe al menos dos caracteres para tu nombre.' : '');
      input.setAttribute('aria-invalid', String(!input.validity.valid));
      error.textContent = input.validity.valid ? '' : input.validationMessage;
      feedback.textContent = '';
      return input.validity.valid;
    };
    input.addEventListener('blur', validate);
    input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid')) validate();
    });
    input.validateDemo = validate;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    let firstInvalid;
    for (const input of form.querySelectorAll('input')) {
      if (!input.validateDemo() && !firstInvalid) firstInvalid = input;
    }
    if (firstInvalid) {
      feedback.textContent = 'Revisa los campos indicados.';
      firstInvalid.focus();
      return;
    }
    feedback.textContent = 'Formulario validado. Esta es una demostración: no se crea una cuenta ni se inicia sesión.';
  });
}
fetch('/health').then(response => response.json()).then(data => {
  document.getElementById('healthDot').classList.toggle('ok', data.status === 'ok');
  document.getElementById('healthText').textContent = data.status === 'ok' ? 'Backend conectado a SQLite' : 'Backend no disponible';
}).catch(() => { document.getElementById('healthText').textContent = 'Backend no disponible'; });
