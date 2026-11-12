import {api} from './api.js';
// Catálogo de builds completas: ya no se listan componentes sueltos.
const $=s=>document.querySelector(s);
const make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v);
const useNames={estudio:'Estudio',trabajo:'Trabajo y creación',juegos:'Juegos'};
const rowsToCompare=[['Procesador',1],['Tarjeta gráfica',11],['Memoria RAM',3],['Almacenamiento',12],['Placa madre',2],['Fuente',13],['Refrigeración',14],['Gabinete',10]];
const partOrder=[10,1,11,2,3,14,12,13,15,16];
let builds=[];const compared=new Set();
function action(label,callback,className='secondary'){const b=make('button',label);b.type='button';if(className)b.className=className;b.onclick=callback;return b;}
function budgetValue(){const v=Number($('#budget').value);return Number.isFinite(v)&&v>=100000?v:0;}
function save(build){
 try{
  sessionStorage.setItem('fenixa-catalog-picks',JSON.stringify(build.componentIds));
  sessionStorage.setItem('criterio-advice',JSON.stringify({title:'Mi decisión: '+build.name,purpose:build.use,budget:String(budgetValue()||build.total),notes:[build.description,...build.notes].join('\n')}));
  location.assign('/dashboard');
 }catch{$('#status').textContent='El navegador no permite conservar la build elegida. Revisa el almacenamiento del navegador.';}
}
function fallback(category){return category===11?'Gráficos integrados':category===14?'Disipador incluido con el procesador':'—';}
function render(){
 const use=$('#use').value,budget=budgetValue(),sort=$('#sort').value;
 const rows=builds.filter(b=>!use||b.use===use).sort((a,b)=>sort==='high'?b.total-a.total:a.total-b.total);
 const fitting=budget?rows.filter(b=>b.total<=budget).length:null;
 $('#result-count').textContent=`${rows.length} ${rows.length===1?'build':'builds'}${fitting===null?'':` · ${fitting} caben en tu presupuesto`}`;
 $('#grid').replaceChildren();
 if(!rows.length){const empty=make('p','No hay builds para ese uso. Prueba con «Todos los usos».');empty.className='muted';$('#grid').append(empty);}
 for(const b of rows){
  const card=make('article');card.className='panel catalog-card build-card';card.classList.toggle('is-over',Boolean(budget&&b.total>budget));
  const cover=b.parts.find(p=>p.category_id===10);
  if(cover?.image){const img=make('img');img.src=cover.image;img.alt=`Gabinete de ${b.name}`;img.loading='lazy';img.width=400;img.height=260;card.append(img);}
  card.append(make('span',useNames[b.use]||'General'),make('h2',b.name),make('p',b.short||b.description));
  card.append(make('strong',money(b.total)+(b.missingPrices?' (parcial)':'')));
  card.append(make('small',budget?(b.total<=budget?`Cabe en tu presupuesto · sobran ${money(budget-b.total)}`:`Se pasa ${money(b.total-budget)} de tu presupuesto`):`Suma de referencia de ${b.parts.length} piezas · sin envío`));
  const buttons=make('div');buttons.className='actions';
  buttons.append(action('Guardar esta build',()=>save(b),''),action(compared.has(b.id)?'Quitar comparación':'Comparar',()=>{
   if(compared.has(b.id))compared.delete(b.id);
   else{if(compared.size===3){$('#status').textContent='Puedes comparar hasta tres builds.';return;}compared.add(b.id);}
   $('#status').textContent=`${compared.size} ${compared.size===1?'build':'builds'} para comparar.`;$('#compare').disabled=compared.size<2;render();
  }));
  card.append(buttons);
  const details=make('details');details.append(make('summary',`Ver sus ${b.parts.length} piezas`));
  const list=make('ul');list.className='build-parts';
  for(const p of [...b.parts].sort((x,y)=>partOrder.indexOf(x.category_id)-partOrder.indexOf(y.category_id))){
   const li=make('li');const img=make('img');img.alt='';img.loading='lazy';if(p.image)img.src=p.image;
   const text=make('span');text.append(make('small',p.category),make('strong',p.name));
   li.append(img,text,make('b',p.reference_price?money(p.reference_price):'Sin precio'));list.append(li);
  }
  details.append(list,make('p',b.description));for(const note of b.notes)details.append(make('p',note));
  card.append(details);$('#grid').append(card);
 }
}
$('#compare').onclick=()=>{
 const rows=builds.filter(b=>compared.has(b.id));const table=make('table');const header=make('tr');header.append(make('th','Qué estás comparando'));for(const b of rows)header.append(make('th',b.name));table.append(header);
 const line=(label,value)=>{const tr=make('tr');tr.append(make('th',label));for(const b of rows)tr.append(make('td',value(b)));table.append(tr);};
 line('Precio de referencia',b=>money(b.total));
 line('Uso',b=>useNames[b.use]||'General');
 line('Gráfica dedicada',b=>b.hasDedicatedGpu?'Incluida':'No incluida');
 for(const [label,category] of rowsToCompare)line(label,b=>b.parts.find(p=>p.category_id===category)?.name||fallback(category));
 $('#comparison').replaceChildren(table);$('#dialog').showModal();
};
$('#close').onclick=()=>$('#dialog').close();
for(const id of ['#use','#sort'])$(id).addEventListener('change',render);
$('#budget').addEventListener('input',render);
try{builds=await api('/api/builds');render();$('#status').textContent='Builds completas cargadas desde MySQL.';}catch(error){$('#status').textContent=error.message;}
