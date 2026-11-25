(()=>{
const PAGE={
  'index.html':{type:'home',title:'學習首頁'},
  'START_HERE.html':{type:'home',title:'學習首頁'},
  'section_videos.html':{type:'section',section:'videos',title:'學習影片'},
  'section_ipa.html':{type:'section',section:'ipa',title:'音標學習'},
  'section_basic.html':{type:'section',section:'basic',title:'基礎拼讀'},
  'section_rules.html':{type:'section',section:'rules',title:'拼讀規則'},
  '00_video_letter.html':{section:'videos',title:'字母長音・短音',kind:'plain'},
  '00_video_consonant.html':{section:'videos',title:'子音音標影片',kind:'plain'},
  '00_video_vowel.html':{section:'videos',title:'母音音標影片',kind:'plain'},
  '01_ipa_dictionary.html':{section:'ipa',title:'音標字典',kind:'plain'},
  '02_consonant_practice.html':{section:'ipa',title:'子音音標練習',kind:'ipaPractice'},
  '03_vowel_practice.html':{section:'ipa',title:'母音音標練習',kind:'ipaPractice'},
  '04_mixed_ipa.html':{section:'ipa',title:'音標混合挑戰',kind:'ipaPractice'},
  '05_cvc_short_vowels.html':{section:'basic',title:'CVC 短母音',kind:'cvc'},
  '06_lmnr.html':{section:'basic',title:'LMNR 前後發音',kind:'lmnr'},
  '07_long_vowels.html':{section:'rules',title:'長母音',kind:'long'},
  '08_consonant_groups.html':{section:'rules',title:'常見子音組合',kind:'rule'},
  '09_word_endings.html':{section:'rules',title:'常見字尾組合',kind:'rule'},
  '10_soft_c.html':{section:'rules',title:'c 的特殊念法',kind:'softc'},
  '11_ee_ea.html':{section:'rules',title:'ee / ea',kind:'rule'},
  '12_oo.html':{section:'rules',title:'oo',kind:'rule'},
  '13_ou_ow.html':{section:'rules',title:'ou / ow',kind:'rule'},
  '14_r_controlled.html':{section:'rules',title:'母音＋r',kind:'rule'},
  '15_all.html':{section:'rules',title:'all',kind:'rule'}
};
const SECTIONS={
 videos:{title:'學習影片',file:'section_videos.html'},
 ipa:{title:'音標學習',file:'section_ipa.html'},
 basic:{title:'基礎拼讀',file:'section_basic.html'},
 rules:{title:'拼讀規則',file:'section_rules.html'}
};
const MODULE_IDS={
 '00_video_letter.html':'video-letter','00_video_consonant.html':'video-cons','00_video_vowel.html':'video-vowel',
 '01_ipa_dictionary.html':'ipa-dict','02_consonant_practice.html':'ipa-cons','03_vowel_practice.html':'ipa-vowel','04_mixed_ipa.html':'ipa-mixed',
 '05_cvc_short_vowels.html':'cvc','06_lmnr.html':'lmnr','07_long_vowels.html':'long','08_consonant_groups.html':'digraph',
 '09_word_endings.html':'ending','10_soft_c.html':'softc','11_ee_ea.html':'eeea','12_oo.html':'oo','13_ou_ow.html':'ouow','14_r_controlled.html':'r','15_all.html':'all'
};
function file(){return (location.pathname.split('/').pop()||'index.html')}
function $(s){return document.querySelector(s)}
function visible(id){const e=document.getElementById(id);return !!e && !e.classList.contains('hidden') && getComputedStyle(e).display!=='none'}
function markVisited(f,cfg){
  const id=MODULE_IDS[f]; if(!id)return;
  try{if(window.PhonicsStorage)PhonicsStorage.markVisited(id,cfg.title)}catch(e){}
}
function hideLegacyNav(){
  document.querySelectorAll('#hubHomeBtn').forEach(e=>e.remove());
  const navText=['回首頁','回規則首頁','回長母音','回練習選單','回規則頁','回到規則頁','回到規則','回規則','回練習首頁','回練習方式','回上頁'];
  document.querySelectorAll('button,a').forEach(el=>{
    const t=(el.textContent||'').trim();
    if(t.includes('回到上面')){el.textContent='↑ 回本頁頂端';return}
    if(navText.some(x=>t.includes(x)) && !el.closest('#siteNav')) el.classList.add('site-managed-back');
  });
}
function stateFor(cfg){
  if(cfg.kind==='ipaPractice'){
    if(visible('practice'))return {label:'練習中',depth:true};
    if(visible('summary'))return {label:'本回合完成',depth:true};
    return {label:'開始',depth:false};
  }
  if(cfg.kind==='cvc'){
    if(visible('login'))return {label:'學生登入',depth:false};
    if(visible('home'))return {label:'選擇練習方式',depth:false};
    if(visible('vowelSelect')){
      const b=$('#vowelSelectBrand');return {label:(b&&b.textContent.trim())||'選擇短母音',depth:true};
    }
    if(visible('decode')){
      const b=$('#decodeBrand');return {label:(b&&b.textContent.trim())||'看字拼讀',depth:true};
    }
    if(visible('encode')){
      const b=$('#encodeBrand');return {label:(b&&b.textContent.trim())||'聽音拼字',depth:true};
    }
    if(visible('summary'))return {label:'本回合完成',depth:true};
    return {label:'',depth:false};
  }
  if(cfg.kind==='lmnr'){
    const lp=$('#listenPanel'),rp=$('#readPanel'),sum=$('#summary');
    if(lp&&lp.classList.contains('show'))return {label:'聽音找位置',depth:true};
    if(rp&&rp.classList.contains('show'))return {label:'看字念',depth:true};
    if(sum&&!sum.classList.contains('hidden'))return {label:'練習完成',depth:true};
    return {label:'學習與練習',depth:false};
  }
  if(cfg.kind==='long'){
    if(visible('decode'))return {label:'看字拼讀',depth:true};
    if(visible('encode'))return {label:'聽音拼字',depth:true};
    if(visible('summary'))return {label:'本回合完成',depth:true};
    return {label:'看規則・看例子・自己練習',depth:false};
  }
  if(cfg.kind==='rule'){
    if(visible('decode')){const x=$('#decTitle');return {label:(x&&x.textContent.trim())||'看字拼讀',depth:true}}
    if(visible('encode')){const x=$('#encTitle');return {label:(x&&x.textContent.trim())||'聽音拼字',depth:true}}
    if(visible('recognize'))return {label:'快速辨認',depth:true};
    if(visible('summary'))return {label:'本回合完成',depth:true};
    return {label:'看規則・看例子・自己練習',depth:false};
  }
  if(cfg.kind==='softc'){
    if(visible('sort'))return {label:'找 c 的聲音',depth:true};
    if(visible('decode'))return {label:'看字拼讀',depth:true};
    if(visible('summary'))return {label:'練習完成',depth:true};
    return {label:'看規則・看例子・自己練習',depth:false};
  }
  return {label:'',depth:false};
}
function moduleRoot(cfg){
  if(cfg.kind==='ipaPractice'){
    const st=stateFor(cfg);
    if(st.depth){
      // 練習中或回合完成：回到這個音標練習的起始頁。
      // 不直接離開模組，讓「上一層」的階層邏輯和其他單元一致。
      if(typeof window.setScreen==='function'){
        try{window.setScreen('start')}catch(e){}
      }else{
        ['practice','summary'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.add('hidden')});
        const start=document.getElementById('start');if(start)start.classList.remove('hidden');
      }
      window.scrollTo({top:0,behavior:'auto'});
      return;
    }
    // 已在此練習的起始頁：再往上一層回到「音標學習」。
    location.href=SECTIONS[cfg.section].file;
    return;
  }
  if(cfg.kind==='cvc'){
    if(visible('decode')||visible('encode')){const b=document.querySelector('.homeBtn');if(b){b.click();return}}
    if(visible('vowelSelect')){const b=$('#backMode');if(b){b.click();return}}
    if(visible('summary')){const b=$('#backHome');if(b){b.click();return}}
    location.href=SECTIONS[cfg.section].file;return
  }
  if(cfg.kind==='lmnr'){
    const sum=$('#summary'); if(sum&&!sum.classList.contains('hidden')){const b=$('#backPractice');if(b){b.click();return}}
    const lp=$('#listenPanel'),rp=$('#readPanel');
    if((lp&&lp.classList.contains('show'))||(rp&&rp.classList.contains('show'))){if(typeof window.lmnrReturnToMenu==='function'){window.lmnrReturnToMenu();return}location.href='06_lmnr.html#practice-menu';return}
    location.href=SECTIONS[cfg.section].file;return
  }
  if(cfg.kind==='long'){
    if(visible('decode')||visible('encode')){const b=document.querySelector('[data-long]');if(b){b.click();return}}
    if(visible('summary')){const b=$('#toLong');if(b){b.click();return}}
    location.href=SECTIONS[cfg.section].file;return
  }
  if(cfg.kind==='rule'||cfg.kind==='softc'){
    if(stateFor(cfg).depth){
      if(typeof window.ruleReturnToLearn==='function'){window.ruleReturnToLearn();return}
      const b=document.querySelector('[data-back]')||$('#backLearn');if(b){b.click();return}
    }
    location.href=SECTIONS[cfg.section].file;return
  }
  location.href=SECTIONS[cfg.section].file;
}
function render(){
  const f=file(),cfg=PAGE[f]; if(!cfg)return;
  const old=$('#siteNav');if(old)old.remove();
  const nav=document.createElement('nav');nav.id='siteNav';nav.className='site-nav';
  const inner=document.createElement('div');inner.className='site-nav-inner';nav.appendChild(inner);
  const back=document.createElement('button');back.className='site-nav-back';back.textContent='← 上一層';inner.appendChild(back);
  const crumbs=document.createElement('div');crumbs.className='site-nav-crumbs';inner.appendChild(crumbs);
  const home=document.createElement('a');home.className='site-nav-home';home.href='index.html';home.innerHTML='⌂ <span class="home-word">首頁</span>';inner.appendChild(home);
  const ctx=document.createElement('div');ctx.className='site-nav-context';nav.appendChild(ctx);
  document.body.insertBefore(nav,document.body.firstChild);
  function crumbButton(txt,fn){const b=document.createElement('button');b.className='site-nav-crumb-btn';b.textContent=txt;b.onclick=fn;return b}
  function sep(){const s=document.createElement('span');s.className='site-nav-sep';s.textContent='›';return s}
  function update(){
    crumbs.innerHTML='';
    if(cfg.type==='home'){
      back.disabled=true;back.textContent='← 已在首頁';home.style.visibility='hidden';
      const cur=document.createElement('span');cur.className='site-nav-crumb-current';cur.textContent='學習首頁';crumbs.appendChild(cur);ctx.textContent='學習首頁';return;
    }
    home.style.visibility='visible';back.disabled=false;back.textContent='← 上一層';
    crumbs.appendChild(crumbButton('首頁',()=>location.href='index.html'));
    if(cfg.type==='section'){
      crumbs.appendChild(sep());const cur=document.createElement('span');cur.className='site-nav-crumb-current';cur.textContent=cfg.title;crumbs.appendChild(cur);
      back.onclick=()=>location.href='index.html';ctx.textContent='首頁 › '+cfg.title;return;
    }
    const sec=SECTIONS[cfg.section];crumbs.appendChild(sep());crumbs.appendChild(crumbButton(sec.title,()=>location.href=sec.file));
    crumbs.appendChild(sep());
    const st=stateFor(cfg);
    if(st.depth){crumbs.appendChild(crumbButton(cfg.title,()=>moduleRoot(cfg)));crumbs.appendChild(sep());const cur=document.createElement('span');cur.className='site-nav-crumb-current';cur.textContent=st.label;crumbs.appendChild(cur)}
    else{const cur=document.createElement('span');cur.className='site-nav-crumb-current';cur.textContent=cfg.title;crumbs.appendChild(cur)}
    ctx.textContent=['首頁',sec.title,cfg.title,st.depth?st.label:''].filter(Boolean).join(' › ');
    back.onclick=()=>moduleRoot(cfg);
  }
  update();
  const obs=new MutationObserver(()=>requestAnimationFrame(update));
  const stateIds=['start','practice','summary','login','home','vowelSelect','decode','encode','listenPanel','readPanel','ruleHome','longLearn','learn','recognize','sort'];
  stateIds.forEach(id=>{const el=document.getElementById(id);if(el)obs.observe(el,{attributes:true,attributeFilter:['class']})});
  ['vowelSelectBrand','decodeBrand','encodeBrand','decTitle','encTitle'].forEach(id=>{const el=document.getElementById(id);if(el)obs.observe(el,{childList:true,subtree:true,characterData:true})});
  if(cfg.kind==='long'&&visible('ruleHome')){const b=$('#openLong');if(b)setTimeout(()=>b.click(),0)}
  if(cfg.kind==='lmnr'&&location.hash==='#practice-menu')setTimeout(()=>{const m=$('.practiceMenu');if(m)m.scrollIntoView({behavior:'auto',block:'start'})},50);
  markVisited(f,cfg);
}
function init(){hideLegacyNav();render();setTimeout(hideLegacyNav,50)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
