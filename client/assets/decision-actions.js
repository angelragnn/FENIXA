// El borrador se descarta solamente después de confirmar y completar el borrado.
export async function deleteDecision({ id, busy, dirty, ask, remove, onDeleted, onError }) {
  if (!id) return false;
  if (busy) { onError('Espera a que termine el guardado.'); return false; }
  const prompt = dirty
    ? '¿Eliminar esta propuesta y descartar los cambios sin guardar?'
    : '¿Eliminar esta propuesta de tu lista?';
  if (!ask(prompt)) return false;
  try {
    await remove(id);
    await onDeleted();
    return true;
  } catch (error) {
    onError(error.message);
    return false;
  }
}
