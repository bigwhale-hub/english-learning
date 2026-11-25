(function(global){
  'use strict';
  const KEY='phonics_adaptive_v1';
  const STUDENT_KEY='phonics_student_id';
  const MAX_EVENTS=240;

  function now(){return Date.now()}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
  function load(){
    try{
      const x=JSON.parse(localStorage.getItem(KEY)||'{}');
      if(!x.version)x.version=1;
      if(!x.students)x.students={};
      return x;
    }catch(e){return {version:1,students:{}}}
  }
  function save(db){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){console.warn('adaptive save failed',e)}}
  function studentId(){try{return (localStorage.getItem(STUDENT_KEY)||'').trim()}catch(e){return ''}}
  function setStudent(id){try{localStorage.setItem(STUDENT_KEY,String(id||'').trim())}catch(e){}}
  function student(db,id){
    id=id||studentId()||'guest';
    db.students[id]=db.students[id]||{skills:{},events:[],createdAt:now()};
    db.students[id].skills=db.students[id].skills||{};
    db.students[id].events=db.students[id].events||[];
    return db.students[id];
  }
  function baseSkill(s,id,o){
    s.skills[id]=s.skills[id]||{
      id, label:o.label||id, url:o.url||'', module:o.module||'', mode:o.mode||'', group:o.group||'',
      score:0, needsPractice:false, teacherCheck:false, rounds:0, remedialRounds:0,
      independent:0, prompted:0, modeled:0, seen:0, know:0, again:0,
      lastTime:0, lastResult:'', lastRatio:0
    };
    const x=s.skills[id];
    ['label','url','module','mode','group'].forEach(k=>{if(o[k]!==undefined&&o[k]!==null&&o[k]!=='')x[k]=o[k]});
    return x;
  }
  function pushEvent(s,e){s.events.unshift(e);if(s.events.length>MAX_EVENTS)s.events=s.events.slice(0,MAX_EVENTS)}

  function recordRound(o){
    const sid=o.student||studentId()||'guest';
    const db=load(), s=student(db,sid), x=baseSkill(s,o.skillId,o);
    const total=Math.max(1,Number(o.total)||1);
    const independent=Math.max(0,Number(o.independent)||0);
    const prompted=Math.max(0,Number(o.prompted)||0);
    const modeled=Math.max(0,Number(o.modeled)||0);
    const remedial=!!o.remedial;
    const ratio=independent/total;
    let delta=0, result='';

    if(remedial){
      x.remedialRounds++;
      if(independent>=Math.ceil(total*2/3) && modeled===0){delta=-3;result='補救後穩定'}
      else if(independent>=Math.ceil(total/2) && modeled===0){delta=-1;result='補救後進步'}
      else{delta=2;result='補救後仍需練習'}
    }else{
      x.rounds++;
      if(ratio>=0.8 && modeled===0){delta=-2;result='目前穩定'}
      else if(ratio>=0.5 && modeled===0){delta=1;result='需要短補救'}
      else{delta=2;result='需要短補救'}
    }

    x.score=clamp((Number(x.score)||0)+delta,0,9);
    x.needsPractice=x.score>0;
    if(remedial && x.score>=3 && result==='補救後仍需練習') x.teacherCheck=true;
    if(x.score===0) x.teacherCheck=false;
    x.independent+=independent;x.prompted+=prompted;x.modeled+=modeled;x.seen+=total;
    x.lastTime=now();x.lastResult=result;x.lastRatio=ratio;
    pushEvent(s,{time:x.lastTime,type:'round',skillId:x.id,label:x.label,total,independent,prompted,modeled,remedial,result,score:x.score});
    save(db);
    return {student:sid,skill:{...x},result,needsPractice:x.needsPractice,teacherCheck:x.teacherCheck,shouldRemediate:!remedial&&(ratio<0.8||modeled>0),remedialPassed:remedial&&(result==='補救後穩定'||x.score===0)};
  }

  function recordItem(o){
    const sid=o.student||studentId()||'guest';
    const db=load(), s=student(db,sid), x=baseSkill(s,o.skillId,o);
    const mark=o.mark==='again'?'again':'know';
    x.seen++;x[mark]++;
    x.score=clamp((Number(x.score)||0)+(mark==='again'?2:-1),0,9);
    x.needsPractice=x.score>0;
    if(mark==='again' && x.score>=4) x.teacherCheck=true;
    if(x.score===0)x.teacherCheck=false;
    x.lastTime=now();x.lastResult=mark==='again'?'學生標記還要再練':'學生標記我會了';
    pushEvent(s,{time:x.lastTime,type:'item',skillId:x.id,label:x.label,mark,score:x.score});
    save(db);
    return {student:sid,skill:{...x}};
  }

  function getSkills(id){const db=load(),s=student(db,id||studentId()||'guest');return Object.values(s.skills||{})}
  function recommendations(id,limit=6){
    return getSkills(id).filter(x=>x.needsPractice).sort((a,b)=>{
      if(!!b.teacherCheck!==!!a.teacherCheck)return Number(b.teacherCheck)-Number(a.teacherCheck);
      if((b.score||0)!==(a.score||0))return (b.score||0)-(a.score||0);
      return (b.lastTime||0)-(a.lastTime||0);
    }).slice(0,limit);
  }
  function countNeedsPractice(id){return recommendations(id,999).length}
  function allStudents(){const db=load();return Object.keys(db.students||{}).sort()}
  function studentSummary(id){
    const xs=getSkills(id), weak=xs.filter(x=>x.needsPractice), check=weak.filter(x=>x.teacherCheck);
    return {student:id,skills:xs.length,weak:weak.length,teacherCheck:check.length,items:recommendations(id,999)};
  }
  function resetStudent(id){const db=load();delete db.students[id];save(db)}

  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function renderHome(container,id){
    if(typeof container==='string')container=document.querySelector(container);
    if(!container)return;
    id=id||studentId();
    if(!id){container.innerHTML='<div class="adaptive-empty">先輸入班級座號，網站才知道今天要幫誰安排練習。</div>';return}
    const list=recommendations(id,3);
    if(!list.length){container.innerHTML='<div class="adaptive-good"><b>目前沒有需要優先再練的項目。</b><span>先照原本順序學習，網站會依練習結果自動調整。</span></div>';return}
    container.innerHTML=list.map((x,i)=>`<a class="adaptive-rec" href="${esc(x.url||'#')}"><span class="adaptive-num">${i+1}</span><span class="adaptive-rec-main"><b>${esc(x.label)}</b><small>${x.teacherCheck?'已經練過幾次，可以請老師幫我看看':'網站依最近的練習幫我安排短補強'}</small></span><span class="adaptive-go">開始練 →</span></a>`).join('');
  }

  function ensurePlanBox(summaryEl){
    if(typeof summaryEl==='string')summaryEl=document.querySelector(summaryEl);
    if(!summaryEl)return null;
    let box=summaryEl.querySelector('#adaptivePlanBox');
    if(!box){box=document.createElement('div');box.id='adaptivePlanBox';box.className='adaptive-plan';const actions=summaryEl.querySelector('.sumActions');if(actions)summaryEl.insertBefore(box,actions);else summaryEl.appendChild(box)}
    return box;
  }
  function renderRoundPlan(summaryEl,record,onRemedial){
    const box=ensurePlanBox(summaryEl);if(!box)return;
    const x=record.skill;
    if(record.result==='補救後穩定'||!record.needsPractice){
      box.className='adaptive-plan adaptive-plan-good';
      box.innerHTML='<b>✓ 這個項目再練後比較穩定</b><span>它在「今天先練這些」裡會先往後排。</span>';
      return;
    }
    if(record.teacherCheck){
      box.className='adaptive-plan adaptive-plan-teacher';
      box.innerHTML='<b>👩‍🏫 這個地方已經練過幾次</b><span>先不用一直重做，可以把「我的學習紀錄」拿給老師看，請老師幫我確認。</span>';
      return;
    }
    if(record.shouldRemediate){
      box.className='adaptive-plan';
      box.innerHTML='<b>🎯 這一組再練一下會更穩</b><span>網站幫我安排 3 題短練習，做完再看看有沒有進步。</span><button type="button" class="adaptive-remedial-btn">再練 3 題</button>';
      box.querySelector('button').onclick=()=>{if(typeof onRemedial==='function'){onRemedial();setTimeout(()=>showRemedialBanner(x.label),30)}};
    }else{
      box.className='adaptive-plan';
      box.innerHTML='<b>這一組會留在「今天先練」</b><span>下一次登入時會優先安排。</span>';
    }
  }

  function showRemedialBanner(label){
    document.querySelectorAll('.adaptive-remedial-banner').forEach(x=>x.remove());
    const target=[...document.querySelectorAll('#practice,#decode,#encode,#sort,#listenPanel.show,#readPanel.show')].find(el=>!el.classList.contains('hidden')&&getComputedStyle(el).display!=='none');
    if(!target)return;
    const b=document.createElement('div');b.className='adaptive-remedial-banner';
    b.innerHTML='<b>🎯 再練一下</b><span>'+esc(label||'這個項目')+' · 3 題短練習</span>';
    target.insertBefore(b,target.firstChild);
  }

  global.PhonicsAdaptive={
    key:KEY,studentId,setStudent,recordRound,recordItem,getSkills,recommendations,countNeedsPractice,allStudents,studentSummary,resetStudent,renderHome,renderRoundPlan,showRemedialBanner,load
  };
})(window);
