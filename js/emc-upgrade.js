/* No dependencies, no continuous JS animation loop. */
(() => {
 'use strict';
 const reduce=matchMedia('(prefers-reduced-motion: reduce)'), fine=matchMedia('(hover:hover) and (pointer:fine)');
 const connection=navigator.connection;
 const lite=()=>reduce.matches || !!connection?.saveData || ['slow-2g','2g'].includes(connection?.effectiveType);
 const hosts=new Set(), visible=new Set(), logos=new Set(), logoVisible=new Set();
 const sync=()=>{
  document.documentElement.classList.toggle('emc2-lite',lite());
  hosts.forEach(h=>h.classList.toggle('emc2-running',visible.has(h)&&!document.hidden&&!lite()));
  logos.forEach(img=>{const next=!lite()&&!document.hidden&&logoVisible.has(img)?img.dataset.animated:img.dataset.static;if(img.getAttribute('src')!==next)img.src=next;});
 };
 const io='IntersectionObserver' in window?new IntersectionObserver(entries=>{entries.forEach(e=>{
  const set=e.target.matches('.emc2-logo')?logoVisible:visible;e.isIntersecting?set.add(e.target):set.delete(e.target);
 });sync();},{threshold:0,rootMargin:'0px'}):null;
 const path=(d,cls='emc2-base')=>`<path class="${cls}" d="${d}"/>`;
 const trace=(d,i)=>path(d,`emc2-track ${i%2?'emc2-green':''} ${i>1?'emc2-detail':''}`);
 function artwork(kind){
  let grid='';for(let x=0;x<=1200;x+=100)grid+=path(`M${x} 0V500`);for(let y=0;y<=500;y+=100)grid+=path(`M0 ${y}H1200`);
  let ds=['M-50 380H150L300 230H510V130H820L950 260H1250','M-50 90H240L370 220H650V370H1020L1250 140','M0 460H400L530 330H890V70H1250','M0 40H640L780 180H1250'];
  if(kind==='services')ds=[0,1,2,3].map(i=>`M-100 ${90+i*95}C120 ${-30+i*95} 360 ${280+i*65} 620 ${120+i*80}S1000 ${-80+i*100} 1300 ${180+i*80}`);
  if(kind==='network')ds=['M80 160L300 300L530 100L800 220L1120 90','M0 350L300 300L600 440L800 220L1200 420','M80 160L530 100L600 440','M1120 90L800 220L530 100'];
  if(kind==='news')ds=['M0 140H280V210H600V140H920V210H1200','M0 360H180V290H460V360H800V290H1200','M0 70H400V110H780V70H1200','M0 450H620V400H1000V450H1200'];
  const nodes=[[150,380],[300,230],[510,130],[820,130],[370,220],[650,370],[1020,370],[890,70]];
  let detail=nodes.map(([x,y],i)=>`<g class="${i>3?'emc2-detail':''}"><circle class="emc2-node" cx="${x}" cy="${y}" r="2.4"/><circle class="emc2-ring" cx="${x}" cy="${y}" r="8"/></g>`).join('');
  if(kind!=='services')detail+=`<g class="emc2-detail">${[220,700,1020].map((x,i)=>`<rect class="emc2-base emc2-green" x="${x}" y="${80+i*100}" width="44" height="32" rx="3"/>${[0,1,2,3].map(j=>path(`M${x+8+j*8} ${74+i*100}v6m0 32v6`)).join('')}`).join('')}</g>`;
  return `<div class="emc2-halo"></div><div class="emc2-halo emc2-detail"></div><svg viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice" focusable="false"><g opacity=".62">${kind==='services'||kind==='network'?'':grid}</g><g class="${kind==='services'?'emc2-plane':''}">${ds.map((d,i)=>path(d,`emc2-base ${i%2?'emc2-green':''} ${i>1?'emc2-detail':''}`)+trace(d,i)).join('')}${detail}</g></svg>`;
 }
 function backgrounds(){
  document.querySelectorAll('[data-emc-bg]').forEach(h=>{
   if(hosts.has(h)||h.querySelector('video'))return;
   const layer=document.createElement('div');layer.className='emc2-bg';layer.setAttribute('aria-hidden','true');layer.innerHTML=artwork(h.dataset.emcBg);
   h.classList.add('emc2-host');h.prepend(layer);hosts.add(h);io?.observe(h);
  });
 }
 function initLogos(){
  document.querySelectorAll('.brand-logo-img,.footer-logo-img').forEach(img=>{
   // A picture source would override img.src. Remove only the existing logo sources.
   img.closest('picture')?.querySelectorAll('source').forEach(s=>s.remove());
   img.dataset.static='assets/fx/logo-static.webp';img.dataset.animated='assets/fx/logo-animated.webp';img.classList.add('emc2-logo');
   logos.add(img);io?.observe(img);img.src=img.dataset.static;
  });
 }
 const selector='.element-tile,.dyn-list-item,.service-tile,.news-card,a.btn,button.btn,.lang-current,.menu-toggle';
 const shineHosts='.element-tile,.dyn-list-item,.service-tile,.news-card';
 function controls(){document.querySelectorAll(selector).forEach(el=>{el.classList.add('emc2-control');
  // one short hover shine layer (a span, so the existing glow pseudo-elements stay untouched)
  if(el.matches(shineHosts)&&!el.querySelector(':scope > .emc-shine')){const s=document.createElement('span');s.className='emc-shine';s.setAttribute('aria-hidden','true');el.prepend(s);}
 });}
 // Delegation also covers asynchronously rendered offers and category cards.
 let pending=0, target=null, latest=null;
 function reset(){if(target){target.style.removeProperty('--emc2-rx');target.style.removeProperty('--emc2-ry');}target=null;latest=null;cancelAnimationFrame(pending);pending=0;}
 document.addEventListener('pointermove',e=>{
  if(!fine.matches||lite()||document.hidden)return;
  const el=e.target.closest(selector);if(!el){reset();return;}el.classList.add('emc2-control');
  if(el!==target){reset();target=el;}latest={x:e.clientX,y:e.clientY};
  if(!pending)pending=requestAnimationFrame(()=>{pending=0;if(!target||!latest)return;const r=target.getBoundingClientRect();const x=Math.max(0,Math.min(1,(latest.x-r.left)/r.width)),y=Math.max(0,Math.min(1,(latest.y-r.top)/r.height));target.style.setProperty('--emc2-rx',`${(0.5-y)*3}deg`);target.style.setProperty('--emc2-ry',`${(x-0.5)*3}deg`);target.style.setProperty('--emc2-x',`${x*100}%`);target.style.setProperty('--emc2-y',`${y*100}%`);});
 },{passive:true});
 document.addEventListener('pointerout',e=>{if(target&&!target.contains(e.relatedTarget))reset();});
 document.addEventListener('keydown',reset);window.addEventListener('blur',reset);
 backgrounds();initLogos();controls();sync();
 // Observe only containers with async controls, never the animated layers.
 for(const id of ['categoryGrid','offersGrid','procurementGrid','servicesActiveList','servicesNeededList','newsGrid']){const root=document.getElementById(id);if(root)new MutationObserver(controls).observe(root,{childList:true});}
 document.addEventListener('visibilitychange',()=>{reset();sync();});reduce.addEventListener('change',()=>{reset();sync();});fine.addEventListener('change',reset);connection?.addEventListener?.('change',sync);
})();
