// A follow-up review is deliberately ephemeral: reloading starts a fresh demo.
// Do not even access browser-storage getters while this isolated mode is active.
export const isFollowupDemo=new URLSearchParams(globalThis.location?.search||'').get('demo')==='followup';

function memoryStorage(){
 const values=new Map();
 return {
  getItem(key){return values.get(String(key))??null;},
  setItem(key,value){values.set(String(key),String(value));},
  removeItem(key){values.delete(String(key));}
 };
}

function browserStorage(name,required=false){
 try{return globalThis[name];}
 catch(error){
  // View preferences are optional. Business failures must reach bootstrap's
  // existing error message instead of rejecting this module's initial import.
  if(!required)return undefined;
  const unavailable=()=>{throw error;};
  return {getItem:unavailable,setItem:unavailable,removeItem:unavailable};
 }
}

export const businessStorage=isFollowupDemo?memoryStorage():browserStorage('localStorage',true);
export const viewStorage=isFollowupDemo?memoryStorage():browserStorage('sessionStorage');
