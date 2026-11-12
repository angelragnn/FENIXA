import {api} from './api.js';
const $=s=>document.querySelector(s);
const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
const money=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
const form=$('#advisor-form');
let revision=0;
const useVerb={estudio:'estudiar',trabajo:'trabajar y crear',juegos:'jugar'};
const useNames={estudio:'Estudio',trabajo:'Trabajo y creación',juegos:'Juegos'};
const statusNames={within_reference:'Dentro de la referencia',over_budget:'Requiere ampliar presupuesto',missing_prices:'Faltan precios',incomplete:'Propuesta incompleta',incompatible:'Conflicto pendiente'};
function rememberNeeds(){try{sessionStorage.setItem('criterio-needs',JSON.stringify(Object.fromEntries(new FormData(form))));}catch{}}
function changed(event){if(!event||['purpose','budget'].includes(event.target?.name))scheduleStage();revision++;const hadResults=!$('#advice-results').hidden;$('#advice-results').hidden=true;$('#advisor-status').textContent=hadResults?'Cambiaste tus datos. Pulsa Ver mis opciones para comparar otra vez.':'';rememberNeeds();updatePresets();}
function updatePresets(){for(const button of form.querySelectorAll('[data-budget]'))button.setAttribute('aria-pressed',String(Number(button.dataset.budget)===Number(form.elements.budget.value)));}
form.addEventListener('input',changed);
for(const button of form.querySelectorAll('[data-budget]'))button.onclick=()=>{form.elements.budget.value=button.dataset.budget;changed();};
try{const saved=JSON.parse(sessionStorage.getItem('criterio-needs')||'null');if(saved&&Number(saved.budget)>=100000&&Number(saved.budget)<=100000000){form.elements.budget.value=saved.budget;if(useNames[saved.purpose])form.elements.purpose.value=saved.purpose;if(typeof saved.programs==='string')form.elements.programs.value=saved.programs.slice(0,800);}}catch{}
updatePresets();
function comparison(options){
 const table=node('table');const head=node('tr');head.append(node('th','Qué estás comparando'));for(const option of options)head.append(node('th',option.title));table.append(head);
 for(const [title,value]of [['Referencia histórica',o=>money(o.total)],['Estado',o=>statusNames[o.status]],['Gráfica dedicada',o=>o.hasDedicatedGpu?'Incluida':'No incluida'],['Piezas sin precio',o=>String(o.missingPrices)],['Por qué aparece',o=>o.rankReason]]){const tr=node('tr');tr.append(node('th',title));for(const option of options)tr.append(node('td',value(option)));table.append(tr);}
 $('#results-comparison').replaceChildren(table);
}

form.addEventListener('submit',async event=>{
 event.preventDefault();const current=++revision;rememberNeeds();const submit=form.querySelector('button[type=submit]')||form.querySelector('button:not([type=button])');submit.disabled=true;$('#advisor-status').textContent='Revisando las propuestas de referencia…';
 try{
  const input=Object.fromEntries(new FormData(form));input.budget=Number(input.budget);const result=await api('/api/advice',{method:'POST',body:JSON.stringify(input)});
  if(current!==revision)return;
  /* El título ya dice presupuesto y uso; no se repite en un resumen aparte. */
  $('#results-title').textContent=`Con ${money(result.budget)} para ${useVerb[result.purpose]}: ${result.options.length} ${result.options.length===1?'opción':'opciones'}`;comparison(result.options);
  $('#advice-notice').textContent=`Comparamos ${result.templateCount} equipos de referencia. ${result.notice}`;$('#advice-options').replaceChildren();
  for(const [index,option]of result.options.entries()){
   const card=node('article');card.className='advice-card';const top=node('div');top.className='advice-card-top';top.append(node('span',`Opción ${index+1}`));const badge=node('span',statusNames[option.status]||'Por revisar');badge.className='advice-state '+option.status;top.append(badge);card.append(top);
   const images=node('div');images.className='option-photos';for(const part of option.parts.filter(p=>[10,11,1].includes(p.category_id)).slice(0,3)){const img=node('img');img.src=part.image;img.alt=part.name;images.append(img);}card.append(images,node('h3',option.title),node('strong',money(option.total)),node('small',option.missingPrices?'Suma parcial: faltan precios':'Suma de referencias históricas'),node('p',option.budgetDifference===null?'Costo completo pendiente':option.budgetDifference>=0?'Margen de referencia: '+money(option.budgetDifference):'Por encima de tu referencia: '+money(Math.abs(option.budgetDifference))));
   card.append(node('p',option.rankReason));const reasons=node('ul');for(const reason of option.reasons)reasons.append(node('li',reason));card.append(reasons);
   const details=node('details');details.append(node('summary','Piezas y puntos por confirmar'));const list=node('ul');for(const part of option.parts)list.append(node('li',part.name));details.append(list);for(const caution of option.cautions)details.append(node('p',caution));card.append(details);
   const save=node('button','Revisar y guardar esta opción');save.type='button';save.onclick=()=>{try{sessionStorage.setItem('fenixa-catalog-picks',JSON.stringify(option.componentIds));sessionStorage.setItem('criterio-advice',JSON.stringify({title:'Mi decisión: '+option.title,purpose:result.purpose,budget:result.budget,notes:['Necesidades: '+(result.programs||'Sin programas especificados'),...option.reasons,...option.cautions].join('\n')}));location.assign('/dashboard');}catch{$('#advisor-status').textContent='No se pudo conservar el borrador. Revisa el almacenamiento del navegador.';}};card.append(save);$('#advice-options').append(card);
  }
  $('#advice-results').hidden=false;$('#advisor-status').textContent='Opciones preparadas. Revisa sus razones y límites.';$('#advice-results').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 }catch(error){if(current===revision)$('#advisor-status').textContent=error.message;}finally{submit.disabled=false;}
});
// Equipo de ejemplo de la portada: sigue tu presupuesto y tu uso.
// Pregunta al mismo asesor del servidor y muestra su primera opción, con piezas y precios reales del catálogo.
const partOrder=[10,1,11,2,3,14,12,13,15,16];
let catalogBuilds=[],stageTimer=0,stageWait=0,stageRequest=0;
function scheduleStage(){clearTimeout(stageWait);stageWait=setTimeout(showStage,250);}
async function showStage(){
 if(!catalogBuilds.length)return;
 const purpose=form.elements.purpose.value,budget=Number(form.elements.budget.value),request=++stageRequest;let build=null;
 if(budget>=100000&&budget<=100000000){try{const result=await api('/api/advice',{method:'POST',body:JSON.stringify({budget,purpose})});const pick=result.options.find(o=>purpose!=='juegos'||o.hasDedicatedGpu)||result.options[0];build=catalogBuilds.find(b=>b.id===pick?.id);}catch{}}
 if(request!==stageRequest)return;
 build||=catalogBuilds.find(b=>b.use===purpose)||catalogBuilds[0];
 const parts=[...build.parts].sort((a,b)=>partOrder.indexOf(a.category_id)-partOrder.indexOf(b.category_id));if(!parts.length)return;
 const stage={name:build.name,total:build.total,fits:budget>=100000?build.total<=budget:null,budget};
 const paint=()=>{
  const box=$('#stage-parts');box.replaceChildren();
  const [chassis,...rest]=parts;
  for(const [i,p] of [chassis,...rest.slice(0,4)].entries()){
   const item=node('div');item.className=i===0?'stage-part is-main':'stage-part';item.style.setProperty('--i',i);
   const img=node('img');img.src=p.image;img.alt='';img.decoding='async';
   const text=node('div');text.append(node('small',p.category),node('span',p.name),node('b',p.reference_price?money(p.reference_price):'Sin precio'));
   item.append(img,text);box.append(item);
  }
  const extra=parts.length-5;if(extra>0){const more=node('p',`+ ${extra} ${extra===1?'pieza':'piezas'} más: ${rest.slice(4).map(p=>p.category.toLowerCase()).join(', ')}`);more.className='stage-more';box.append(more);}
  const priced=parts.filter(p=>p.reference_price>0);
  $('#stage-name').textContent=stage.name;$('#stage-label').textContent=stage.fits===null?'Equipo de ejemplo para '+useVerb[purpose]:stage.fits?`Para ${useVerb[purpose]} con ${money(stage.budget)}`:`La más cercana para ${useVerb[purpose]} · se pasa ${money(stage.total-stage.budget)}`;
  $('#stage-total').textContent=money(priced.reduce((sum,p)=>sum+p.reference_price,0))+(priced.length<parts.length?' (parcial)':'');
  $('#build-stage').classList.remove('is-leaving');
 };
 clearTimeout(stageTimer);
 if(!$('#stage-parts').children.length||matchMedia('(prefers-reduced-motion: reduce)').matches){paint();return;}
 $('#build-stage').classList.add('is-leaving');stageTimer=setTimeout(paint,140);
}
try{catalogBuilds=await api('/api/builds');const totals=catalogBuilds.map(b=>b.total);$('#hero-facts').textContent=`${catalogBuilds.length} builds completas · de ${money(Math.min(...totals))} a ${money(Math.max(...totals))} · precios de referencia, no de hoy`;showStage();}catch{$('#build-stage').hidden=true;}
