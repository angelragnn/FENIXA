import {api} from './api.js';
// Catálogo de builds completas: ya no se listan componentes sueltos.
const $=s=>document.querySelector(s);
const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=text;if(cls)n.className=cls;return n;};
const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v);
const useNames={estudio:'Estudio',trabajo:'Trabajo y creación',juegos:'Juegos'};
const rowsToCompare=[['Procesador',1],['Tarjeta gráfica',11],['Memoria RAM',3],['Almacenamiento',12],['Placa madre',2],['Fuente',13],['Refrigeración',14],['Gabinete',10]];
const partOrder=[10,1,11,2,3,14,12,13,15,16];
const MAX=3,KEY='criterio-compare';
let builds=[],picks=[],onlyDiff=false;const cards=new Map();
function action(label,callback,className='secondary'){const b=make('button',label);b.type='button';if(className)b.className=className;b.onclick=callback;return b;}
function budgetValue(){const v=Number($('#budget').value);return Number.isFinite(v)&&v>=100000?v:0;}
const byId=id=>builds.find(b=>b.id===id);
const coverOf=b=>b.parts.find(p=>p.category_id===10);
function readPicks(){try{const v=JSON.parse(sessionStorage.getItem(KEY));return Array.isArray(v)?v:[];}catch{return [];}}
function writePicks(){try{sessionStorage.setItem(KEY,JSON.stringify(picks));}catch{/* sin almacenamiento: la selección dura solo esta carga */}}
function announce(text){$('#compare-live').textContent=text;}
function warn(text){$('#status').textContent=text;$('#dialog-msg').textContent=text;announce(text);}
function save(build){
 try{
  sessionStorage.setItem('fenixa-catalog-picks',JSON.stringify(build.componentIds));
  sessionStorage.setItem('criterio-advice',JSON.stringify({title:'Mi decisión: '+build.name,purpose:build.use,budget:String(budgetValue()||build.total),notes:[build.description,...build.notes].join('\n')}));
  location.assign('/dashboard');
 }catch{warn('El navegador no permite conservar la build elegida. Revisa el almacenamiento del navegador.');}
}
function fallback(category){return category===11?'Gráficos integrados':category===14?'Disipador incluido con el procesador':'—';}
/* ---- Selección: se actualiza sin recrear la grilla ---- */
function setPick(b,on){
 if(on&&!picks.includes(b.id)){if(picks.length>=MAX)return false;picks.push(b.id);}
 if(!on)picks=picks.filter(x=>x!==b.id);
 writePicks();sync();
 announce(`${b.name} ${on?'agregada a la comparación':'quitada de la comparación'}. ${picks.length} de ${MAX}.`);
 return true;
}
function sync(){
 const full=picks.length>=MAX;
 for(const [id,c] of cards){
  const on=picks.includes(id);
  c.card.classList.toggle('is-compared',on);
  c.input.checked=on;c.input.disabled=!on&&full;c.label.classList.toggle('is-disabled',!on&&full);
  c.text.textContent=on?'Quitar':'Comparar';
 }
 $('#compare-dock').hidden=!picks.length;
 $('#compare-count').textContent=`${picks.length}/${MAX}`;
 const note=$('#compare-note');note.hidden=!full;
 note.textContent=full?'Ya elegiste 3. Quita una para elegir otra.':'';
 $('#compare-fab').setAttribute('aria-label',`Comparaciones: ${picks.length} de ${MAX} elegidas. Abrir comparación`);
}
function render(){
 const use=$('#use').value,budget=budgetValue(),sort=$('#sort').value;
 const rows=builds.filter(b=>!use||b.use===use).sort((a,b)=>sort==='high'?b.total-a.total:a.total-b.total);
 const fitting=budget?rows.filter(b=>b.total<=budget).length:null;
 $('#result-count').textContent=`${rows.length} ${rows.length===1?'build':'builds'}${fitting===null?'':` · ${fitting} caben en tu presupuesto`}`;
 $('#grid').replaceChildren();cards.clear();
 if(!rows.length){const empty=make('p','No hay builds para ese uso. Prueba con «Todos los usos».');empty.className='muted';$('#grid').append(empty);}
 for(const b of rows){
  const card=make('article');card.className='panel catalog-card build-card';card.classList.toggle('is-over',Boolean(budget&&b.total>budget));
  const cover=coverOf(b);
  if(cover?.image){const img=make('img');img.src=cover.image;img.alt=`Gabinete de ${b.name}`;img.loading='lazy';img.decoding='async';img.width=400;img.height=190;card.append(img);}
  card.append(make('span',useNames[b.use]||'General'),make('h2',b.name),make('p',b.short||b.description));
  card.append(make('strong',money(b.total)+(b.missingPrices?' (parcial)':'')));
  card.append(make('small',budget?(b.total<=budget?`Cabe en tu presupuesto · sobran ${money(budget-b.total)}`:`Se pasa ${money(b.total-budget)} de tu presupuesto`):`Suma de referencia de ${b.parts.length} piezas · sin envío`));
  const buttons=make('div');buttons.className='actions';
  const label=make('label',undefined,'compare-check');
  const input=make('input');input.type='checkbox';input.setAttribute('aria-label',`Comparar ${b.name}`);
  const text=make('span','Comparar');
  label.append(input,make('span',undefined,'compare-box'),text);
  input.addEventListener('change',()=>{if(!setPick(b,input.checked))input.checked=false;});
  buttons.append(action('Guardar esta build',()=>save(b),''),label);
  card.append(buttons);
  const details=make('details');details.append(make('summary',`Ver sus ${b.parts.length} piezas`));
  const list=make('ul');list.className='build-parts';
  for(const p of [...b.parts].sort((x,y)=>partOrder.indexOf(x.category_id)-partOrder.indexOf(y.category_id))){
   const li=make('li');const img=make('img');img.alt='';img.loading='lazy';img.decoding='async';img.width=40;img.height=40;if(p.image)img.src=p.image;
   const t=make('span');t.append(make('small',p.category),make('strong',p.name));
   li.append(img,t,make('b',p.reference_price?money(p.reference_price):'Sin precio'));list.append(li);
  }
  details.append(list,make('p',b.description));for(const note of b.notes)details.append(make('p',note));
  card.append(details);$('#grid').append(card);
  cards.set(b.id,{card,input,label,text});
 }
 sync();
}
/* ---- Diálogo de comparación ---- */
function buildTable(rows){
 const budget=budgetValue(),cheapest=Math.min(...rows.map(b=>b.total));
 const table=make('table');table.classList.toggle('only-diff',onlyDiff&&rows.length>1);
 table.append(make('caption','Comparación de builds',  'sr-only'));
 const head=make('tr',undefined,'head-row');head.append(Object.assign(make('th','Qué se compara'),{scope:'col'}));
 for(const b of rows){
  const th=make('th');th.scope='col';const box=make('div',undefined,'col-head');
  const cover=coverOf(b);const img=make('img');img.alt='';img.width=44;img.height=44;if(cover?.image)img.src=cover.image;
  const info=make('div');info.append(make('strong',b.name),make('small',`${useNames[b.use]||'General'} · ${money(b.total)}`));
  const rm=action('×',()=>{setPick(b,false);refreshDialog();},'secondary col-remove');rm.setAttribute('aria-label',`Quitar ${b.name} de la comparación`);
  box.append(img,info,rm);th.append(box);head.append(th);
 }
 const thead=make('thead');thead.append(head);table.append(thead);
 const body=make('tbody');
 const line=(label,cell)=>{
  const cells=rows.map(cell);const tr=make('tr');
  const diff=rows.length>1&&new Set(cells.map(c=>c.text)).size>1;tr.classList.toggle('is-diff',diff);
  const th=make('th',label);th.scope='row';if(diff)th.append(make('span',' (cambia)','sr-only'));tr.append(th);
  for(const c of cells){const td=make('td',c.text);if(c.sub)td.append(make('small',c.sub));tr.append(td);}
  body.append(tr);
 };
 line('Precio total',b=>({text:money(b.total)+(b.missingPrices?' (parcial)':'')}));
 line('Frente a la más barata',b=>({text:b.total===cheapest?'La más barata':'+ '+money(b.total-cheapest)}));
 if(budget)line(`Cabe en ${money(budget)}`,b=>({text:b.total<=budget?'Sí':'No',sub:b.total<=budget?`Sobran ${money(budget-b.total)}`:`Se pasa ${money(b.total-budget)}`}));
 line('Uso',b=>({text:useNames[b.use]||'General'}));
 line('Gráfica dedicada',b=>({text:b.hasDedicatedGpu?'Incluida':'No incluida'}));
 for(const [label,category] of rowsToCompare)line(label,b=>{const p=b.parts.find(x=>x.category_id===category);return {text:p?.name||fallback(category),sub:p?(p.reference_price?money(p.reference_price):'Sin precio'):undefined};});
 const act=make('tr',undefined,'action-row');const ah=make('th','Siguiente paso');ah.scope='row';act.append(ah);
 for(const b of rows){const td=make('td');td.append(action('Guardar esta build',()=>save(b),''));act.append(td);}
 body.append(act);table.append(body);return table;
}
function refreshDialog(){
 const rows=picks.map(byId).filter(Boolean);
 if(!rows.length){$('#dialog').close();return;}
 $('#comparison').replaceChildren(buildTable(rows));
 $('#only-diff').disabled=rows.length<2;
 $('#dialog-msg').textContent=rows.length<2?'Elige otra build para ver las diferencias.':'';
 if($('#dialog').open)$('#dialog-title').focus({preventScroll:true});
}
function openCompare(){if(!picks.length)return;refreshDialog();$('#dialog').showModal();}
$('#compare-fab').onclick=openCompare;
$('#close').onclick=()=>$('#dialog').close();
$('#clear').onclick=()=>{picks=[];writePicks();sync();announce('Comparación vaciada.');$('#dialog').close();};
$('#only-diff').addEventListener('change',e=>{onlyDiff=e.target.checked;$('#comparison table')?.classList.toggle('only-diff',onlyDiff);});
$('#dialog').addEventListener('click',e=>{
 if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();
 if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();
});
$('#dialog').addEventListener('close',()=>{const f=$('#compare-fab');if(!f.closest('[hidden]'))f.focus();else (cards.values().next().value?.input)?.focus();});
for(const id of ['#use','#sort'])$(id).addEventListener('change',render);
$('#budget').addEventListener('input',render);
async function load(){
 $('#retry')?.remove();$('#grid').setAttribute('aria-busy','true');$('#status').textContent='Cargando builds…';
 try{
  builds=await api('/api/builds');
  picks=[...new Set(readPicks())].filter(byId).slice(0,MAX);writePicks();
  render();$('#status').textContent='Builds completas cargadas desde MySQL.';
 }
 catch(error){$('#status').textContent=error.message;const retry=action('Reintentar',load);retry.id='retry';$('#status').after(retry);}
 finally{$('#grid').removeAttribute('aria-busy');}
}
load();
