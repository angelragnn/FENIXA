import {api} from './api.js';
import {checkPart,asPart} from './compatibility.js';
const $=s=>document.querySelector(s);
const make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v);
const labels={architecture:'Arquitectura',cores:'Núcleos',threads:'Hilos',base:'Frecuencia base (GHz)',boost:'Turbo (GHz)',l3:'Caché L3 (MB)',tdp:'TDP (W)',socket:'Socket',memory:'Tipo de memoria',graphics:'Gráficos integrados',pcie:'Interfaz PCIe',lanes:'Líneas PCIe',requiresGpu:'Requiere gráfica dedicada',capacity:'Capacidad (GB)',rate:'Velocidad de memoria (MT/s)',vram:'Memoria de video (GB)',format:'Formato',dimensions:'Dimensiones',slots:'Ranuras de memoria',maxRam:'RAM máxima (GB)',chipset:'Chipset',wattage:'Potencia (W)',efficiency:'Certificación',modular:'Cableado modular',warranty:'Garantía',read:'Lectura (MB/s)',write:'Escritura (MB/s)',thermal:'Refrigeración',boardForm:'Formato de placa',protections:'Protecciones',connectors:'Conectores',gpuMax:'Longitud máxima GPU (mm)',coolerMax:'Altura máxima disipador (mm)',placement:'Instalación'};
const display=value=>typeof value==='boolean'?(value?'Sí':'No'):typeof value==='object'?JSON.stringify(value):String(value);
let products=[], limit=24;const compared=new Set();let picks=[];
try{const value=JSON.parse(sessionStorage.getItem('fenixa-catalog-picks')||'[]');if(Array.isArray(value))picks=value.filter(Number.isSafeInteger);}catch{}
function action(label,callback){const b=make('button',label);b.type='button';b.className='secondary';b.onclick=callback;return b;}
function persist(){try{sessionStorage.setItem('fenixa-catalog-picks',JSON.stringify(picks));}catch{$('#status').textContent='El navegador no permite conservar el borrador. Guarda tu build antes de salir.';}$('#selection').textContent=`Mi build: ${picks.length} piezas`;$('#continue').disabled=!picks.length;}
function safeLink(url,label){try{const u=new URL(url);if(!['http:','https:'].includes(u.protocol))return make('span','Fuente no disponible');const a=make('a',label);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return a;}catch{return make('span','Fuente no disponible');}}
function render(){
 const q=$('#search').value.trim().toLowerCase(),category=Number($('#category').value);
 let rows=products.filter(p=>(!category||p.category_id===category)&&`${p.name} ${p.summary} ${p.sku}`.toLowerCase().includes(q));
 const sort=$('#sort').value;rows.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='low'?(a.price_min??Infinity)-(b.price_min??Infinity):(b.price_min??0)-(a.price_min??0));
 $('#result-count').textContent=`${rows.length} componentes`;$('#grid').replaceChildren();
 for(const p of rows.slice(0,limit)){
  const card=make('article');card.className='panel catalog-card';card.classList.toggle('in-build',picks.includes(p.id));
  const rest=products.filter(row=>picks.includes(row.id)&&row.category_id!==p.category_id).map(asPart);const fit=checkPart(asPart(p),rest);
  if(p.image){const img=make('img');img.src=p.image;img.alt=p.name;img.loading='lazy';img.width=400;img.height=260;card.append(img);}
  card.append(make('span',p.category),make('h2',p.name),make('p',p.summary));
  const price=make('strong',p.price_min?`${money(p.price_min)}${p.price_max>p.price_min?' – '+money(p.price_max):''}`:'Precio por confirmar');card.append(price,make('small','Referencia histórica · confirma precio y disponibilidad.'));
  const badge=make('p',fit.label);badge.className='fit-badge '+fit.status;const fitDetails=make('details');fitDetails.append(make('summary',fit.label+' · Mi build'),make('p',fit.reason));card.append(fitDetails);
  const buttons=make('div');buttons.className='actions';buttons.append(action(picks.includes(p.id)?'Quitar de mi build':'Añadir a mi build',()=>{
   if(picks.includes(p.id))picks=picks.filter(id=>id!==p.id);
   else {if(fit.status==='conflict'){$('#status').textContent=fit.reason;return;}picks=[...picks.filter(id=>products.find(row=>row.id===id)?.category_id!==p.category_id),p.id];}persist();render();
  }),action(compared.has(p.id)?'Quitar comparación':'Comparar',()=>{
   if(compared.has(p.id))compared.delete(p.id);
   else {const first=products.find(row=>compared.has(row.id));if(first&&first.category_id!==p.category_id){$('#status').textContent='Compara piezas de la misma categoría.';return;}if(compared.size===3){$('#status').textContent='Puedes comparar hasta tres piezas.';return;}compared.add(p.id);}
   $('#status').textContent=`${compared.size} piezas para comparar.`;$('#compare').disabled=compared.size<2;render();
  }));card.append(buttons);
  const details=make('details');details.append(make('summary','Ficha, fuentes y ofertas históricas'),make('p',p.sku));
  const values=p.specs?.values||{};if(!Object.keys(values).length)details.append(make('p','Ficha técnica pendiente de ampliar.'));
  const dl=make('dl');for(const [key,value]of Object.entries(values)){dl.append(make('dt',labels[key]||key),make('dd',display(value)));}if(p.specs?.photo?.note)details.append(make('p',p.specs.photo.note));
  details.append(dl,safeLink(p.specs?.source||p.source,'Consultar fuente técnica'));
  for(const offer of p.offers||[]){const row=make('p');row.append(safeLink(offer.url,`${offer.store}: ${money(offer.price)} · ${String(offer.checkedAt||'sin fecha').slice(0,10)}`));details.append(row);}
  card.append(details);$('#grid').append(card);
 }
 $('#more').hidden=rows.length<=limit;renderTray();
}
function renderTray(){
 const tray=$('#build-tray');tray.replaceChildren();const chosen=products.filter(p=>picks.includes(p.id));const base=[1,2,3,12,13,10];const complete=base.filter(id=>chosen.some(p=>p.category_id===id)).length;
 tray.append(make('span','MI BUILD'),make('h2',`${complete} de 6 piezas de base`));const progress=make('progress');progress.max=6;progress.value=complete;progress.setAttribute('aria-label','Categorías de base elegidas');tray.append(progress,make('p','Procesador, placa, RAM, almacenamiento, fuente y gabinete. El avance cuenta elecciones; no garantiza compatibilidad.'));
 for(const p of chosen){const row=make('div');row.className='tray-part';const img=make('img');img.src=p.image;img.alt='';const copy=make('div');copy.append(make('small',p.category),make('strong',p.name));row.append(img,copy,action('Quitar',()=>{picks=picks.filter(id=>id!==p.id);persist();render();}));tray.append(row);}
 if(!chosen.length)tray.append(make('p','Elige tu primera pieza en el catálogo.'));
 const sum=chosen.reduce((total,p)=>total+(p.price_min||0),0);tray.append(make('h3',money(sum)),make('small','Suma de referencias históricas. Envío no incluido.'));
 const missingPrices=chosen.filter(p=>!p.price_min).length;if(missingPrices)tray.append(make('p',`${missingPrices} piezas sin precio de referencia.`));
 for(const id of base.filter(id=>!chosen.some(p=>p.category_id===id))){const name=products.find(p=>p.category_id===id)?.category;tray.append(action('Elegir '+name,()=>{$('#category').value=id;$('#search').value='';limit=24;render();$('#search').focus();}));}
 const go=action('Guardar en mi cuenta',()=>{persist();location.assign('/dashboard');});go.disabled=!chosen.length;go.className='';tray.append(go);
}
$('#compare').onclick=()=>{
 const rows=products.filter(p=>compared.has(p.id));const table=make('table');const header=make('tr');header.append(make('th','Característica'));for(const p of rows)header.append(make('th',p.name));table.append(header);
 const keys=new Set(rows.flatMap(p=>Object.keys(p.specs?.values||{})));
 for(const key of ['Referencia COP',...keys]){const tr=make('tr');tr.append(make('th',labels[key]||key));for(const p of rows){const v=key==='Referencia COP'?(p.price_min?money(p.price_min):'Sin referencia'):p.specs?.values?.[key];tr.append(make('td',v===undefined||v===null?'Sin dato':display(v)));}table.append(tr);}
 $('#comparison').replaceChildren(table);$('#dialog').showModal();
};
$('#close').onclick=()=>$('#dialog').close();$('#more').onclick=()=>{limit+=24;render();};
for(const id of ['#search','#category','#sort'])$(id).addEventListener(id==='#search'?'input':'change',()=>{limit=24;render();});
$('#continue').onclick=()=>{persist();location.assign('/dashboard');};
try{
 products=await api('/api/catalog');picks=picks.filter(id=>products.some(p=>p.id===id));persist();
 for(const [id,name]of new Map(products.map(p=>[p.category_id,p.category]))){const o=make('option',name);o.value=id;$('#category').append(o);}render();$('#status').textContent='Catálogo original cargado desde MySQL.';
}catch(error){$('#status').textContent=error.message;}
