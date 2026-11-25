(function(){
  'use strict';
  const file=(location.pathname.split('/').pop()||'').toLowerCase();
  if(/^0[234]_/.test(file))document.body.classList.add('ipa-practice-page');
  if(file==='06_lmnr.html')document.body.classList.add('lmnr-page');
  if(/^(07_|08_|09_|10_|11_|12_|13_|14_|15_)/.test(file))document.body.classList.add('rule-practice-page');
  const selectors=['#practice','#decode','#encode','#sort','#listenPanel.show','#readPanel.show','#summary:not(.hidden)'];
  let was=false;
  function visible(el){return !!el && !el.classList.contains('hidden') && getComputedStyle(el).display!=='none'}
  function update(){
    const active=selectors.some(s=>[...document.querySelectorAll(s)].some(visible));
    document.body.classList.toggle('practice-active',active);
    if(active&&!was){requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}))}
    was=active;
  }
  const mo=new MutationObserver(update);mo.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style']});
  update();
})();
