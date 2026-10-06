/* Uses the SAME Identity + Git Gateway authorization as the existing CMS.
   No PAT, client secret, role simulation or public write endpoint. */
(() => {
 'use strict';
 const BRANCH='main',ZONE='Europe/Warsaw',ROOT='content/offers';
 const status=document.getElementById('status'),list=document.getElementById('offers'),login=document.getElementById('login'),reload=document.getElementById('reload');
 let busy=false,loading=false,epoch=0;
 const msg=s=>status.textContent=s;
 const encode=s=>btoa(Array.from(new TextEncoder().encode(s),b=>String.fromCharCode(b)).join(''));
 const decode=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,'')),c=>c.charCodeAt(0)));
 const validPath=p=>typeof p==='string'&&/^content\/offers\/[^/]+\.json$/.test(p)&&!p.includes('..');
 const date=d=>{const v=new Date(d);return Number.isNaN(v.getTime())?'Дата не указана':v.toLocaleDateString('ru-RU',{timeZone:ZONE});};
 async function api(path,options={}){
  const user=window.netlifyIdentity?.currentUser();if(!user)throw Error('Войдите в админку.');
  const jwt=await user.jwt();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{const r=await fetch('/.netlify/git/github/contents/'+path.split('/').map(encodeURIComponent).join('/')+(options.method?'':'?ref='+encodeURIComponent(BRANCH)),{...options,cache:'no-store',signal:controller.signal,headers:{Authorization:'Bearer '+jwt,Accept:'application/vnd.github+json','Content-Type':'application/json',...options.headers}});
   if(!r.ok){if(r.status===409||r.status===422)throw Error('Оффер изменён другим редактором. Обновите список и повторите.');if(r.status===401||r.status===403)throw Error('Сессия истекла или нет прав Git Gateway. Войдите снова.');throw Error('Ошибка Git Gateway: '+r.status);}
   return await r.json();
  }finally{clearTimeout(timer);}
 }
 async function refresh(path,button,label){
  if(busy||loading||!validPath(path))return;busy=true;document.querySelectorAll('#offers button').forEach(b=>b.disabled=true);reload.disabled=true;msg('Сохраняем дату…');
  try{
   // Always re-read immediately before updating; SHA prevents overwriting concurrent edits.
   const file=await api(path);if(file.encoding!=='base64'||!file.sha)throw Error('Неожиданный формат файла.');
   const raw=decode(file.content);const offer=JSON.parse(raw);if(!offer||typeof offer!=='object'||Array.isArray(offer))throw Error('Некорректный JSON оффера.');
   const now=new Date().toISOString();
   // Change only the top-level date value; preserve original whitespace and every other key.
   const next=replaceDate(raw,now);
   await api(path,{method:'PUT',body:JSON.stringify({branch:BRANCH,sha:file.sha,message:'Refresh offer date: '+path.split('/').pop(),content:encode(next)})});
   label.textContent='Дата: '+date(now)+(offer.hidden?' · скрыто':'')+(offer.pinned?' · закреплено':'');msg('Дата сохранена. На сайте обновится после успешной сборки Netlify.');
  }catch(e){msg(e.name==='AbortError'?'Тайм-аут. Сохранение могло завершиться; обновите список перед повтором.':e.message);}
  finally{busy=false;document.querySelectorAll('#offers button').forEach(b=>b.disabled=false);reload.disabled=false;}
 }
 function replaceDate(raw,value){
  // JSON parsed first above. Track nesting and strings so nested "date" keys are untouched.
  let depth=0,string=false,escape=false,start=0;
  for(let i=0;i<raw.length;i++){
   const c=raw[i];if(string){if(escape){escape=false;continue;}if(c==='\\'){escape=true;continue;}if(c==='"'){string=false;
    if(depth===1&&raw.slice(start,i+1)==='"date"'){let a=i+1;while(/\s/.test(raw[a]||'')&&a<raw.length)a++;if(raw[a]!==':')continue;a++;while(/\s/.test(raw[a]||'')&&a<raw.length)a++;let b=a;if(raw[a]==='"'){b++;let esc=false;for(;b<raw.length;b++){if(esc){esc=false;continue;}if(raw[b]==='\\'){esc=true;continue;}if(raw[b]==='"'){b++;break;}}}else{while(b<raw.length&&!/[},]/.test(raw[b]))b++;while(b>a&&/\s/.test(raw[b-1]))b--;}
     const next=raw.slice(0,a)+JSON.stringify(value)+raw.slice(b);const before=JSON.parse(raw),after=JSON.parse(next);delete before.date;delete after.date;if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Изменение затронуло другие поля.');return next;
    }
   }continue;}
   if(c==='"'){string=true;start=i;}else if(c==='{'||c==='[')depth++;else if(c==='}'||c===']')depth--;
  }
  throw Error('В оффере нет поля date. Исправьте его через обычный редактор.');
 }
 async function load(){
  if(busy||loading)return;const mine=++epoch;list.replaceChildren();const user=window.netlifyIdentity?.currentUser();login.textContent=user?'Аккаунт / выход':'Войти';reload.hidden=!user;if(!user){msg('Для доступа нужен вход с правами редактирования CMS.');return;}loading=true;reload.disabled=true;msg('Загружаем…');
  try{const files=await api(ROOT);if(!Array.isArray(files))throw Error('Не удалось прочитать список.');
   // Sequential requests avoid API bursts; current collection contains only a few offers.
   for(const f of files.filter(f=>f.type==='file'&&validPath(f.path))){const file=await api(f.path);const offer=JSON.parse(decode(file.content));if(mine!==epoch)return;
    const row=document.createElement('article'),text=document.createElement('div'),title=document.createElement('h2'),label=document.createElement('div'),button=document.createElement('button');title.textContent=offer.title||f.name;label.textContent='Дата: '+date(offer.date)+(offer.hidden?' · скрыто':'')+(offer.pinned?' · закреплено':'');button.type='button';button.disabled=true;button.textContent='Актуализировать';button.setAttribute('aria-label','Актуализировать: '+title.textContent);button.addEventListener('click',()=>refresh(f.path,button,label));text.append(title,label);row.append(text,button);list.append(row);
   }if(mine===epoch)msg(list.children.length?'Нажмите кнопку рядом с нужным оффером.':'Предложений пока нет.');
  }catch(e){if(mine===epoch)msg(e.name==='AbortError'?'Не удалось загрузить: тайм-аут.':e.message);}finally{loading=false;if(mine===epoch){reload.disabled=false;document.querySelectorAll('#offers button').forEach(b=>b.disabled=false);}}
 }
 login.addEventListener('click',()=>window.netlifyIdentity?.open());reload.addEventListener('click',load);
 if(window.netlifyIdentity){window.netlifyIdentity.on('init',load);window.netlifyIdentity.on('login',()=>{window.netlifyIdentity.close();load();});window.netlifyIdentity.on('logout',()=>{epoch++;list.replaceChildren();reload.hidden=true;login.textContent='Войти';msg('Вы вышли.');});}else msg('Identity не загрузился. Проверьте сеть.');
})();
