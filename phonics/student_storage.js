(function(global){
  'use strict';
  const STUDENT_KEY='phonics_student_id';
  const SEP='::student::';

  function studentId(){
    try{return (localStorage.getItem(STUDENT_KEY)||'').trim()}catch(e){return ''}
  }
  function setStudentId(id){
    const v=String(id||'').trim();
    try{localStorage.setItem(STUDENT_KEY,v)}catch(e){}
    return v;
  }
  function scopedKey(base,id){
    const sid=String(id===undefined?studentId():id||'').trim()||'guest';
    return String(base)+SEP+sid;
  }
  function getJSON(base,fallback,id){
    try{
      const raw=localStorage.getItem(scopedKey(base,id));
      return raw===null?fallback:JSON.parse(raw);
    }catch(e){return fallback}
  }
  function setJSON(base,value,id){
    try{localStorage.setItem(scopedKey(base,id),JSON.stringify(value));return true}catch(e){return false}
  }
  function getText(base,fallback='',id){
    try{const v=localStorage.getItem(scopedKey(base,id));return v===null?fallback:v}catch(e){return fallback}
  }
  function setText(base,value,id){
    try{localStorage.setItem(scopedKey(base,id),String(value??''));return true}catch(e){return false}
  }
  function remove(base,id){try{localStorage.removeItem(scopedKey(base,id))}catch(e){}}
  function markVisited(moduleId,title,id){
    const v=getJSON('phonics_hub_visited_v1',{},id)||{};
    v[moduleId]={time:Date.now(),title:title||moduleId};
    setJSON('phonics_hub_visited_v1',v,id);
    setText('phonics_hub_last_v1',moduleId,id);
    return v;
  }
  function clearStudentLocal(id){
    const sid=String(id||studentId()||'').trim();
    if(!sid)return;
    const suffix=SEP+sid;
    try{
      const keys=[];
      for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.endsWith(suffix))keys.push(k)}
      keys.forEach(k=>localStorage.removeItem(k));
    }catch(e){}
  }

  global.PhonicsStorage={STUDENT_KEY,SEP,studentId,setStudentId,scopedKey,getJSON,setJSON,getText,setText,remove,markVisited,clearStudentLocal};
})(window);
