import {api} from './api.js';
const $=s=>document.querySelector(s);
const make=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const money=v=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v);
const labels={architecture:'Arquitectura',cores:'Núcleos',threads:'Hilos',base:'Frecuencia base (GHz)',boost:'Turbo (GHz)',l3:'Caché L3 (MB)',tdp:'TDP (W)',socket:'Socket',memory:'Tipo de memoria',graphics:'Gráficos integrados',pcie:'Interfaz PCIe',lanes:'Líneas PCIe',requiresGpu:'Requiere gráfica dedicada',capacity:'Capacidad (GB)',rate:'Velocidad de memoria (MT/s)',vram:'Memoria de video (GB)',format:'Formato',dimensions:'Dimensiones',slots:'Ranuras de memoria',maxRam:'RAM máxima (GB)',chipset:'Chipset',wattage:'Potencia (W)',efficiency:'Certificación',modular:'Cableado modular',warranty:'Garantía',read:'Lectura (MB/s)',write:'Escritura (MB/s)',thermal:'Refrigeración',boardForm:'Formato de placa',protections:'Protecciones',connectors:'Conectores',gpuMax:'Longitud máxima GPU (mm)',coolerMax:'Altura máxima disipador (mm)',placement:'Instalación'};
const display=value=>typeof value==='boolean'?(value?'Sí':'No'):typeof value==='object'?JSON.stringify(value):String(value);
let products=[], limit=24;const compared=new Set();
function action(label,callback){const b=make('button',label);b.type='button';b.className='secondary';b.onclick=callback;return b;}
function safeLink(url,label){try{const u=new URL(url);if(!['http:','https:'].includes(u.protocol))return make('span','Fuente no disponible');const a=make('a',label);a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';return a;}catch{return make('span','Fuente no disponible');}}
function render(){
 const q=$('#search').value.trim().toLowerCase(),category=Number($('#category').value);
 let rows=products.filter(p=>(!category||p.category_id===category)&&`${p.name} ${p.summary} ${p.sku}`.toLowerCase().includes(q));
 const sort=$('#sort').value;rows.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='low'?(a.price_min??Infinity)-(b.price_min??Infinity):(b.price_min??0)-(a.price_min??0));
 $('#result-count').textContent=`${rows.length} componentes`;$('#grid').replaceChildren();
 if(!rows.length){const empty=make('p','No hay piezas con esa búsqueda. Prueba otra palabra o cambia la categoría.');empty.className='muted';$('#grid').append(empty);}
 for(const p of rows.slice(0,limit)){
  const card=make('article');card.className='panel catalog-card';
  if(p.image){const img=make('img');img.src=p.image;img.alt=p.name;img.loading='lazy';img.width=400;img.height=260;card.append(img);}
  card.append(make('span',p.category),make('h2',p.name),make('p',p.summary));
  const price=make('strong',p.price_min?`${money(p.price_min)}${p.price_max>p.price_min?' – '+money(p.price_max):''}`:'Precio por confirmar');card.append(price,make('small','Referencia histórica · confirma precio y disponibilidad.'));
  const buttons=make('div');buttons.className='actions';buttons.append(action(compared.has(p.id)?'Quitar comparación':'Comparar',()=>{
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
 $('#more').hidden=rows.length<=limit;
}
$('#compare').onclick=()=>{
 const rows=products.filter(p=>compared.has(p.id));const table=make('table');const header=make('tr');header.append(make('th','Característica'));for(const p of rows)header.append(make('th',p.name));table.append(header);
 const keys=new Set(rows.flatMap(p=>Object.keys(p.specs?.values||{})));
 for(const key of ['Referencia COP',...keys]){const tr=make('tr');tr.append(make('th',labels[key]||key));for(const p of rows){const v=key==='Referencia COP'?(p.price_min?money(p.price_min):'Sin referencia'):p.specs?.values?.[key];tr.append(make('td',v===undefined||v===null?'Sin dato':display(v)));}table.append(tr);}
 $('#comparison').replaceChildren(table);$('#dialog').showModal();
};
$('#close').onclick=()=>$('#dialog').close();$('#more').onclick=()=>{limit+=24;render();};
for(const id of ['#search','#category','#sort'])$(id).addEventListener(id==='#search'?'input':'change',()=>{limit=24;render();});
try{
 products=await api('/api/catalog');
 for(const [id,name]of new Map(products.map(p=>[p.category_id,p.category]))){const o=make('option',name);o.value=id;$('#category').append(o);}render();$('#status').textContent='Catálogo original cargado desde MySQL.';
}catch(error){$('#status').textContent=error.message;}
