import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteDecision } from '../client/assets/decision-actions.js';

test('cancelar la eliminación conserva la edición y no envía DELETE', async () => {
  const calls=[];
  const result=await deleteDecision({id:'propuesta',busy:false,dirty:true,
    ask:message=>{calls.push(['confirm',message]);return false;},
    remove:()=>calls.push('DELETE'),onDeleted:()=>calls.push('limpiar borrador'),onError:()=>calls.push('error')});
  assert.equal(result,false);
  assert.equal(calls.length,1);
  assert.match(calls[0][1],/Eliminar.*cambios sin guardar/);
});

test('un fallo del servidor conserva el borrador y muestra el error', async () => {
  const calls=[];
  const result=await deleteDecision({id:'propuesta',busy:false,dirty:true,ask:()=>true,
    remove:async()=>{throw Error('Sin conexión');},onDeleted:()=>calls.push('limpiar borrador'),onError:message=>calls.push(message)});
  assert.equal(result,false);
  assert.deepEqual(calls,['Sin conexión']);
});

test('elimina con una sola confirmación y limpia después de recibir éxito', async () => {
  const calls=[];
  const result=await deleteDecision({id:'propuesta',busy:false,dirty:true,
    ask:()=>{calls.push('confirmar');return true;},remove:async id=>{calls.push('DELETE '+id);},
    onDeleted:()=>calls.push('limpiar borrador'),onError:message=>calls.push(message)});
  assert.equal(result,true);
  assert.deepEqual(calls,['confirmar','DELETE propuesta','limpiar borrador']);
});

test('un guardado en curso o una propuesta ausente no permiten borrar', async () => {
  let requests=0,confirmations=0;
  const common={dirty:false,ask:()=>{confirmations++;return true;},remove:()=>{requests++;},onDeleted:()=>{},onError:()=>{}};
  assert.equal(await deleteDecision({...common,id:'propuesta',busy:true}),false);
  assert.equal(await deleteDecision({...common,id:null,busy:false}),false);
  assert.equal(requests,0);
  assert.equal(confirmations,0);
});
