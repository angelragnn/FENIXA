import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync}from'node:fs';import{advise}from'../server/advisor.mjs';
const seed=JSON.parse(readFileSync(new URL('../server/data-seeds/catalog.json',import.meta.url),'utf8'));
test('asesor conserva presupuesto, necesidades y piezas reales sin inventar métricas',()=>{const result=advise(seed.products,seed.builds,{budget:5000000,purpose:'trabajo',programs:'Blender'});assert.ok(result.options.length>0);assert.equal(result.programs,'Blender');for(const o of result.options){assert.ok(o.componentIds.every(id=>seed.products.some(p=>p.id===id)));assert.equal(o.withinBudget,o.missingPrices===0&&o.total<=5000000);assert.ok(o.cautions.some(c=>c.includes('No se han medido FPS')));}});
test('presupuesto insuficiente y entradas inválidas se explican',()=>{assert.ok(advise(seed.products,seed.builds,{budget:100000,purpose:'juegos'}).options.every(o=>!o.withinBudget));assert.throws(()=>advise(seed.products,seed.builds,{budget:-1,purpose:'juegos'}),{status:400});});

const input={budget:10000000,purpose:'estudio'};
test('una pieza inexistente no reduce engañosamente el costo de una plantilla',()=>{
  const template={...seed.builds[0],componentIds:[...seed.builds[0].componentIds,999999]};
  const option=advise(seed.products,[template],input).options[0];
  assert.equal(option.withinBudget,false);assert.equal(option.status,'incomplete');assert.deepEqual(option.missingComponents,[999999]);
});
test('precios cero, ausentes o negativos producen suma parcial',()=>{
  for(const price of [0,null,-500]){
    const products=seed.products.map(p=>p.id===seed.builds[0].componentIds[0]?{...p,reference_price:price}:p);
    const option=advise(products,[seed.builds[0]],input).options[0];
    assert.equal(option.status,'missing_prices');assert.equal(option.withinBudget,false);assert.equal(option.budgetDifference,null);
  }
});
test('faltan categorías esenciales o hay categorías repetidas: no se ofrece como completa',()=>{
  const base=seed.builds[0];
  const incomplete=advise(seed.products,[{...base,componentIds:base.componentIds.slice(1)}],input).options[0];
  assert.equal(incomplete.complete,false);
  const repeated=advise(seed.products,[{...base,componentIds:[...base.componentIds,base.componentIds[0]]}],input).options[0];
  assert.equal(repeated.withinBudget,false);
});
test('las alternativas sin precio quedan después de una propuesta cotizable de referencia',()=>{
  const first=seed.builds[0];const missing={...first,id:'partial',componentIds:[...first.componentIds,999999]};
  const result=advise(seed.products,[missing,first],input);
  assert.equal(result.options[0].id,first.id);assert.equal(result.options[0].status,'within_reference');
});
test('catálogo o plantillas vacías no inventan opciones y programas se validan',()=>{
  assert.equal(advise([],[],input).options.length,0);
  assert.equal(advise([],seed.builds,input).options.some(o=>o.withinBudget),false);
  assert.throws(()=>advise(seed.products,seed.builds,{...input,programs:{}}),{status:400});
});
