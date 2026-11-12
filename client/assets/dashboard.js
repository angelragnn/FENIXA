import { api } from './api.js';
import { checkPart, asPart } from './compatibility.js';
import { deleteDecision } from './decision-actions.js';
const $=selector=>document.querySelector(selector);
const form=$('#proposal-form');
const money=value=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(value);
const node=(tag,text)=>{const element=document.createElement(tag);if(text!==undefined)element.textContent=text;return element;};
function button(text,action){const element=node('button',text);element.type='button';element.className='secondary';element.onclick=action;return element;}
let selected=null,generation=0,allComponents=[],builds=[],legacyIds=[],decisions=[],userId=null,baseline='',dirty=false,busy=false;
const draftKey=()=>`criterio-draft:${userId}`;
// Solo builds enteras: las piezas salen de la build marcada. "legacy" conserva una selección antigua pieza por pieza.
function chosenIds(){const radio=form.querySelector('[name=build]:checked');if(!radio)return [];if(radio.value==='legacy')return [...legacyIds];return [...(builds.find(b=>b.id===radio.value)?.componentIds||[])];}
const values=()=>({title:form.elements.title.value,purpose:form.elements.purpose.value,budget:form.elements.budget.value,notes:form.elements.notes.value,componentIds:chosenIds()});
const fingerprint=()=>JSON.stringify(values());
function message(text){$('#feedback').textContent=text;}
function removeDraft(){try{if(userId)sessionStorage.removeItem(draftKey());}catch{}$('#draft-notice').hidden=true;}
function markClean(){baseline=fingerprint();dirty=false;$('#save-state').textContent=selected?'Guardada en tu cuenta':'Aún no guardada';$('#save-state').classList.remove('is-dirty');}
function trackChanges(){
 dirty=fingerprint()!==baseline;$('#save-state').textContent=dirty?'Cambios sin guardar':selected?'Guardada en tu cuenta':'Aún no guardada';$('#save-state').classList.toggle('is-dirty',dirty);
 if(dirty&&userId){try{sessionStorage.setItem(draftKey(),JSON.stringify({version:1,userId,id:selected,values:values(),savedAt:Date.now()}));}catch{message('Los cambios aún no están guardados. El navegador no permite conservar el borrador local.');}}else if(userId){removeDraft();}
}
function mayLeave(){if(busy){message('Espera a que termine el guardado.');return false;}if(dirty){if(!confirm('Tienes cambios sin guardar. ¿Quieres descartarlos y continuar?'))return false;removeDraft();dirty=false;}return true;}
function setBusy(value){busy=value;for(const control of form.querySelectorAll('input,select,textarea,button'))control.disabled=value;$('#new').disabled=value;}
function locationFor(id){const url=new URL(location.href);if(id)url.searchParams.set('decision',id);else url.searchParams.delete('decision');history.replaceState(null,'',url.pathname+url.search);}
function reset(){generation++;selected=null;form.reset();legacyIds=[];renderBuilds();$('#editor-title').textContent='Nueva propuesta';$('#attachments').hidden=true;$('#cancel').hidden=true;$('#compatibility').textContent='';locationFor(null);referenceTotal();markClean();}
const sameIds=(a,b)=>a.length===b.length&&a.every(id=>b.includes(id));
const buildTotal=build=>build.componentIds.reduce((sum,id)=>sum+(allComponents.find(p=>p.id===id)?.reference_price||0),0);
function renderBuilds(checked=form.querySelector('[name=build]:checked')?.value){
 const budget=Number(form.elements.budget.value);const box=$('#builds');box.replaceChildren();
 const option=(value,title,detail,price,image,fit)=>{const label=node('label');label.className='build-option';const input=node('input');input.type='radio';input.name='build';input.value=value;input.checked=value===checked;const img=node('img');img.alt='';img.decoding='async';if(image)img.src=image;const text=node('span');text.append(node('strong',title),node('small',detail));if(fit){const note=node('small',fit.text);note.className='build-fit'+(fit.over?' is-over':'');text.append(note);}label.append(input,img,text,node('b',price));box.append(label);};
 if(legacyIds.length)option('legacy','Selección anterior pieza por pieza',`${legacyIds.length} piezas elegidas antes del cambio a builds completas.`,'—',allComponents.find(p=>legacyIds.includes(p.id)&&p.category_id===10)?.image);
 for(const build of [...builds].sort((a,b)=>buildTotal(a)-buildTotal(b))){const total=buildTotal(build);const fit=budget>0?(total<=budget?{text:`Cabe en tu presupuesto · sobran ${money(budget-total)}`}:{text:`Se pasa ${money(total-budget)} de tu presupuesto`,over:true}):null;option(build.id,build.name,build.short||build.description,money(total),allComponents.find(p=>p.id===build.componentIds[0])?.image,fit);}
}
function chooseParts(ids){const build=builds.find(b=>sameIds(b.componentIds,ids));legacyIds=ids.length&&!build?[...ids]:[];renderBuilds(build?build.id:legacyIds.length?'legacy':undefined);referenceTotal();}
function applyValues(input){for(const key of ['title','purpose','budget','notes'])form.elements[key].value=input[key]??'';chooseParts(input.componentIds||[]);}
const normalized=value=>String(value).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
function renderList(){
 const query=normalized($('#decision-search').value.trim());const order=$('#decision-sort').value;
 const rows=decisions.filter(row=>normalized(row.title+' '+row.notes).includes(query));
 rows.sort((a,b)=>order==='name'?a.title.localeCompare(b.title):order==='budget-low'?a.budget-b.budget:order==='budget-high'?b.budget-a.budget:b.updated_at.localeCompare(a.updated_at));
 $('#count').textContent=`${decisions.length} ${decisions.length===1?'propuesta guardada':'propuestas guardadas'}`;$('#decision-results').textContent=`${rows.length} de ${decisions.length} decisiones`;
 $('#list').replaceChildren();
 if(!rows.length){$('#list').append(node('p',decisions.length?'No hay decisiones con esa búsqueda. Prueba otro nombre o una palabra de tus notas.':'Todavía no tienes decisiones. Comienza con el asesor o guarda una propuesta.'));return;}
 for(const row of rows){
  const card=node('article');card.className='proposal';card.append(node('span',({estudio:'Estudio',trabajo:'Trabajo y creación',juegos:'Juegos'})[row.purpose]),node('h3',row.title),node('strong',money(row.budget)),node('p',row.notes?row.notes.slice(0,180)+(row.notes.length>180?'…':''):'Sin notas por ahora.'));
  card.append(node('small','Actualizada: '+new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeZone:'America/Bogota'}).format(new Date(row.updated_at))));
  const actions=node('div');actions.className='actions';actions.append(button('Abrir propuesta',()=>open(row.id)),button('Copiar enlace',async()=>{try{const url=new URL('/dashboard',location.origin);url.searchParams.set('decision',row.id);await navigator.clipboard.writeText(url.href);message('Enlace copiado. Para abrirlo hace falta entrar con tu cuenta.');}catch{message('Abre la propuesta y copia la dirección del navegador. El enlace sigue protegido por tu cuenta.');}}));card.append(actions);$('#list').append(card);
 }
}
async function list(){decisions=await api('/api/proposals');renderList();}
async function open(id,{check=true}={}){
 if(check&&!mayLeave())return;const version=++generation;message('Abriendo propuesta…');
 try{
  const row=await api(`/api/proposals/${id}`);if(version!==generation)return;selected=id;
  applyValues({...row,budget:String(row.budget)});$('#compatibility').textContent=row.compatibility.join(' ');$('#editor-title').textContent='Editar propuesta';$('#cancel').hidden=false;$('#attachments').hidden=false;locationFor(id);markClean();
  await details(id,version);if(version===generation)message('Propuesta abierta. Puedes editarla o adjuntar un documento.');
 }catch(error){if(version===generation)message(error.message);}
}
async function details(id,version=generation){
 const [files,history]=await Promise.all([api(`/api/proposals/${id}/files`),api(`/api/proposals/${id}/history`)]);if(version!==generation)return;
 $('#files').replaceChildren();$('#history').replaceChildren();
 for(const file of files){const li=node('li');const a=node('a',`${file.kind==='snapshot'?'Versión guardada':file.name} · ${Math.ceil(file.size/1024)} KB`);a.href=`/api/files/${file.id}`;a.setAttribute('download','');li.append(a,node('small',new Date(file.created_at).toLocaleString('es-CO')));$('#files').append(li);}
 for(const entry of history)$('#history').append(node('li',`${entry.action} · ${new Date(entry.created_at).toLocaleString('es-CO')}`));
}
function referenceTotal(){
 const ids=values().componentIds;const pieces=allComponents.filter(p=>ids.includes(p.id));const known=pieces.filter(p=>p.reference_price>0);
 $('#reference-total').textContent=pieces.length?`Suma de referencias históricas: ${money(known.reduce((sum,p)=>sum+p.reference_price,0))}. ${pieces.length-known.length} piezas sin precio. No incluye envío ni confirma precios actuales.`:'';renderOverview(pieces);
}
function renderOverview(pieces){
 const order=[10,1,2,11,3,14,12,13,15,16];const build=builds.find(b=>sameIds(b.componentIds,pieces.map(p=>p.id)));
 $('#build-progress').textContent=pieces.length?`${build?build.name:'Selección anterior'}: ${pieces.length} piezas`:'Elige una build para ver sus piezas';$('#piece-overview').replaceChildren();
 for(const piece of [...pieces].sort((a,b)=>order.indexOf(a.category_id)-order.indexOf(b.category_id))){const item=node('div');
  if(piece.image){const img=node('img');img.src=piece.image;img.alt='';item.append(img);}else item.append(node('span',''));
  const text=node('span');text.append(node('small',piece.category),node('strong',piece.name));item.append(text);$('#piece-overview').append(item);
 }
 $('#fit-review').replaceChildren();for(const piece of pieces){const fit=checkPart(asPart(piece),pieces.filter(p=>p.category_id!==piece.category_id).map(asPart));if(fit.status==='conflict'||fit.matched){const detail=node('details');detail.append(node('summary',`${piece.name}: ${fit.label}`),node('p',fit.reason));$('#fit-review').append(detail);}}
}
form.addEventListener('input',event=>{if(event.target.name==='budget')renderBuilds();trackChanges();});
form.addEventListener('change',event=>{
 if(event.target.name==='build'){const build=builds.find(b=>b.id===event.target.value);if(build){if(!form.elements.title.value.trim())form.elements.title.value=build.name;if(!form.elements.notes.value.trim())form.elements.notes.value=[build.description,...build.notes||[]].join('\n');}}
 referenceTotal();trackChanges();
});
form.addEventListener('submit',async event=>{
 event.preventDefault();const input=values();if(!input.componentIds.length){message('Elige una build completa antes de guardar.');$('#builds').scrollIntoView({behavior:'smooth',block:'center'});return;}input.budget=Number(input.budget);const id=selected;setBusy(true);message('Guardando propuesta…');
 try{const row=await api(id?`/api/proposals/${id}`:'/api/proposals',{method:id?'PUT':'POST',body:JSON.stringify(input)});removeDraft();dirty=false;await list();await open(row.id,{check:false});message('Propuesta guardada. También se creó una versión descargable en JSON.');}
 catch(error){message(error.message);}finally{setBusy(false);}
});
$('#decision-search').addEventListener('input',renderList);$('#decision-sort').addEventListener('change',renderList);
$('#new').onclick=()=>{if(mayLeave()){reset();form.elements.title.focus();}};$('#cancel').onclick=()=>{if(mayLeave())reset();};
$('#delete').onclick=()=>deleteDecision({id:selected,busy,dirty,ask:prompt=>confirm(prompt),remove:id=>api(`/api/proposals/${id}`,{method:'DELETE'}),onDeleted:async()=>{removeDraft();reset();await list();message('Propuesta eliminada.');},onError:message});
$('#upload-form').addEventListener('submit',async event=>{
 event.preventDefault();const uploadForm=event.currentTarget;const submit=uploadForm.querySelector('button');submit.disabled=true;const id=selected,version=generation;
 try{message('Subiendo documento…');await api(`/api/proposals/${id}/files`,{method:'POST',body:new FormData(uploadForm)});await details(id,version);if(version===generation){uploadForm.reset();message('Documento guardado y asociado a tu propuesta.');}}catch(error){if(version===generation)message(error.message);}finally{submit.disabled=false;}
});
$('#logout').onclick=async()=>{if(!mayLeave())return;try{await api('/api/auth/logout',{method:'POST'});removeDraft();dirty=false;location.replace('/login');}catch(error){message(error.message);}};
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
document.addEventListener('click',event=>{const a=event.target.closest?.('a');if(!a||a.hasAttribute('download')||a.target==='_blank'||event.ctrlKey||event.metaKey||!dirty)return;const url=new URL(a.href,location.href);if(url.pathname.startsWith('/api/files/'))return;if(!mayLeave())event.preventDefault();});
function readDraft(){try{const draft=JSON.parse(sessionStorage.getItem(draftKey())||'null');if(draft?.version===1&&draft.userId===userId&&draft.values&&typeof draft.values.title==='string'&&draft.values.title.length<=100&&typeof draft.values.notes==='string'&&draft.values.notes.length<=4000&&['estudio','trabajo','juegos'].includes(draft.values.purpose)&&Array.isArray(draft.values.componentIds)&&draft.values.componentIds.every(Number.isSafeInteger))return draft;}catch{}return null;}
$('#discard-draft').onclick=()=>{removeDraft();message('Borrador local descartado. Las decisiones guardadas siguen en tu cuenta.');};
$('#recover-draft').onclick=async()=>{const draft=readDraft();if(!draft||!mayLeave())return;const validId=draft.id&&decisions.some(row=>row.id===draft.id);if(validId)await open(draft.id,{check:false});else reset();applyValues(draft.values);selected=validId?draft.id:null;$('#draft-notice').hidden=true;trackChanges();message('Borrador recuperado. Pulsa Guardar propuesta para guardarlo en tu cuenta.');};
try{
 const user=await api('/api/auth/me');userId=user.id;$('#greeting').textContent=`Hola, ${user.name}`;allComponents=await api('/api/components');
 builds=await api('/api/reference-builds');renderBuilds();
 referenceTotal();markClean();await list();
 const directId=new URL(location.href).searchParams.get('decision');if(directId&&/^[a-f0-9-]{36}$/.test(directId))await open(directId,{check:false});
 let incoming=false;try{const advice=JSON.parse(sessionStorage.getItem('criterio-advice')||'null');if(advice){reset();applyValues({...advice,componentIds:[]});sessionStorage.removeItem('criterio-advice');incoming=true;}const picks=JSON.parse(sessionStorage.getItem('fenixa-catalog-picks')||'[]');if(Array.isArray(picks)&&picks.length){chooseParts(picks);sessionStorage.removeItem('fenixa-catalog-picks');incoming=true;}}catch{}
 if(incoming){trackChanges();message('Tu propuesta está preparada como borrador. Revísala y guárdala en tu cuenta.');}else $('#draft-notice').hidden=!readDraft();
}catch(error){message(error.message);}
