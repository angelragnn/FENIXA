import { checkPart, asPart } from '../client/assets/compatibility.js';
const baseCategories = [1, 2, 3, 12, 13, 10];
const validPrice = p => Number.isSafeInteger(p?.reference_price) && p.reference_price > 0;

export function advise(products, templates, input) {
  const { budget, purpose, programs = '' } = input || {};
  if (!Number.isSafeInteger(budget) || budget < 100000 || budget > 100000000 || !['estudio','trabajo','juegos'].includes(purpose) || typeof programs !== 'string' || programs.length > 800) {
    throw Object.assign(new Error('Indica un presupuesto entre 100.000 y 100 millones de COP, un uso válido y programas de hasta 800 caracteres.'), { status: 400 });
  }
  const byId = new Map(products.map(p => [p.id, p]));
  const options = templates.map(template => {
    const ids = Array.isArray(template.componentIds) ? template.componentIds : [];
    const parts = ids.map(id => byId.get(id)).filter(Boolean);
    const missingComponents = ids.filter(id => !byId.has(id));
    const missingCategories = baseCategories.filter(id => !parts.some(p => p.category_id === id));
    const duplicateCategories = new Set(parts.map(p=>p.category_id)).size !== parts.length;
    const missingPrices = parts.filter(p => !validPrice(p)).length;
    const total = parts.reduce((sum,p) => sum + (validPrice(p) ? p.reference_price : 0), 0);
    const complete = parts.length > 0 && !missingComponents.length && !missingCategories.length && !duplicateCategories;
    const conflicts = parts.map(p => ({ name:p.name, ...checkPart(asPart(p),parts.filter(other=>other.category_id!==p.category_id).map(asPart)) })).filter(check=>check.status==='conflict');
    const gpu = parts.some(p => p.category_id === 11);
    const requiresGpu = parts.some(p=>p.category_id===1 && p.specs?.values?.requiresGpu===true);
    const within = complete && !conflicts.length && !missingPrices && total <= budget;
    const status = !complete ? 'incomplete' : conflicts.length || (requiresGpu && !gpu) ? 'incompatible' : missingPrices ? 'missing_prices' : total > budget ? 'over_budget' : 'within_reference';
    const reasons = [purpose === 'juegos' ? (gpu ? 'Incluye gráfica dedicada como punto de partida para juegos.' : 'Usa gráficos integrados: revisa los requisitos de tus juegos y la resolución antes de elegir.') : 'Es una propuesta de escritorio para contrastar con tus tareas y los requisitos de tus programas.'];
    if (!complete) reasons.push('La plantilla está incompleta o tiene piezas repetidas: no se presenta como una configuración lista.');
    else if (status==='incompatible') reasons.push('Hay un conflicto conocido que debe resolverse antes de elegir esta propuesta.');
    else if (missingPrices) reasons.push('Hay piezas sin precio: la suma es parcial y el costo completo está pendiente.');
    else reasons.push(total<=budget ? 'La suma de referencias históricas cabe en el presupuesto indicado.' : `La suma de referencias supera el presupuesto en ${total-budget} COP.`);
    const cautions = ['Los precios son históricos; faltan cotizaciones actuales y costos de envío.', 'No se han medido FPS ni rendimiento de tus programas. Revisa sus requisitos y la configuración completa.', ...conflicts.map(c=>c.reason)];
    if (requiresGpu && !gpu) cautions.push('El procesador requiere una gráfica dedicada y esta plantilla no la incluye.');
    if (programs.trim()) cautions.push(`Programas indicados: ${programs.trim()}. Se conservan como requisitos; su rendimiento no se comprueba automáticamente.`);
    return { id:template.id, title:template.name, purpose, budget, componentIds:parts.map(p=>p.id), parts, total, missingPrices, missingComponents, missingCategories, complete, status, withinBudget:within && status==='within_reference', hasDedicatedGpu:gpu, budgetDifference:complete && !missingPrices ? budget-total : null, reasons, cautions, description:template.description };
  });
  const priority = { within_reference:0, over_budget:1, missing_prices:2, incomplete:3, incompatible:4 };
  options.sort((a,b) => priority[a.status]-priority[b.status] || (purpose==='juegos' ? Number(b.hasDedicatedGpu)-Number(a.hasDedicatedGpu) : 0) || a.total-b.total || a.id.localeCompare(b.id));
  const selected = options.slice(0,3);
  selected.forEach((option,index) => { option.rankReason = option.status==='within_reference' ? (purpose==='juegos' && option.hasDedicatedGpu ? 'Cabe en la referencia e incluye gráfica dedicada' : 'Cabe en la referencia; compara sus piezas y limitaciones') : option.status==='over_budget' ? 'Alternativa para revisar si puedes ampliar el presupuesto' : 'Propuesta con información o validaciones pendientes'; option.position=index+1; });
  return { budget, purpose, programs:programs.trim(), templateCount:templates.length, options:selected, notice:options.some(p=>p.withinBudget) ? 'Estas alternativas encajan en el presupuesto de referencia. Compara sus límites y consigue cotizaciones actuales antes de decidir.' : 'No hay una propuesta completa y sin conflictos conocidos dentro de tu presupuesto de referencia. Estas alternativas requieren ajustes o confirmaciones.' };
}
