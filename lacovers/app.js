'use strict';
const $=id=>document.getElementById(id);
const storageGet=k=>{try{return window.localStorage.getItem(k)}catch(e){return null}};
const storageSet=(k,v)=>{try{window.localStorage.setItem(k,v)}catch(e){}};
const MODES={
 cassette:{name:'Кассета · J-вкладыш',w:103.2,h:101.6,landscape:false,perSheet:2,parts:['back','spine','front']},
 cassetteXL:{name:'Кассета · развернутый',w:168.3,h:101.6,landscape:false,perSheet:2,parts:['back','spine','front','inside']},
 cdFront:{name:'CD · лицевая сторона',w:120,h:120,landscape:false,perSheet:2,parts:['front']},
 cdBack:{name:'CD · задняя сторона',w:150,h:118,landscape:false,perSheet:2,parts:['back','spines']},
 cdSet:{name:'CD · комплект',w:150,h:249,landscape:false,perSheet:1,parts:['front','back','spines']},
 booklet:{name:'CD · разворот',w:240,h:120,landscape:true,perSheet:1,parts:['inside','front']}
};
const STYLES=[
 {name:'NEON',colors:['#140d29','#441d66'],accent:'#ff51a5',color:'#fff5fa'},
 {name:'NOIR',colors:['#0c0d13','#343640'],accent:'#c4cad7',color:'#f8f8fa'},
 {name:'FIRE',colors:['#2b0a24','#c63b2b'],accent:'#ffc877',color:'#fff1dd'},
 {name:'OCEAN',colors:['#081c2b','#14556b'],accent:'#45e3e9',color:'#f1fdff'},
 {name:'VINYL',colors:['#31271d','#9d7646'],accent:'#f3d29c',color:'#fff5e6'},
 {name:'PUNK',colors:['#1b1220','#6e153f'],accent:'#eafc57',color:'#fffdf1'},
 {name:'SILVER',colors:['#1a2030','#485978'],accent:'#c0d7fa',color:'#fff'},
 {name:'ROYAL',colors:['#160f32','#46307d'],accent:'#e6bd79',color:'#fff'},
 {name:'WHITE',colors:['#e5e5e5','#ffffff'],accent:'#252525',color:'#181818'},
 {name:'CHROME',colors:['#090b16','#596075'],accent:'#dbe9ff',color:'#ffffff'},
 {name:'SUNSET',colors:['#551e5b','#fb754e'],accent:'#ffd18c',color:'#fff9ef'},
 {name:'MATRIX',colors:['#06130f','#124c2c'],accent:'#57f39f',color:'#e1ffe7'},
 {name:'RETRO 80',colors:['#31185a','#fc418d'],accent:'#26fbf4',color:'#fffdf0'},
 {name:'PAPER',colors:['#cabb9d','#efe1c7'],accent:'#754023',color:'#241b12'},
 {name:'MIDNIGHT',colors:['#090e25','#18346d'],accent:'#64abff',color:'#f5fcff'},
 {name:'LACQUER',colors:['#23071c','#92074d'],accent:'#ff8bc5',color:'#fff5fa'},
 {name:'CABARET',colors:['#25070f','#8d1721'],accent:'#f6cc9a',color:'#fff4e5'},
 {name:'ELECTRO',colors:['#091c2a','#03879e'],accent:'#e0f7ff',color:'#f5fdff'},
 {name:'DISCO',colors:['#25134a','#9d36bd'],accent:'#ffd5ff',color:'#fff3ff'},
 {name:'GOLD',colors:['#1b1712','#54432a'],accent:'#ffd574',color:'#fff1d5'},
 {name:'VIOLET',colors:['#170f30','#6953a2'],accent:'#df9af6',color:'#fff7ff'},
 {name:'CRIMSON',colors:['#220910','#af244b'],accent:'#ffb9ce',color:'#fff8fa'},
 {name:'SEAFOAM',colors:['#093a39','#56b5a3'],accent:'#cafff6',color:'#f6fffb'}
];
const DEFAULT_TRACKS='';
function defaultProject(){return{id:'p'+Date.now()+Math.random().toString(16).slice(2,7),name:'Новый макет',created:Date.now(),updated:Date.now(),mode:'cassette',style:1,font:'classic',accent:'#b88950',title:'',album:'',year:'',edition:'',tracks:DEFAULT_TRACKS,notes:'',showText:false,decorate:'clean',safeFit:true,titlePos:69,titleScale:100,bw:false,guides:true,calibration:true,duplexCassette:false,printPart:"full",copies:1,quality:300,photos:{front:null,spine:null,back:null,inside:null},photoControls:{spine:{zoom:1,x:0,y:0,rotate:0,flip:false,brightness:100,contrast:100,fit:'contain-blur'},front:{zoom:1,x:0,y:0,rotate:0,flip:false,brightness:100,contrast:100,fit:'contain-blur'},back:{zoom:1,x:0,y:0,rotate:0,flip:false,brightness:100,contrast:100,fit:'contain-blur'},inside:{zoom:1,x:0,y:0,rotate:0,flip:false,brightness:100,contrast:100,fit:'contain-blur'}}}}
let project=defaultProject(),projects=[],selectedPanel='front',previewBack=false,previewPending=false,saveTimer=null,db=null,lastPdf=null,renderSeq=0,images=new Map(),activeStep='format',toastTimer=null;
const dbReady=new Promise((resolve)=>{if(!window.indexedDB){resolve(null);return}let r;try{r=indexedDB.open('lacovers-projects-v1',1)}catch(e){resolve(null);return}r.onupgradeneeded=()=>{r.result.createObjectStore('projects',{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null)});
async function database(){return db??(db=await dbReady)}
async function getAllProjects(){const d=await database();if(!d){try{const v=storageGet('lacover-fallback');return v?[JSON.parse(v)]:[]}catch(e){return []}}return new Promise(res=>{let r=d.transaction('projects','readonly').objectStore('projects').getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>res([])})}
async function storeProject(p){const d=await database();if(!d){try{storageSet('lacover-fallback',JSON.stringify(p));return true}catch(e){showStatus('Память устройства заполнена. Сохраните резервную копию.',true);return false}}return new Promise(res=>{const r=d.transaction('projects','readwrite').objectStore('projects').put(structuredClone(p));r.onsuccess=()=>res(true);r.onerror=()=>{showStatus('Не удалось сохранить. Сохраните проект в файл.',true);res(false)}})}
async function removeProject(id){const d=await database();if(!d)return;return new Promise(res=>{const r=d.transaction('projects','readwrite').objectStore('projects').delete(id);r.onsuccess=()=>res();r.onerror=()=>res()})}
function autosave(){project.updated=Date.now();lastPdf=null;clearTimeout(saveTimer);const snapshot=project;saveTimer=setTimeout(()=>storeProject(snapshot).then(()=>refreshProjects(false)),550);schedulePreview()}
function refreshProjects(rebuild=true){const list=$('projectSelect');if(rebuild||!Array.from(list.options).some(o=>o.value===project.id)){getAllProjects().then(all=>{projects=all.sort((a,b)=>b.updated-a.updated);list.replaceChildren(...projects.map(p=>new Option((p.album||p.name||'Без названия')+' · '+MODES[p.mode]?.name,p.id)));list.value=project.id})}else{const opt=list.selectedOptions[0];if(opt)opt.textContent=(project.album||project.name||'Без названия')+' · '+MODES[project.mode]?.name}}
function hydrate(){const value={fontSelect:project.font,accentColor:project.accent,projectTitle:project.title,albumTitle:project.album,year:project.year,edition:project.edition,tracks:project.tracks,notes:project.notes,titlePos:project.titlePos,titleScale:project.titleScale,bw:project.bw,guides:project.guides,calibration:project.calibration,cassetteDuplex:project.duplexCassette,copies:project.copies,quality:project.quality};for(const [id,v] of Object.entries(value)){const el=$(id);if(!el)continue;if(el.type==='checkbox')el.checked=v;else el.value=v}document.querySelectorAll('.format-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===project.mode));const choices=allowedPanels();$('panelSelect').replaceChildren(...choices.map(([v,l])=>new Option(l,v)));if(!choices.some(([k])=>k===selectedPanel))selectedPanel=choices[0][0];$('panelSelect').value=selectedPanel;const controls=ensurePhotoControls(selectedPanel);$('zoom').value=controls.zoom;if($('fitSelect'))$('fitSelect').value=controls.fit;$('photoPositionX').value=controls.x;$('photoPosition').value=controls.y;$('brightness').value=controls.brightness;$('contrast').value=controls.contrast;$('flipPhoto').setAttribute('aria-pressed',String(controls.flip));$('photoToolStatus').textContent='Поворот: '+controls.rotate+'°'+(controls.flip?' • зеркальное отражение':'');renderSwatches();updatePhotoLabel();updateDetails();schedulePreview()}
function ensurePhotoControls(panel){
 const defaults={zoom:1,x:0,y:0,rotate:0,flip:false,brightness:100,contrast:100,fit:project.safeFit?'contain-blur':'cover'};
 project.photoControls??={};
 const c=project.photoControls[panel]||{};
 return project.photoControls[panel]={...defaults,...c};
}
function newProjectId(){return 'p'+Date.now()+Math.random().toString(16).slice(2,9)}
function numberTracksText(text){return lines(text).map((t,i)=>String(i+1).padStart(2,'0')+'. '+t.replace(/^\s*(?:\d{1,3}\s*[.):\-–—]\s*|[•*\-]\s*)/,'')).join('\n')}
function allowedPanels(){const m=project.mode;if(m==='cdFront')return [['front','Лицевая обложка']];if(m==='cdBack')return [['back','Задняя обложка']];if(m==='cassette')return [['front','Лицевая сторона'],['spine','Корешок кассеты'],['back','Задний клапан']];if(m==='cdSet')return [['front','Передняя сторона'],['back','Задняя сторона']];if(m==='booklet')return [['front','Передняя сторона'],['inside','Внутренняя сторона']];return [['front','Лицевая сторона'],['spine','Корешок кассеты'],['back','Задняя сторона'],['inside','Внутренняя сторона']]}
function updatePhotoLabel(){const exists=!!project.photos[selectedPanel];$('removePhoto').style.display=exists?'inline-block':'none';const label=document.querySelector('.upload-zone label b');label.textContent=exists?'Заменить фото':'Выбрать фото'}
function renderSwatches(){$('styleSwatches').replaceChildren(...STYLES.map((s,i)=>{const b=document.createElement('button');b.type='button';b.className='swatch'+(i===project.style?' selected':'');b.style.background=`linear-gradient(135deg,${s.colors[0]},${s.colors[1]})`;b.innerHTML='<b>'+s.name+'</b>';b.title='Стиль '+s.name;b.onclick=()=>{project.style=i;project.accent=s.accent;project.bw=false;$('accentColor').value=s.accent;$('bw').checked=false;renderSwatches();autosave()};return b}))}
function updateDetails(){updateWorkflowSummary();const mode=MODES[project.mode];const paper=mode.landscape?'A4 альбомный':'A4 книжный';const isCassette=project.mode==='cassette'||project.mode==='cassetteXL';$('duplexOption').hidden=!isCassette;$('previewReverse').hidden=!isCassette;$('previewReverse').textContent=previewBack?'Показать лицевую сторону':'Показать изнанку';if(!isCassette)previewBack=false;$('previewCaption').textContent=paper+' • '+mode.w+' × '+mode.h+' мм';$('panelLegend').replaceChildren(...mode.parts.map(t=>{let e=document.createElement('span');e.textContent=({front:'Передняя',back:'Задняя',inside:'Внутренняя',spine:'Корешок',spines:'2 корешка'})[t];return e}))}
function showStatus(s,error=false){$('status').textContent=s;$('status').className=error?'error':'';if(activeStep!=='print'&&!/^Проект сохраняется/.test(s)){const toast=$('globalToast');if(toast){toast.textContent=s;toast.className='toast'+(error?' error':'');toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,3700)}}}
async function renderQuickPreview(p,panel){
 const canvas=$('quickPreview');if(!canvas)return;
 const tape=p.mode==='cassette'||p.mode==='cassetteXL';
 const dims=panel==='spine'&&tape?[12.7,101.6]:panel==='back'&&tape?[25.4,101.6]:panel==='back'?[137.5,118]:(tape?[65.1,101.6]:[120,120]);
 const [w,h]=dims,ratio=w/h;
 const px=420;canvas.width=px;canvas.height=Math.round(px/ratio);
 const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#f3f5f8';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.scale(canvas.width/w,canvas.height/h);
 const imgs=await resolveImages(p);
 if(panel==='spine'&&tape)drawSpine(ctx,0,0,w,h,p,imgs);else if(panel==='back')drawBack(ctx,0,0,w,h,p,imgs,tape);
 else if(panel==='inside')drawInside(ctx,0,0,w,h,p,imgs);
 else drawFront(ctx,0,0,w,h,p,imgs);
 canvas.style.filter=p.bw?'grayscale(1)':'none';
 const names={front:'Лицевая сторона',spine:'Корешок кассеты',back:'Задняя сторона',inside:'Внутренняя сторона'};
 $('quickPreviewCaption').textContent=names[panel]||'Макет';
}
function schedulePreview(){if(previewPending)return;previewPending=true;requestAnimationFrame(async()=>{previewPending=false;const seq=++renderSeq;const current=project,part=selectedPanel;try{
 if(document.body.classList.contains('advanced-open')){if(activeStep==='review')await renderPage($('preview'),current,0,96,1,previewBack);if(activeStep==='design')await renderQuickPreview(current,part)}else{await renderWizardPreview(current)}
 if(seq!==renderSeq)return;
}catch(e){console.error(e);showStatus('Не удалось обновить предпросмотр: '+e.message,true)}})}
function sheetDimensions(p){return MODES[p.mode].landscape?[297,210]:[210,297]}
function artPlacements(p,count=1){const mode=MODES[p.mode],[paperW]=sheetDimensions(p);const mid=(paperW-mode.w)/2;
 if(p.mode==='cdSet')return[{type:'cdBack',x:(paperW-150)/2,y:12},{type:'cdFront',x:(paperW-120)/2,y:141}];
 const y1=(p.mode==='booklet')?44:(count===1)?(p.mode==='cassette'||p.mode==='cassetteXL'?65:p.mode==='cdFront'?55:55):17;
 const items=[{type:p.mode,x:mid,y:y1}];if(count===2){items.push({type:p.mode,x:mid,y:p.mode.startsWith('cassette')?151:143})}return items;
}
const safe=(s)=>String(s||'').trim();
const lines=(s)=>String(s||'').split(/\r?\n/).map(t=>t.trim()).filter(Boolean);
function fillRound(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()}
function ellipsisText(ctx,text,maxW){let s=String(text);if(ctx.measureText(s).width<=maxW)return s;while(s.length&&ctx.measureText(s+'…').width>maxW)s=s.slice(0,-1);return s+'…'}
function fontName(p){return({heavy:'Arial, sans-serif',classic:'Helvetica, Arial, sans-serif',serif:'Georgia, serif',mono:'Courier New, monospace',script:'Georgia, serif'})[p.font]||'Arial,sans-serif'}
function setFont(ctx,size,p,bold=false){ctx.font=`${p.font==='script'?'italic ':''}${bold?'900 ':'600 '}${size}px ${fontName(p)}`}
function fitText(ctx,s,maxW,initial,min,p,bold=false){let f=initial;while(f>min){setFont(ctx,f,p,bold);if(ctx.measureText(s).width<=maxW)break;f-=0.2}setFont(ctx,f,p,bold);return f}
function wrapText(ctx,s,width,maxLines=3){const words=String(s).split(/\s+/).filter(Boolean);if(!words.length)return[];const out=[];let line='';for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width<=width){line=test;continue}if(line)out.push(line);line=word;if(out.length>=maxLines-1)break}if(line)out.push(line);return out.slice(0,maxLines).map(t=>ellipsisText(ctx,t,width))}
async function loadImage(data){if(!data)return null;if(images.has(data))return images.get(data);const p=new Promise(resolve=>{let im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=data});images.set(data,p);if(images.size>12)images.delete(images.keys().next().value);return p}
async function resolveImages(p){const parts=['front','spine','back','inside'];const vals=await Promise.all(parts.map(t=>loadImage(p.photos[t])));return Object.fromEntries(parts.map((t,i)=>[t,vals[i]]))}
function clippedImage(ctx,img,x,y,w,h,options={}){
 if(!img)return false;
 const deg=([0,90,180,270].includes(+options.rotate)?+options.rotate:0);
 const turn=deg%180===90,iw=turn?img.height:img.width,ih=turn?img.width:img.height;
 const fit=['contain-blur','contain-solid','cover'].includes(options.fit)?options.fit:'cover';
 const zoom=Math.max(1,Math.min(2.5,Number(options.zoom)||1));
 const brightness=Math.max(50,Math.min(150,Number(options.brightness)||100));
 const contrast=Math.max(50,Math.min(150,Number(options.contrast)||100));
 const base=fit==='cover'?Math.max(w/iw,h/ih):Math.min(w/iw,h/ih);
 const ratio=base*zoom,dw=img.width*ratio,dh=img.height*ratio;
 const occupiedW=turn?dh:dw,occupiedH=turn?dw:dh;
 const spaceX=w-occupiedW,spaceY=h-occupiedH;
 const dx=(Number(options.x)||0)/100*(spaceX<0?-spaceX*.49:spaceX*.5);
 const dy=(Number(options.y)||0)/100*(spaceY<0?-spaceY*.49:spaceY*.5);
 const paint=(scale,opacity=1,blur=false)=>{
  ctx.save();ctx.translate(x+w/2+(blur?0:dx),y+h/2+(blur?0:dy));
  ctx.rotate(deg*Math.PI/180);if(options.flip)ctx.scale(-1,1);
  ctx.globalAlpha=opacity;
  ctx.filter=(blur?'blur(3px) ':'')+`brightness(${brightness}%) contrast(${contrast}%)`;
  ctx.drawImage(img,-img.width*scale/2,-img.height*scale/2,img.width*scale,img.height*scale);
  ctx.restore();
 };
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 if(fit==='contain-blur'){
  // Background may be softly blurred, but the actual source remains entirely visible and unwarped.
  const cover=Math.max(w/iw,h/ih)*1.12;
  paint(cover,0.64,true);
 }
 paint(ratio);
 ctx.restore();return true;
}
function styleBackground(ctx,x,y,w,h,p){if(p.decorate==='clean'||p.decorate==='minimal'){ctx.fillStyle=p.decorate==='clean'?'#f1f1f1':'#e5eaf0';ctx.fillRect(x,y,w,h);return}const st=STYLES[p.style]||STYLES[0];const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,st.colors[0]);g.addColorStop(1,st.colors[1]);ctx.fillStyle=g;ctx.fillRect(x,y,w,h);ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.globalAlpha=.14;ctx.strokeStyle=p.accent;ctx.lineWidth=.6;for(let i=-180;i<250;i+=9){ctx.beginPath();ctx.moveTo(x+i,y);ctx.lineTo(x+i+w*.85,y+h);ctx.stroke()}ctx.globalAlpha=.26;ctx.strokeStyle=p.accent;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x+w*.72,y+h*.1,w*.42,0,Math.PI*2);ctx.stroke();ctx.restore()}

async function recoverCassetteSpine(p){
 if(!p.mode?.startsWith('cassette')||p.photos?.spine||!p.photos?.back)return false;
 const im=await loadImage(p.photos.back);
 if(!im||im.width/im.height>=.185)return false;
 p.photos.spine=p.photos.back;p.photos.back=null;
 p.photoControls??={};p.photoControls.spine={...ensurePhotoControls('spine'),fit:'contain-blur'};
 return true;
}
function cassetteFlapBackground(ctx,x,y,w,h,img){
 // An unassigned rear flap gets a quiet continuation, never a duplicate/cropped face.
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 const g=ctx.createLinearGradient(x,y,x+w,y+h);
 g.addColorStop(0,'#111824');g.addColorStop(.52,'#0a111c');g.addColorStop(1,'#25101b');
 ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
 ctx.globalAlpha=.37;ctx.fillStyle='#932332';
 ctx.save();ctx.translate(x+w*.68,y+h*.73);ctx.rotate(-.38);ctx.fillRect(-w*.58,-h*.13,w*1.3,h*.09);ctx.restore();
 ctx.globalAlpha=1;ctx.fillStyle='#ad2938';ctx.fillRect(x,y,w,1.0);
 ctx.restore();
}

function drawFront(ctx,x,y,w,h,p,img){const st=STYLES[p.style]||STYLES[0];ctx.save();styleBackground(ctx,x,y,w,h,p);const hasPhoto=clippedImage(ctx,img.front,x,y,w,h,p.photoControls.front);if(p.showText===false){ctx.restore();return}if(hasPhoto){const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'#09081980');g.addColorStop(.28,'#00000010');g.addColorStop(.52,'#00000026');g.addColorStop(1,'#080614e8');ctx.fillStyle=g;ctx.fillRect(x,y,w,h)}ctx.fillStyle=p.accent;ctx.fillRect(x+3.6,y+4,Math.min(w*.25,15),1.1);ctx.textAlign='left';ctx.textBaseline='top';const artist=safe(p.title);fitText(ctx,artist,w-8,Math.min(5.2,w*.08),2.8,p,true);ctx.fillStyle=hasPhoto?'white':st.color;ctx.shadowColor=hasPhoto?'#000':'transparent';ctx.shadowBlur=1.2;ctx.fillText(ellipsisText(ctx,artist,w-8),x+4,y+8);ctx.shadowBlur=0;const titleY=y+h*(p.titlePos/100);const big=Math.max(4.5,Math.min(w*.135,10.5))*(p.titleScale/100);setFont(ctx,big,p,true);const titleLines=wrapText(ctx,safe(p.album),w-8,3);ctx.textAlign='left';ctx.textBaseline='alphabetic';let lineH=big*1.12;const start=Math.min(y+h-12-titleLines.length*lineH,Math.max(y+23,titleY));const albColor=hasPhoto?'white':st.color;ctx.fillStyle=albColor;ctx.shadowColor=hasPhoto?'#000000bd':'transparent';ctx.shadowBlur=hasPhoto?2.5:0;titleLines.forEach((s,i)=>{const font=fitText(ctx,s,w-8,big,Math.max(3.2,big*.55),p,true);ctx.fillText(s,x+4,start+i*lineH+font)});ctx.shadowBlur=0;ctx.fillStyle=p.accent;ctx.fillRect(x+4,y+h-10,Math.min(w-8,13),.9);setFont(ctx,Math.min(2.6,w*.05),p,true);ctx.textBaseline='alphabetic';ctx.fillStyle=hasPhoto?'#fefefe':st.color;ctx.fillText(ellipsisText(ctx,safe(p.edition),w-12),x+4,y+h-4);ctx.textAlign='right';ctx.fillText(ellipsisText(ctx,safe(p.year),w*.25),x+w-4,y+h-4);ctx.restore()}
function drawBack(ctx,x,y,w,h,p,img,small=false){const st=STYLES[p.style]||STYLES[0];ctx.save();styleBackground(ctx,x,y,w,h,p);if(p.mode.startsWith('cassette')&&!img.back&&img.front)cassetteFlapBackground(ctx,x,y,w,h,img);const hasPhoto=clippedImage(ctx,img.back,x,y,w,h,p.photoControls.back);if(p.showText===false){ctx.restore();return}if(hasPhoto){ctx.fillStyle='#05050cc5';ctx.fillRect(x,y,w,h)}ctx.fillStyle=hasPhoto?'#fff':st.color;ctx.textBaseline='alphabetic';ctx.textAlign='left';let margin=Math.min(5,w*.11);let head=Math.min(5.6,w*.08);if(small)head=Math.min(3,w*.13);fitText(ctx,safe(p.album),w-margin*2,head,1.8,p,true);ctx.fillText(ellipsisText(ctx,safe(p.album),w-margin*2),x+margin,y+Math.max(9,head+3));ctx.fillStyle=p.accent;ctx.fillRect(x+margin,y+Math.max(11,head+5),Math.min(w-margin*2,19),.7);
 const songs=lines(p.tracks),n=songs.length;const top=Math.max(18,head+10);const footer=small?9:13;const usable=h-top-footer;let sz=small?Math.min(1.65,w*.055):Math.min(3.1,w*.048);sz=Math.min(sz,usable/Math.max(1,n)*.77);sz=Math.max(Math.min(1.45,sz),sz);setFont(ctx,sz,p);ctx.fillStyle=hasPhoto?'#fff':st.color;const rowH=Math.max(sz*1.4,Math.min(6,usable/Math.max(1,n)));let maxLines=Math.min(n,Math.floor(usable/rowH));if(small)maxLines=Math.min(maxLines,17);for(let i=0;i<maxLines;i++){const t=/^\d+[.)\-\s]/.test(songs[i])?songs[i]:(String(i+1).padStart(2,'0')+'. '+songs[i]);ctx.fillText(ellipsisText(ctx,t,w-margin*2),x+margin,y+top+i*rowH)}if(maxLines<n){ctx.fillStyle=p.accent;setFont(ctx,small?1.5:2.5,p,true);ctx.fillText('+'+(n-maxLines)+' треков',x+margin,y+top+maxLines*rowH)}setFont(ctx,small?1.6:2.3,p);ctx.fillStyle=hasPhoto?'#d3d3d9':st.color;ctx.fillText(ellipsisText(ctx,safe(p.year)+'  •  '+safe(p.edition),w-margin*2),x+margin,y+h-4);ctx.restore()}
function drawInside(ctx,x,y,w,h,p,img){const st=STYLES[p.style]||STYLES[0];styleBackground(ctx,x,y,w,h,p);const hasPhoto=clippedImage(ctx,img.inside,x,y,w,h,p.photoControls.inside);if(p.showText===false)return;if(hasPhoto){ctx.fillStyle='#101022aa';ctx.fillRect(x,y,w,h)}ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle=p.accent;setFont(ctx,Math.min(5,w*.1),p,true);if(safe(p.notes))ctx.fillText('ПРИМЕЧАНИЯ',x+4,y+11);ctx.fillStyle=hasPhoto?'white':st.color;setFont(ctx,Math.min(3,w*.05),p);const words=wrapText(ctx,safe(p.notes),w-9,Math.max(4,Math.floor((h-25)/4)));words.forEach((s,i)=>ctx.fillText(s,x+4,y+20+i*4));const songs=lines(p.tracks);if(songs.length){setFont(ctx,2.45,p);let n=Math.min(8,songs.length);for(let i=0;i<n;i++)ctx.fillText(ellipsisText(ctx,songs[i],w-9),x+4,y+h-7-(n-i-1)*3.7)}}
function drawSpine(ctx,x,y,w,h,p,img){const st=STYLES[p.style]||STYLES[0];ctx.save();styleBackground(ctx,x,y,w,h,p);if(img?.spine){clippedImage(ctx,img.spine,x,y,w,h,p.photoControls.spine);ctx.restore();return}if(p.mode.startsWith('cassette')&&img?.front)cassetteFlapBackground(ctx,x,y,w,h,img);if(p.showText===false){ctx.restore();return}ctx.translate(x+w/2,y+h/2);ctx.rotate(-Math.PI/2);ctx.textAlign='center';ctx.textBaseline='middle';const txt=[safe(p.title),safe(p.album)].filter(Boolean).join(' — ');fitText(ctx,txt,h-8,Math.min(3.1,w*.52),1.8,p,true);ctx.fillStyle=st.color;ctx.fillText(ellipsisText(ctx,txt,h-8),0,0);ctx.restore()}
function drawFold(ctx,x,y,h){ctx.save();ctx.setLineDash([1.25,1.35]);ctx.lineWidth=.23;ctx.strokeStyle='#12a9d0';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+h);ctx.stroke();ctx.restore()}
function drawCut(ctx,x,y,w,h){ctx.save();ctx.lineWidth=.19;ctx.strokeStyle='#555';const m=2.8,g=.75;for(const px of [x,x+w]){for(const py of [y,y+h]){ctx.beginPath();ctx.moveTo(px,py-MAX(g,.5)-m);ctx.lineTo(px,py-g);ctx.moveTo(px,py+g);ctx.lineTo(px,py+g+m);ctx.moveTo(px-g-m,py);ctx.lineTo(px-g,py);ctx.moveTo(px+g,py);ctx.lineTo(px+g+m,py);ctx.stroke()}}ctx.restore()}
function MAX(a,b){return Math.max(a,b)}
function art(ctx,type,x,y,p,img){ctx.save();let w,h;if(type==='cassette'||type==='cassetteXL'){w=MODES[type].w;h=101.6;const frontX=x+25.4+12.7;drawBack(ctx,x,y,25.4,h,p,img,true);drawSpine(ctx,x+25.4,y,12.7,h,p,img);drawFront(ctx,frontX,y,65.1,h,p,img);if(type==='cassetteXL')drawInside(ctx,frontX+65.1,y,65.1,h,p,img);if(p.guides){drawFold(ctx,x+25.4,y,h);drawFold(ctx,frontX,y,h);if(type==='cassetteXL')drawFold(ctx,frontX+65.1,y,h)}}else if(type==='cdFront'){w=120;h=120;drawFront(ctx,x,y,w,h,p,img)}else if(type==='cdBack'){w=150;h=118;const spine=6.25;drawSpine(ctx,x,y,spine,h,p,img);drawBack(ctx,x+spine,y,w-2*spine,h,p,img,false);drawSpine(ctx,x+w-spine,y,spine,h,p,img);if(p.guides){drawFold(ctx,x+spine,y,h);drawFold(ctx,x+w-spine,y,h)}}else if(type==='booklet'){w=240;h=120;drawInside(ctx,x,y,120,h,p,img);drawFront(ctx,x+120,y,120,h,p,img);if(p.guides)drawFold(ctx,x+120,y,h)}if(p.guides)drawCut(ctx,x,y,w,h);ctx.restore()}
function artReverse(ctx,type,x,y,p,img){
 const total=MODES[type].w, h=101.6;
 // On a duplex long-edge flip, the positions of the panels swap horizontally.
 // The typography is drawn normally rather than mirrored, so both sides remain readable.
 const mirror=(off,width)=>x+total-off-width;
 const frontOffset=38.1;
 drawInside(ctx,mirror(frontOffset,65.1),y,65.1,h,p,img);
 drawBack(ctx,mirror(0,25.4),y,25.4,h,p,img,true);
 styleBackground(ctx,mirror(25.4,12.7),y,12.7,h,p);
 if(type==='cassetteXL')drawBack(ctx,mirror(103.2,65.1),y,65.1,h,p,img);
 if(p.guides){
  drawCut(ctx,x,y,total,h);
  [25.4,38.1,...(type==='cassetteXL'?[103.2]:[])].forEach(pos=>drawFold(ctx,x+total-pos,y,h));
 }
}
// Separate cassette inserts. Panel dimensions are measured in physical millimetres.
const CASSETTE_PRINT_PARTS={
 full:{label:'Весь вкладыш'},
 front:{label:'Только лицевая сторона',w:65.1,h:101.6},
 spine:{label:'Только узкий корешок',w:12.7,h:101.6},
 back:{label:'Только задний клапан',w:25.4,h:101.6},
 inside:{label:'Только внутренний разворот',w:65.1,h:101.6}
};
function getPrintPart(p){
 if(!p.mode?.startsWith('cassette'))return 'full';
 const part=p.printPart||'full';
 return part==='inside'&&p.mode!=='cassetteXL'?'full':CASSETTE_PRINT_PARTS[part]?part:'full';
}
function printPageCapacity(p){return getPrintPart(p)==='full'?MODES[p.mode].perSheet:2}
function drawCassettePart(ctx,part,x,y,p,img){
 const {w,h}=CASSETTE_PRINT_PARTS[part];
 if(part==='front')drawFront(ctx,x,y,w,h,p,img);
 else if(part==='spine')drawSpine(ctx,x,y,w,h,p,img);
 else if(part==='back')drawBack(ctx,x,y,w,h,p,img,true);
 else if(part==='inside')drawInside(ctx,x,y,w,h,p,img);
 if(p.guides)drawCut(ctx,x,y,w,h);
}
async function renderPage(canvas,p,pageIndex,dpi,countOverride,backSide=false){const [paperW,paperH]=sheetDimensions(p);let per=printPageCapacity(p);let copies=Number(countOverride??p.copies);let start=pageIndex*per;let thisPage=Math.min(per,Math.max(0,copies-start));const ppm=dpi/25.4;canvas.width=Math.round(paperW*ppm);canvas.height=Math.round(paperH*ppm);const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:!!p.bw});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.scale(canvas.width/paperW,canvas.height/paperH);const loaded=await resolveImages(p);
 const printPart=getPrintPart(p);
 if(printPart!=='full'&&!backSide){
  const {w,h}=CASSETTE_PRINT_PARTS[printPart];
  const xs=(paperW-w)/2;
  const ys=thisPage===1?[(paperH-h)/2]:[22,155];
  ys.forEach(y=>drawCassettePart(ctx,printPart,xs,y,p,loaded));
 }else{
  const layout=artPlacements(p,thisPage);
  for(const item of layout){if(backSide&&(item.type==='cassette'||item.type==='cassetteXL')){artReverse(ctx,item.type,paperW-item.x-MODES[item.type].w,item.y,p,loaded)}else art(ctx,item.type,item.x,item.y,p,loaded)}
 };if(p.calibration){let x=17,y=paperH-13;ctx.strokeStyle='#252525';ctx.lineWidth=.25;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+50,y);ctx.moveTo(x,y-1.2);ctx.lineTo(x,y+1.2);ctx.moveTo(x+50,y-1.2);ctx.lineTo(x+50,y+1.2);ctx.stroke();ctx.fillStyle='#252525';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='2.7px Arial';ctx.fillText('50 мм · проверьте размер линейкой',x,y-2)}ctx.textAlign='right';ctx.textBaseline='alphabetic';ctx.font='2.65px Arial';ctx.fillStyle='#888';ctx.fillText('A4  •  100% / фактический размер',paperW-13,paperH-11);if(p.bw){const px=ctx.getImageData(0,0,canvas.width,canvas.height);const a=px.data;for(let i=0;i<a.length;i+=4){const v=(.299*a[i]+.587*a[i+1]+.114*a[i+2])|0;a[i]=a[i+1]=a[i+2]=v}ctx.putImageData(px,0,0)}return canvas}
async function renderProofPage(canvas,dpi=200){
 const paperW=210,paperH=297,ppm=dpi/25.4;
 canvas.width=Math.round(paperW*ppm);canvas.height=Math.round(paperH*ppm);
 const c=canvas.getContext('2d',{alpha:false});c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);c.scale(canvas.width/paperW,canvas.height/paperH);
 c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#121212';c.font='bold 7px Arial';c.fillText('ЛАКОБЛОЖКИ · ПРОВЕРКА МАСШТАБА',15,23);
 c.font='3.3px Arial';c.fillText('Печатать 100% / фактический размер. Измерить линейкой.',15,31);
 c.lineWidth=.25;c.strokeStyle='#111';c.strokeRect(22,43,100,100);c.beginPath();c.moveTo(22,43);c.lineTo(122,143);c.moveTo(122,43);c.lineTo(22,143);c.stroke();
 c.font='bold 4px Arial';c.fillText('100 мм',54,40);c.save();c.translate(18,106);c.rotate(-Math.PI/2);c.fillText('100 мм',0,0);c.restore();
 c.font='3.3px Arial';c.fillText('Если квадрат не 100 × 100 мм — принтер меняет масштаб.',15,158);
 c.beginPath();c.moveTo(20,183);c.lineTo(170,183);for(let i=0;i<=150;i+=5){let x=20+i;c.moveTo(x,183);c.lineTo(x,183-(i%50===0?4:i%10===0?2.5:1.3));}c.stroke();
 c.font='3px Arial';for(let i=0;i<=150;i+=50)c.fillText(i+' мм',20+i-3,191);
 c.fillText('Проверка чернил: цветная шкала',15,212);
 const colors=['#101321','#e84e92','#d68a43','#72abd6','#54be92','#ffffff'];colors.forEach((color,i)=>{c.fillStyle=color;c.fillRect(15+i*29,217,29,18);c.strokeRect(15+i*29,217,29,18)});
 c.fillStyle='#111';c.font='3.1px Arial';c.fillText('Для кассет/CD точный масштаб важнее качества фотографии.',15,247);
 c.fillText('Совет: используйте бумагу A4 и отключите «вписать в лист».',15,254);
 return canvas;
}
async function exportProof(){
 try{$('proofBtn').disabled=true;showStatus('Готовлю контрольный лист принтера…');const c=document.createElement('canvas');await renderProofPage(c,200);const jpg=bytesFromBase64(c.toDataURL('image/jpeg',.92).split(',')[1]);const blob=pdfPages([{jpg,width:c.width,height:c.height,paperW:210,paperH:297}]);offerDownload(blob,'ЛакОбложки_Проверка_100мм_A4.pdf');showStatus('Контрольный PDF создан. Измерьте квадрат 100 × 100 мм после печати.');c.width=c.height=1}
 catch(e){showStatus('Ошибка контрольного PDF: '+e.message,true)}finally{$('proofBtn').disabled=false}
}
function textBytes(str){return new TextEncoder().encode(str)}
function concatArrays(arr){let total=arr.reduce((n,a)=>n+a.length,0),u=new Uint8Array(total),k=0;for(const a of arr){u.set(a,k);k+=a.length}return u}
function bytesFromBase64(s){const raw=atob(s);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
function pdfPages(pages){let chunks=[textBytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];let offset=chunks[0].length,refs=[0];const addObject=(id,segments)=>{refs[id]=offset;const all=concatArrays([textBytes(id+' 0 obj\n'),...segments,textBytes('\nendobj\n')]);chunks.push(all);offset+=all.length};const kids=pages.map((_,i)=>3+i*3);const count=2+pages.length*3;addObject(1,[textBytes('<< /Type /Catalog /Pages 2 0 R >>')]);addObject(2,[textBytes(`<< /Type /Pages /Count ${pages.length} /Kids [${kids.map(i=>i+' 0 R').join(' ')}] >>`)]);
 pages.forEach((a,i)=>{let pageID=3+i*3,imID=pageID+1,contentID=pageID+2;const pw=a.paperW*72/25.4,ph=a.paperH*72/25.4;const fmt=n=>Number(n).toFixed(5);const stream=`q\n${fmt(pw)} 0 0 ${fmt(ph)} 0 0 cm\n/Img Do\nQ\n`;addObject(pageID,[textBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(pw)} ${fmt(ph)}] /Resources << /XObject << /Img ${imID} 0 R >> >> /Contents ${contentID} 0 R >>`)]);addObject(imID,[textBytes(`<< /Type /XObject /Subtype /Image /Width ${a.width} /Height ${a.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${a.jpg.length} >>\nstream\n`),a.jpg,textBytes('\nendstream')]);addObject(contentID,[textBytes(`<< /Length ${textBytes(stream).length} >>\nstream\n${stream}endstream`)])});const xrefStart=offset;let xref=`xref\n0 ${count+1}\n0000000000 65535 f \n`;for(let i=1;i<=count;i++)xref+=`${String(refs[i]).padStart(10,'0')} 00000 n \n`;xref+=`trailer\n<< /Size ${count+1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;chunks.push(textBytes(xref));return new Blob(chunks,{type:'application/pdf'})}
async function makePDF(){
 const per=printPageCapacity(project),count=Number(project.copies),pages=[],dpi=Number(project.quality);
 const isCassette=project.mode==='cassette'||project.mode==='cassetteXL';
 const doubleSided=!!project.duplexCassette&&isCassette&&getPrintPart(project)==='full';
 const sheets=Math.ceil(count/per),totalPages=sheets*(doubleSided?2:1);
 const snapshot=structuredClone(project);
 for(let i=0;i<sheets;i++){
  for(let side=0;side<(doubleSided?2:1);side++){
   showStatus(`Создание PDF: страница ${pages.length+1} из ${totalPages}…`);
   await new Promise(r=>setTimeout(r,25));
   const c=document.createElement('canvas');await renderPage(c,snapshot,i,dpi,undefined,side===1);
   const jpeg=bytesFromBase64(c.toDataURL('image/jpeg',.92).split(',')[1]);
   pages.push({jpg:jpeg,width:c.width,height:c.height,paperW:sheetDimensions(snapshot)[0],paperH:sheetDimensions(snapshot)[1]});
   c.width=c.height=1;
  }
 }
 const pdf=pdfPages(pages);
 const fileName=('Обложки_'+(safe(snapshot.album)||'album').replace(/[\/:*?"<>|]/g,'_').slice(0,55)+'_'+snapshot.mode+(getPrintPart(snapshot)!=='full'?'_'+getPrintPart(snapshot):'')+(doubleSided?'_2-стороны':'')+'.pdf');
 lastPdf={blob:pdf,name:fileName};
 showStatus(`Готово: ${pages.length} стр. A4, ${sheets} лист(ов), ${(pdf.size/1048576).toFixed(1)} МБ.`);
 return lastPdf;
}

async function exportPNG(){
 const button=$('pngBtn');button.disabled=true;
 try{
  showStatus('Создаю PNG A4 — 200 DPI…');
  const snapshot=structuredClone(project);
  const canvas=document.createElement('canvas');
  await renderPage(canvas,snapshot,0,200,1,false);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG не создан')),'image/png'));
  const filename='Обложки_'+(safe(snapshot.album)||'album').replace(/[\/:*?"<>|]/g,'_').slice(0,55)+'_A4.png';
  offerDownload(blob,filename);
  canvas.width=canvas.height=1;
  showStatus('PNG сохранён. Для печати в точном масштабе используй PDF.');
 }catch(e){showStatus('Ошибка PNG: '+e.message,true)}finally{button.disabled=false}
}
function offerDownload(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),45000)}
async function exportClick(share){const btn=$('exportBtn');try{btn.disabled=true;const pdf=lastPdf||await makePDF();if(share){const file=new File([pdf.blob],pdf.name,{type:'application/pdf'});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Готовые обложки A4'});return}offerDownload(pdf.blob,pdf.name);showStatus('PDF создан. Открой его и выбери «Поделиться» → «Печать».')}else{offerDownload(pdf.blob,pdf.name)}}catch(e){if(e.name!=='AbortError')showStatus('Не удалось создать PDF: '+e.message,true)}finally{btn.disabled=false}}
async function photoToDataURL(file){if(file.size>40*1024*1024)throw new Error('Фото больше 40 МБ — выбери другое');let url=await new Promise((res,rej)=>{let fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(new Error('Не удалось прочитать фото'));fr.readAsDataURL(file)});const im=await loadImage(url);if(!im)throw new Error('Неизвестный формат фото. Попробуй JPG/PNG');let max=2400,f=Math.min(1,max/Math.max(im.width,im.height));let c=document.createElement('canvas');c.width=Math.round(im.width*f);c.height=Math.round(im.height*f);c.getContext('2d').drawImage(im,0,0,c.width,c.height);let out=c.toDataURL('image/jpeg',.89);c.width=c.height=1;return out}
async function exportAllProjects(){
 await storeProject(project);
 const all=await getAllProjects();
 if(!all.length){showStatus('В коллекции пока нет проектов.',true);return}
 const archive={application:'lacovers',version:3,kind:'collection',exportedAt:new Date().toISOString(),projects:all};
 const bytes=new Blob([JSON.stringify(archive)],{type:'application/json'});
 offerDownload(bytes,'ЛакОбложки_ВсеПроекты_'+new Date().toISOString().slice(0,10)+'.json');
 showStatus('Архив: '+all.length+' проект(ов), '+(bytes.size/1048576).toFixed(1)+' МБ. Сохрани в «Файлы».');
}
async function importAllProjects(file){
 if(file.size>150*1024*1024)throw new Error('Архив больше 150 МБ — импортируй проекты по одному');
 const data=JSON.parse(await file.text());
 if(data.application!=='lacovers'||data.kind!=='collection'||!Array.isArray(data.projects))throw new Error('Это не архив коллекции ЛакОбложек');
 if(data.projects.length>300)throw new Error('Слишком много проектов для одного импорта (максимум 300)');
 const valid=data.projects.filter(p=>p&&typeof p==='object'&&MODES[p.mode]&&typeof p.album==='string');
 if(!valid.length)throw new Error('В архиве нет проектов с поддерживаемыми форматами');
 if(!confirm('Добавить '+valid.length+' проект(ов) к текущей коллекции? Существующие проекты не будут заменены.'))return;
 await storeProject(project);
 let added=0,failed=0,first=null;
 for(const original of valid){
  const imported={...defaultProject(),...original,id:newProjectId(),created:Date.now(),updated:Date.now()};
  imported.photos={front:null,spine:null,back:null,inside:null,...original.photos};
  imported.photoControls={...defaultProject().photoControls,...original.photoControls};
  try{if(await storeProject(imported)){added++;first??=imported}else failed++}catch(e){failed++}
 }
 if(first){project=first;selectedPanel='front';storageSet('lacover-current',project.id);hydrate();refreshProjects()}
 showStatus('Восстановлено: '+added+' проект(ов).'+(failed?' Ошибок: '+failed+'. Проверь свободную память.':''),failed>0);
}
function bindForm(){const mapping={fontSelect:'font',accentColor:'accent',projectTitle:'title',albumTitle:'album',year:'year',edition:'edition',tracks:'tracks',notes:'notes',titlePos:'titlePos',titleScale:'titleScale',bw:'bw',guides:'guides',calibration:'calibration',cassetteDuplex:'duplexCassette',copies:'copies',quality:'quality'};for(const [id,key] of Object.entries(mapping)){$(id).addEventListener(id==='bw'||id==='guides'||id==='calibration'||id==='cassetteDuplex'||id==='copies'||id==='quality'?'change':'input',e=>{project[key]=e.target.type==='checkbox'?e.target.checked:e.target.value;if(id==='albumTitle')project.name=project.album;autosave()})}
 $('formatGrid').addEventListener('click',e=>{const btn=e.target.closest('[data-mode]');if(!btn)return;project.mode=btn.dataset.mode;hydrate();autosave()});$('panelSelect').addEventListener('change',e=>{selectedPanel=e.target.value;hydrate()});$('fitSelect').addEventListener('change',e=>{ensurePhotoControls(selectedPanel).fit=e.target.value;autosave()});$('zoom').addEventListener('input',e=>{project.photoControls[selectedPanel].zoom=+e.target.value;autosave()});$('photoPositionX').addEventListener('input',e=>{project.photoControls[selectedPanel].x=+e.target.value;autosave()});$('photoPosition').addEventListener('input',e=>{ensurePhotoControls(selectedPanel).y=+e.target.value;autosave()});
 for(const name of ['brightness','contrast'])$(name).addEventListener('input',e=>{ensurePhotoControls(selectedPanel)[name]=+e.target.value;autosave()});
 $('rotatePhoto').onclick=()=>{const c=ensurePhotoControls(selectedPanel);c.rotate=(c.rotate+90)%360;hydrate();autosave()};
 $('flipPhoto').onclick=()=>{const c=ensurePhotoControls(selectedPanel);c.flip=!c.flip;hydrate();autosave()};
 $('resetPhoto').onclick=()=>{project.photoControls[selectedPanel]={zoom:1,x:0,y:0,rotate:0,flip:false,brightness:100,contrast:100,fit:project.safeFit?'contain-blur':'cover'};hydrate();autosave()};
 $('randomStyle').onclick=()=>{const previous=project.style;project.style=(previous+1+Math.floor(Math.random()*(STYLES.length-1)))%STYLES.length;project.accent=STYLES[project.style].accent;project.bw=false;hydrate();autosave();showStatus('Новый дизайн применён. Фото и надписи сохранены.')};
 $('numberTracks').onclick=()=>{const initial=project.tracks||'';if(!initial.trim()){showStatus('Впиши названия песен — нумерация появится автоматически.',true);return}const updated=numberTracksText(initial);project.tracks=updated;$('tracks').value=updated;autosave();showStatus('Песни пронумерованы: '+lines(updated).length)};
 $('imageInput').addEventListener('change',async e=>{if(!e.target.files?.length)return;const target=selectedPanel;showStatus('Обрабатываю фотографию…');try{project.photos[target]=await photoToDataURL(e.target.files[0]);updatePhotoLabel();autosave();showStatus('Фото добавлено и сохранено на устройстве.')}catch(err){showStatus(err.message,true)}e.target.value=''});$('removePhoto').onclick=()=>{project.photos[selectedPanel]=null;updatePhotoLabel();autosave()};$('exportBtn').onclick=()=>exportClick(false);$('proofBtn').onclick=exportProof;$('previewReverse').onclick=()=>{previewBack=!previewBack;updateDetails();schedulePreview()};$('shareBtn').onclick=()=>exportClick(true);$('pngBtn').onclick=exportPNG;$('infoSize').onclick=()=>$('helpDialog').showModal();$('helpBtn').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=$('okHelp').onclick=()=>$('helpDialog').close();$('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog'))$('helpDialog').close()});
 $('newBtn').onclick=async()=>{await storeProject(project);project=defaultProject();selectedPanel='front';await storeProject(project);storageSet('lacover-current',project.id);await refreshProjects();hydrate();showStatus('Новый проект создан.')};$('duplicateBtn').onclick=async()=>{let p=structuredClone(project);p.id='p'+Date.now();p.name=(project.album||'Альбом')+' — копия';p.album=p.name;p.updated=Date.now();project=p;await storeProject(project);storageSet('lacover-current',project.id);refreshProjects();hydrate()};$('deleteBtn').onclick=async()=>{if(!confirm('Удалить этот проект вместе с его фотографиями?'))return;await removeProject(project.id);let a=await getAllProjects();project=a.sort((x,y)=>y.updated-x.updated)[0]||defaultProject();await storeProject(project);selectedPanel='front';storageSet('lacover-current',project.id);refreshProjects();hydrate()};$('projectSelect').addEventListener('change',async e=>{clearTimeout(saveTimer);await storeProject(project);const a=await getAllProjects();const p=a.find(x=>x.id===e.target.value);if(!p)return;project=p;project.photos={front:null,spine:null,back:null,inside:null,...project.photos};await recoverCassetteSpine(project);selectedPanel='front';storageSet('lacover-current',project.id);hydrate();wizardStarted=true;wizardMedia=project.mode.startsWith('cassette')?'cassette':'cd';wizardFormatPicked=true;wizardKey='format';renderWizard()});
 $('backupAllBtn').onclick=()=>exportAllProjects().catch(e=>showStatus('Ошибка архива: '+e.message,true));
 $('restoreAllInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{await importAllProjects(file)}catch(err){showStatus('Ошибка восстановления коллекции: '+err.message,true)}e.target.value=''});
 $('backupBtn').onclick=()=>{const json=JSON.stringify({application:'lacovers',version:1,project},null,2);offerDownload(new Blob([json],{type:'application/json'}),'Проект_'+(project.album||'Обложки')+'.json');showStatus('Резервная копия проекта сохранена.')};$('restoreInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.application!=='lacovers'||!data.project?.mode||!MODES[data.project.mode])throw new Error('Неизвестный файл проекта');project={...defaultProject(),...data.project,id:'p'+Date.now(),updated:Date.now()};project.photos={front:null,spine:null,back:null,inside:null,...data.project.photos};project.photoControls={...defaultProject().photoControls,...data.project.photoControls};for(const key of ['front','spine','back','inside'])ensurePhotoControls(key);await recoverCassetteSpine(project);await storeProject(project);storageSet('lacover-current',project.id);refreshProjects();hydrate();showStatus('Проект восстановлен.')}catch(err){showStatus('Ошибка импорта: '+err.message,true)}e.target.value=''})}
// UI 4.0: compact, task-focused workflow. The printing engine and IndexedDB schema remain unchanged.
const STEP_NAMES={format:'Формат',design:'Дизайн',review:'Проверка',print:'Печать'};
const STEP_DETAILS={format:'Выбери тип коробки',design:'Фото, название и оформление',review:'Посмотри лист A4',print:'Получить PDF'};
function updateWorkflowSummary(){
 const mode=MODES[project.mode];if(!mode)return;
 const name=mode.name;
 if($('selectedFormatName'))$('selectedFormatName').textContent=name;
 if($('selectedFormatDetail'))$('selectedFormatDetail').textContent=mode.w+' × '+mode.h+' мм · '+(mode.landscape?'A4 альбомный':'A4 книжный');
 if($('printFormatName'))$('printFormatName').textContent=name;
 if($('printFormatDims'))$('printFormatDims').textContent=mode.w+' × '+mode.h+' мм · PDF A4 · масштаб 1:1';
 if($('bottomStepTitle'))$('bottomStepTitle').textContent=STEP_NAMES[activeStep];
 if($('bottomStepDetail'))$('bottomStepDetail').textContent=STEP_DETAILS[activeStep];
 if($('bottomNext'))$('bottomNext').textContent=activeStep==='print'?'Создать PDF ↗':'Продолжить →';
}
function setStep(step,shouldScroll=true){
 if(!STEP_NAMES[step])return;
 activeStep=step;
 document.querySelectorAll('[data-step-panel]').forEach(el=>el.hidden=el.dataset.stepPanel!==step);
 document.querySelectorAll('[data-step]').forEach(btn=>{const on=btn.dataset.step===step;btn.classList.toggle('active',on);if(on)btn.setAttribute('aria-current','step');else btn.removeAttribute('aria-current')});
 updateWorkflowSummary();schedulePreview();
 if(shouldScroll){const focused=document.activeElement;if(focused instanceof HTMLElement&&focused!==document.body)focused.blur();window.scrollTo({top:0,behavior:'smooth'})}
}
function bindWorkflow(){
 document.querySelectorAll('[data-step]').forEach(btn=>btn.addEventListener('click',()=>setStep(btn.dataset.step)));
 document.querySelectorAll('[data-goto]').forEach(btn=>btn.addEventListener('click',()=>setStep(btn.dataset.goto)));
 $('bottomNext').addEventListener('click',async()=>{
 if(activeStep==='print'){
  const b=$('bottomNext');b.disabled=true;
  try{await exportClick(false)}finally{b.disabled=false}
 }else{
  const ids=['format','design','review','print'];setStep(ids[Math.min(3,ids.indexOf(activeStep)+1)]);
 }
 });
}

// ────── v5 guided editor ──────
const WIZARD_TYPES={cassette:'Кассета',cd:'Компакт-диск'};
const WIZARD_FORMATS={cassette:['cassette','cassetteXL'],cd:['cdSet','cdFront','cdBack','booklet']};
let wizardMedia='',wizardFormatPicked=false,wizardKey='start',wizardStarted=false;
const htmlEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function wizPhotoPanels(mode=project.mode){if(mode==='cdFront')return ['front'];if(mode==='cdBack')return ['back'];if(mode==='booklet')return ['front','inside'];if(mode==='cassetteXL')return ['front','spine','back','inside'];if(mode==='cassette')return ['front','spine','back'];return ['front','back']}
function wizSteps(){return wizardStarted?['media','format',...wizPhotoPanels().map(x=>'photo:'+x),'text','style','review','print']:['start']}
const wizPanelNames={front:'лицевой стороны',spine:'корешка кассеты',back:'заднего клапана',inside:'внутренней стороны'};
function wizTitle(key){if(key==='start')return 'Как начнём?';if(key==='media')return 'Что оформляем?';if(key==='format')return 'Какой нужен вкладыш?';if(key.startsWith('photo:'))return 'Фотография '+wizPanelNames[key.split(':')[1]];return ({text:'Нужны ли надписи?',style:'Как оформить обложку?',review:'Всё правильно?',print:'Готовим к печати'})[key]||'Обложки'}
function wizChoice(v,title,description,icon,selected){return `<button class="wiz-choice" type="button" data-wiz-choice="${htmlEscape(v)}" aria-pressed="${selected?'true':'false'}"><span class="wiz-emoji" aria-hidden="true">${icon}</span><span class="wiz-choice-copy"><b>${htmlEscape(title)}</b><small>${htmlEscape(description)}</small></span><span class="wiz-mark">✓</span></button>`}
function wizArtPlaceholder(){
 const cassette=project.mode.startsWith('cassette');
 const detail=cassette&&(wizardKey==='review'||wizardKey==='print');
 const part=wizardKey==='print'?getPrintPart(project):'full';
 const label=part==='full'?'Весь вкладыш крупно — без пустых промежутков':CASSETTE_PRINT_PARTS[part].label+' — увеличенная проверка перед печатью';
 return (detail?`<div class="wiz-detail-caption">${label}</div><div class="wiz-preview-wrap wiz-fullsize"><canvas id="wizardDetail" role="img" aria-label="Крупный макет выбранной детали"></canvas></div><div class="wiz-detail-caption">Расположение на листе A4 в масштабе 1:1</div>`:'')+'<div class="wiz-preview-wrap"><canvas id="wizardPreview" role="img" aria-label="Обновляемый макет обложки"></canvas></div>';
}
function wizPhotoScreen(panel){selectedPanel=panel;const exists=!!project.photos?.[panel],controls=ensurePhotoControls(panel);return `<div class="wiz-content"><div class="wiz-eyebrow">ФОТОГРАФИЯ · ${panel==='front'?'ПЕРЕД':panel==='spine'?'КОРЕШОК':panel==='back'?'ЗАД':'ВНУТРИ'}</div><h1>${wizTitle('photo:'+panel)}</h1><p class="wiz-desc">${panel==='spine'?'Здесь нужна именно узкая вертикальная картинка для корешка (12,7 × 101,6 мм). Не загружай её на задний клапан. Если картинка уже есть, оставь её без надписей.':'Загрузи фотографию или пропусти. Программа сохранит пропорции, не обрежет исходное изображение и разместит его точно.'}</p>${wizArtPlaceholder()}<div class="wiz-file-row"><label class="wiz-upload"><input id="wizPhotoInput" type="file" accept="image/*">${exists?'Заменить фотографию':'Выбрать фотографию с iPhone'}</label>${exists?'<button class="wiz-link" type="button" data-wiz-action="remove-photo">Убрать фото с этой стороны</button>':''}</div><div class="wiz-mini-head">Как разместить фото? <span>Можно изменить позже</span></div><div class="wiz-options">${wizChoice('fit:contain-blur','Целиком + мягкий фон','Оригинальное фото полностью видно; края заполняются размытым фоном','▣',controls.fit==='contain-blur')}${wizChoice('fit:contain-solid','Целиком + спокойный фон','Фото без обрезки, с однотонными полями','▢',controls.fit==='contain-solid')}${wizChoice('fit:cover','Заполнить весь вкладыш','Края могут обрезаться. Только по вашему выбору','▧',controls.fit==='cover')}</div><details class="wiz-carddetails"><summary>Точно подвинуть или повернуть фото</summary><div class="wiz-fields"><label>Масштаб <input type="range" data-wiz-photo="zoom" min="1" max="2.5" step="0.05" value="${controls.zoom}"></label><label>Влево / вправо <input type="range" data-wiz-photo="x" min="-100" max="100" step="5" value="${controls.x}"></label><label>Вверх / вниз <input type="range" data-wiz-photo="y" min="-100" max="100" step="5" value="${controls.y}"></label><div class="wiz-compact-controls"><button type="button" data-wiz-action="rotate">Повернуть 90°</button><button type="button" data-wiz-action="reset-photo">Сбросить</button></div></div></details><p class="wiz-note">Фото уже с текстом? Ничего добавлять не будем, если на следующем шаге выберешь «Без надписей».</p></div>`}
function wizTextFields(){return `<div class="wiz-fields"><label>Название исполнителя <input data-wiz-field="title" maxlength="90" placeholder="Необязательно" value="${htmlEscape(project.title)}"></label><label>Название альбома <input data-wiz-field="album" maxlength="110" placeholder="Необязательно" value="${htmlEscape(project.album)}"></label><label>Год <input data-wiz-field="year" maxlength="30" placeholder="Необязательно" value="${htmlEscape(project.year)}"></label><label>Подпись / тип издания <input data-wiz-field="edition" maxlength="70" placeholder="Необязательно" value="${htmlEscape(project.edition)}"></label><label>Песни, каждую на новой строке <textarea data-wiz-field="tracks" rows="4" placeholder="Если нужны на задней стороне">${htmlEscape(project.tracks)}</textarea></label><label>Внутренний текст <textarea data-wiz-field="notes" rows="3" placeholder="Можно оставить пустым">${htmlEscape(project.notes)}</textarea></label></div><div class="wiz-mini-head">Идеи подписей (только если нажать)</div><div class="wiz-suggest"><button type="button" data-wiz-suggest="Концертная запись">Концертная запись</button><button type="button" data-wiz-suggest="Коллекционное издание">Коллекционное издание</button><button type="button" data-wiz-suggest="Домашний архив">Домашний архив</button><button type="button" data-wiz-suggest="Сборник">Сборник</button></div>`}
// Print preflight is advisory: it never silently modifies or rejects a user's artwork.
const PRINT_DIMS={
 front:{cassette:[65.1,101.6],cassetteXL:[65.1,101.6],cdFront:[120,120],cdBack:[0,0],cdSet:[120,120],booklet:[120,120]},
 spine:{cassette:[12.7,101.6],cassetteXL:[12.7,101.6],cdBack:[6.25,118],cdSet:[6.25,118]},
 back:{cassette:[25.4,101.6],cassetteXL:[25.4,101.6],cdBack:[137.5,118],cdSet:[137.5,118]},
 inside:{cassetteXL:[65.1,101.6],booklet:[120,120]}
};
function activePrintPanels(p){
 const selected=getPrintPart(p),tape=p.mode.startsWith('cassette');
 if(tape&&selected!=='full')return [selected];
 if(p.mode==='cassette')return ['front','spine','back'];
 if(p.mode==='cassetteXL')return ['front','spine','back','inside'];
 if(p.mode==='cdFront')return ['front'];
 if(p.mode==='cdBack')return ['back'];
 if(p.mode==='booklet')return ['front','inside'];
 return ['front','back'];
}
function panelPrintDpi(img,dimension,control){
 if(!img||!dimension||dimension[0]===0)return null;
 const turn=(Number(control.rotate)||0)%180!==0;
 const iw=turn?img.height:img.width, ih=turn?img.width:img.height;
 const [width,height]=dimension;
 const ratio=control.fit==='cover'?Math.max(width/iw,height/ih):Math.min(width/iw,height/ih);
 const zoom=Math.max(1,Math.min(2.5,Number(control.zoom)||1));
 return Math.round(25.4/(ratio*zoom));
}
async function analyzePrint(p){
 const entries=[],panels=activePrintPanels(p);
 for(const panel of panels){
  const img=p.photos?.[panel]?await loadImage(p.photos[panel]):null;
  if(!img){
   const label=({front:'Лицевая сторона',spine:'Корешок',back:'Задний клапан',inside:'Внутренняя сторона'})[panel];
   entries.push({panel,level:panel==='front'&&panels.includes('front')?'warn':'note',message:label+': нет фотографии — будет нейтральный фон'});
   continue;
  }
  const ctl=ensurePhotoControlsFor(p,panel);
  const dims=PRINT_DIMS[panel]?.[p.mode];
  const dpi=panelPrintDpi(img,dims,ctl);
  if(!dpi)continue;
  let level=dpi<125?'warn':dpi<200?'note':'ok';
  const label=({front:'Лицевая',spine:'Корешок',back:'Задняя',inside:'Внутренняя'})[panel];
  const quality=dpi<125?'очень низкая детализация':dpi<200?'качество может быть мягким':'достаточная детализация';
  entries.push({panel,level,message:`${label}: ${img.width} × ${img.height} px · около ${dpi} DPI — ${quality}`});
  if(ctl.fit==='cover'){
   const rotated=(Number(ctl.rotate)||0)%180!==0,srcRatio=rotated?img.height/img.width:img.width/img.height,dstRatio=dims[0]/dims[1];
   if(Math.abs(Math.log(srcRatio/dstRatio))>.08)entries.push({panel,level:'warn',message:label+': выбран режим заполнения — часть фотографии будет обрезана'});
  }
 }
 return entries;
}
function ensurePhotoControlsFor(p,panel){
 const normal={zoom:1,rotate:0,fit:'contain-blur'};
 return {...normal,...(p.photoControls?.[panel]||{})};
}
async function refreshPrintCheck(){
 const area=$('wizPrintCheck');if(!area||wizardKey!=='print')return;
 const liveId=area.dataset.token=(Number(area.dataset.token||0)+1).toString();
 area.innerHTML='<div class="wiz-preflight-loading">Проверяю фотографии и размеры...</div>';
 try{
  const result=await analyzePrint(project);
  if(!area.isConnected||area.dataset.token!==liveId)return;
  const hasWarning=result.some(x=>x.level==='warn'),hasPhoto=result.some(x=>!x.message.includes('нет фотографии'));
  let header=!hasPhoto?'Макет без фотографий':hasWarning?'Есть что проверить':'Макет проверен';
  area.innerHTML=`<div class="wiz-preflight-title"><span class="wiz-preflight-dot ${hasWarning?'warn':'ok'}"></span><strong>${header}</strong></div>`+
   `<div class="wiz-preflight-list">${result.map(x=>`<div class="wiz-preflight-row ${x.level}"><span>${htmlEscape(x.message)}</span>${x.level==='warn'?`<button type="button" data-wiz-action="fix-photo" data-wiz-panel="${x.panel}">Исправить</button>`:''}</div>`).join('')}</div>`+
   '<p class="wiz-preflight-foot">Оценка по исходным пикселям: она не гарантирует качество принтера. Сам PDF создаётся в физических миллиметрах, печатайте 100%.</p>';
 }catch(e){area.textContent='Проверку фотографии не удалось завершить. Можно создать PDF и проверить результат вручную.'}
}
function wizPrintScreen(){
 const tape=project.mode.startsWith('cassette'),part=getPrintPart(project);
 const choices=tape?`<div class="wiz-part-card"><label for="wizPrintPart" class="wiz-part-title">Что именно напечатать?</label>
  <select id="wizPrintPart" aria-label="Часть кассетного вкладыша">
   ${Object.entries(CASSETTE_PRINT_PARTS).filter(([key])=>key!=='inside'||project.mode==='cassetteXL').map(([key,spec])=>`<option value="${key}" ${part===key?'selected':''}>${spec.label}${key==='full'?'':` · ${spec.w} × ${spec.h} мм`}</option>`).join('')}
  </select><p class="wiz-part-note">${part==='full'?'Все части вместе, со сгибами без промежутков.':`Только выбранная часть. Размер ${CASSETTE_PRINT_PARTS[part].w} × ${CASSETTE_PRINT_PARTS[part].h} мм, с отметками разреза.`}</p></div>`:'';
 return `<div class="wiz-content"><div class="wiz-eyebrow">ФИНИШ</div><h1>Проверка и печать</h1>
 <p class="wiz-desc">Выбери, что печатать. Программа подготовит лист A4 в точном размере.</p>
 <div class="wiz-success">✓ ${htmlEscape(MODES[project.mode].name)} · 100% · PDF A4</div>
 ${choices}
 <div class="wiz-print-options"><label>Сколько экземпляров?<select data-wiz-field="copies">${[1,2,4,6].map(n=>`<option value="${n}" ${+project.copies===n?'selected':''}>${n} шт.</option>`).join('')}</select></label>
 <label>Тип печати<select data-wiz-field="bw"><option value="false" ${!project.bw?'selected':''}>Цветная</option><option value="true" ${project.bw?'selected':''}>Чёрно-белая</option></select></label></div>
 ${tape&&part==='full'?`<label class="wiz-checkbox"><input type="checkbox" id="wizDuplex" ${project.duplexCassette?'checked':''}> Печатать обе стороны вкладыша</label>`:''}
 <div class="wiz-preflight" id="wizPrintCheck" role="status" aria-live="polite"><div class="wiz-preflight-loading">Проверяю фотографии…</div></div>
 <button class="wiz-primary-action" id="wizExport" type="button">Создать PDF для печати ↗</button>
 <div class="wiz-export-row"><button type="button" id="wizShare">Отправить PDF на принтер</button><button type="button" id="wizProof">Пробный лист для проверки размеров</button></div>
 <p class="wiz-note">Печать 100% / «фактический размер». Не включай «подогнать». Проверяй линейку 50 мм перед разрезанием.</p>
 ${wizArtPlaceholder()}</div>`;
}
function renderWizard(){const steps=wizSteps();if(!steps.includes(wizardKey))wizardKey='media';const ix=steps.indexOf(wizardKey);$('wizardCounter').textContent=wizardKey==='start'?'НАЧАЛО':'ШАГ '+(ix+1)+' ИЗ '+steps.length;$('wizardProgressTitle').textContent=wizTitle(wizardKey);$('wizardProgress').innerHTML=steps.map((_,i)=>`<div class="${i<ix?'past':i===ix?'current':''}"></div>`).join('');const c=$('wizardContent');let html='';
 if(wizardKey==='start')html=`<div class="wiz-content"><div class="wiz-eyebrow">НОВЫЙ МАКЕТ ИЛИ СТАРЫЙ</div><h1>Как начнём?</h1><p class="wiz-desc">Я буду задавать один вопрос за другим, пока обложка не будет готова к печати.</p><div class="wiz-options">${wizChoice('start:raash','Готовая кассета: רעש יפה — אני פה!','Лицевая сторона и узкий корешок уже подогнаны. Сразу к печати.','♫',false)}${wizChoice('start:new','Создать с нуля','Чистый макет — никаких автоматически добавленных слов','＋',false)}${wizChoice('start:continue','Продолжить прежнюю работу','Открыть текущий проект, не меняя сохранённые фото и текст','▤',false)}</div></div>`;
 else if(wizardKey==='media')html=`<div class="wiz-content"><div class="wiz-eyebrow">НАЧНЁМ С НУЛЯ</div><h1>Что оформляем?</h1><p class="wiz-desc">На каждом шаге будет только один вопрос. Выбери подходящий вариант — размеры и печать я рассчитаю автоматически.</p><div class="wiz-options">${wizChoice('media:cassette','Аудиокассета','Вкладыш для стандартной кассетной коробки','▣',wizardMedia==='cassette')}${wizChoice('media:cd','Компакт-диск','Квадратная обложка, задняя или полный комплект CD','◉',wizardMedia==='cd')}</div><p class="wiz-note">Новый макет начинается без фотографий и надписей. Существующие работы остаются сохранёнными.</p></div>`;
 else if(wizardKey==='format'){const labels={cassette:['Стандартная кассета','Передняя, корешок и задний клапан'],cassetteXL:['Кассета с разворотом','Дополнительная внутренняя панель'],cdSet:['Полный комплект CD','Передняя обложка + задняя с корешками'],cdFront:['Только передняя CD','Квадратная · 120 × 120 мм'],cdBack:['Только задняя CD','С корешками · 150 × 118 мм'],booklet:['Буклет из двух частей','Разворот · 240 × 120 мм']};html=`<div class="wiz-content"><div class="wiz-eyebrow">ФОРМАТ</div><h1>Какой нужен вкладыш?</h1><p class="wiz-desc">Выбери, что именно должно получиться на бумаге.</p><div class="wiz-options">${WIZARD_FORMATS[wizardMedia||'cassette'].map(m=>wizChoice('mode:'+m,labels[m][0],labels[m][1]+' · '+MODES[m].w+' × '+MODES[m].h+' мм','▤',wizardFormatPicked&&project.mode===m)).join('')}</div></div>`}
 else if(wizardKey.startsWith('photo:'))html=wizPhotoScreen(wizardKey.split(':')[1]);
 else if(wizardKey==='text')html=`<div class="wiz-content"><div class="wiz-eyebrow">ТЕКСТ · НЕОБЯЗАТЕЛЬНО</div><h1>Нужны ли надписи?</h1><p class="wiz-desc">Если на фотографии уже написаны исполнитель, альбом и песни — выбери «Без надписей». Программа ничего не будет добавлять поверх.</p><div class="wiz-options">${wizChoice('text:none','Без надписей','Оставить оригинальный текст на фотографии или чистое изображение','▣',project.showText===false)}${wizChoice('text:yes','Добавить свои надписи','Только те слова, которые ты сам напишешь или явно выберешь','✎',project.showText!==false)}</div>${project.showText!==false?wizTextFields():''}${wizArtPlaceholder()}</div>`;
 else if(wizardKey==='style')html=`<div class="wiz-content"><div class="wiz-eyebrow">ВНЕШНИЙ ВИД · НЕОБЯЗАТЕЛЬНО</div><h1>Как оформить обложку?</h1><p class="wiz-desc">Фотография останется в исходных пропорциях. Дизайн применяется только после выбора.</p><div class="wiz-options">${wizChoice('decorate:clean','Оставить оригинальное фото','Без цветных эффектов и украшений; фото целиком','▧',project.decorate==='clean')}${wizChoice('decorate:minimal','Спокойный студийный вариант','Нейтральный фон вокруг фотографии','▢',project.decorate==='minimal')}${wizChoice('decorate:theme','Готовый художественный стиль','Дополнительное оформление и палитра','◩',!['clean','minimal'].includes(project.decorate))}</div>${!['clean','minimal'].includes(project.decorate)?`<details class="wiz-carddetails" open><summary>Выбрать палитру</summary><div class="wiz-options wiz-choice-grid" style="margin-top:10px">${STYLES.map((v,i)=>wizChoice('style:'+i,v.name,'Цвета и подложка','▤',project.style===i)).join('')}</div></details>`:''}${wizArtPlaceholder()}</div>`;
 else if(wizardKey==='review'){const missing=wizPhotoPanels().filter(q=>!project.photos[q]);const hasAny=wizPhotoPanels().some(q=>!!project.photos[q]);html=`<div class="wiz-content"><div class="wiz-eyebrow">ПРОВЕРКА · A4</div><h1>Всё правильно?</h1><p class="wiz-desc">${project.mode.startsWith('cassette')?'Слева направо: задний клапан 25,4 мм, корешок 12,7 мм и лицевая сторона 65,1 мм. Они соединены без зазора.':'Это точный макет листа для печати в масштабе 100%.'}</p>${wizArtPlaceholder()}<p class="wiz-preview-meta">${htmlEscape(MODES[project.mode].name)} · ${MODES[project.mode].w} × ${MODES[project.mode].h} мм · лист A4</p>${!hasAny?'<p class="wiz-note">Фотографий пока нет — лист будет пустым. Вернись назад и добавь фото или продолжай, если нужен чистый шаблон.</p>':missing.length?'<p class="wiz-note">Стороны без отдельной фотографии программа оформляет нейтральным фоном. Лицевое фото и корешок остаются без искажений.</p>':''}<div class="wiz-compact-controls"><button type="button" data-wiz-action="return-photo">← Изменить фотографии</button><button type="button" data-wiz-action="return-text">Изменить надписи</button></div></div>`}
 else if(wizardKey==='print')html=wizPrintScreen();
 c.innerHTML=html;
 $('wizardBack').disabled=ix===0;$('wizardBack').hidden=wizardKey==='start';$('wizardNext').hidden=wizardKey==='start';$('wizardNext').textContent=wizardKey==='print'?'Создать PDF ↗':'Далее →';$('wizardFeedback').textContent='';
 schedulePreview();
 if(wizardKey==='print')refreshPrintCheck();
}
async function renderWizardPreview(p){const canvas=$('wizardPreview');if(!canvas||!canvas.isConnected)return;const key=wizardKey;if(key==='review'||key==='print'){await renderPage(canvas,key==='review'?{...p,printPart:'full'}:p,0,90,1,false);const detail=$('wizardDetail');if(detail&&p.mode.startsWith('cassette')){
  const part=key==='print'?getPrintPart(p):'full';
  const dims=part==='full'?MODES[p.mode]:CASSETTE_PRINT_PARTS[part];
  const targetHeight=650,physicalW=dims.w,physicalH=dims.h;
  detail.height=targetHeight;detail.width=Math.max(30,Math.round(targetHeight*physicalW/physicalH));
  const ctx=detail.getContext('2d',{alpha:false});ctx.fillStyle='white';ctx.fillRect(0,0,detail.width,detail.height);
  ctx.scale(detail.width/physicalW,detail.height/physicalH);
  const images=await resolveImages(p);
  if(part==='full')art(ctx,p.mode,0,0,p,images);else drawCassettePart(ctx,part,0,0,p,images);
  detail.style.filter=p.bw?'grayscale(1)':'none';
 }return}
 const panel=key.startsWith('photo:')?key.split(':')[1]:'front';const isTape=p.mode.startsWith('cassette');if(isTape){const mode=MODES[p.mode];canvas.width=640;canvas.height=Math.round(canvas.width*mode.h/mode.w);const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.scale(canvas.width/mode.w,canvas.height/mode.h);const loaded=await resolveImages(p);art(ctx,p.mode,0,0,p,loaded);canvas.style.filter=p.bw?'grayscale(1)':'none';return}const dims=panel==='back'&&isTape?[25.4,101.6]:panel==='back'?[137.5,118]:isTape?[65.1,101.6]:[120,120];const [w,h]=dims;canvas.width=480;canvas.height=Math.round(480*h/w);const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#f2f2f2';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.scale(canvas.width/w,canvas.height/h);const images=await resolveImages(p);if(panel==='back')drawBack(ctx,0,0,w,h,p,images,isTape);else if(panel==='inside')drawInside(ctx,0,0,w,h,p,images);else drawFront(ctx,0,0,w,h,p,images);
 canvas.style.filter=p.bw?'grayscale(1)':'none';
}
function wizNotify(t,isError=false){$('wizardFeedback').textContent=t;$('wizardFeedback').style.color=isError?'#a04628':'#225b44'}
async function wizardAdvance(){const steps=wizSteps(),i=steps.indexOf(wizardKey);if(wizardKey==='media'&&!wizardMedia){wizNotify('Сначала выбери аудиокассету или компакт-диск.',true);return}if(wizardKey==='format'&&!wizardFormatPicked){wizNotify('Выбери конкретный формат вкладыша.',true);return}if(wizardKey==='print'){await exportClick(false);return}wizardKey=steps[i+1]||'print';renderWizard();window.scrollTo({top:0,behavior:'smooth'})}
function wizardBack(){const steps=wizSteps(),i=steps.indexOf(wizardKey);if(i<=0)return;wizardKey=steps[i-1];renderWizard();window.scrollTo({top:0,behavior:'smooth'})}
function wizardStart(){wizardStarted=true;wizardMedia='';wizardFormatPicked=false;wizardKey='media';renderWizard();window.scrollTo({top:0,behavior:'smooth'})}
function wizardSelect(choice){if(choice==='start:new'){wizardMakeNew();return}if(choice==='start:raash'){wizardUseRaash();return}if(choice==='start:continue'){wizardStarted=true;wizardMedia=project.mode.startsWith('cassette')?'cassette':'cd';wizardFormatPicked=true;wizardKey='format';renderWizard();return}if(choice.startsWith('media:')){wizardMedia=choice.slice(6);wizardFormatPicked=false;project.mode=WIZARD_FORMATS[wizardMedia][0];selectedPanel=wizPhotoPanels()[0];hydrate();autosave()}
 else if(choice.startsWith('mode:')){project.mode=choice.slice(5);wizardFormatPicked=true;selectedPanel=wizPhotoPanels()[0];hydrate();autosave()}
 else if(choice.startsWith('fit:')){ensurePhotoControls(selectedPanel).fit=choice.slice(4);project.safeFit=true;autosave()}
 else if(choice.startsWith('text:')){project.showText=choice==='text:yes';autosave()}
 else if(choice.startsWith('decorate:')){project.decorate=choice.slice(9);autosave()}
 else if(choice.startsWith('style:')){project.style=Number(choice.slice(6));project.accent=STYLES[project.style].accent;autosave()}
 renderWizard()}
async function wizardUpload(file){const panel=wizardKey.split(':')[1];if(!file||!panel)return;wizNotify('Подготавливаю фотографию…');try{const data=await photoToDataURL(file);const im=await loadImage(data);const toSpine=panel==='back'&&project.mode.startsWith('cassette')&&im&&im.width/im.height<.185;const target=toSpine?'spine':panel;project.photos[target]=data;if(toSpine)project.photos.back=null;ensurePhotoControls(target).fit='contain-blur';project.safeFit=true;autosave();if(toSpine)wizardKey='photo:spine';renderWizard();wizNotify(toSpine?'Распознана узкая картинка: поставил её на корешок, а не на задний клапан.':'Фото добавлено целиком, без растяжения и обрезки.')}catch(e){wizNotify('Ошибка фото: '+e.message,true)}}
function wizardField(el){const key=el.dataset.wizField;if(key==='copies')project.copies=Number(el.value);else if(key==='bw')project.bw=el.value==='true';else if(key){project[key]=el.value;if(key==='album')project.name=el.value||'Новый макет'}autosave()}
async function wizardMakeNew(){await storeProject(project);project=defaultProject();selectedPanel='front';await storeProject(project);storageSet('lacover-current',project.id);refreshProjects();hydrate();wizardStart();wizNotify('Новый чистый макет. Ни одного текста не добавлено.')}

async function wizardUseRaash(){
 const feedback=$('wizardFeedback');if(feedback)feedback.textContent='Загружаю готовую обложку группы…';
 try{
  const load=async n=>{const r=await fetch('./assets/'+n);if(!r.ok)throw new Error('Не удалось загрузить '+n);return await photoToDataURL(new File([await r.blob()],n,{type:'image/jpeg'}))};
  const [front,spine]=await Promise.all([load('raash-front.jpg'),load('raash-spine.jpg')]);
  await storeProject(project);
  const p=defaultProject();p.name='רעש יפה — אני פה! (2026)';p.title='רעש יפה';p.album='אני פה!';p.year='2026';p.photos.front=front;p.photos.spine=spine;p.photos.back=null;p.showText=false;p.decorate='clean';p.mode='cassette';p.photoControls.front.fit='contain-solid';p.photoControls.spine.fit='contain-blur';
  project=p;selectedPanel='front';await storeProject(project);storageSet('lacover-current',project.id);hydrate();refreshProjects();wizardStarted=true;wizardMedia='cassette';wizardFormatPicked=true;wizardKey='review';renderWizard();wizNotify('Готовый альбом: лицевая часть и корешок точно на своих местах. Можно печатать.');
 }catch(e){wizNotify('Не удалось открыть встроенный альбом: '+e.message,true)}
}
function setupWizard(){const area=$('wizardProjectArea'),row=document.querySelector('main>.project-row');if(row)area.appendChild(row);
 $('wizardProjects').onclick=()=>{area.hidden=!area.hidden;$('wizardProjects').setAttribute('aria-expanded',String(!area.hidden))};
 $('wizardNew').onclick=wizardMakeNew;
 $('wizardAdvanced').onclick=()=>{const row=area.querySelector('.project-row');if(row)$('wizardLegacyProjectHost').appendChild(row);document.body.classList.add('advanced-open');setStep('design',false);window.scrollTo(0,0)};
 $('wizardReturn').onclick=()=>{const row=$('wizardLegacyProjectHost').querySelector('.project-row');if(row)area.appendChild(row);document.body.classList.remove('advanced-open');renderWizard();window.scrollTo(0,0)};
 $('wizardBack').onclick=wizardBack;$('wizardNext').onclick=wizardAdvance;
 $('wizardContent').addEventListener('click',async e=>{
  const choice=e.target.closest('[data-wiz-choice]');if(choice){wizardSelect(choice.dataset.wizChoice);return}
  const suggest=e.target.closest('[data-wiz-suggest]');if(suggest){project.edition=suggest.dataset.wizSuggest;autosave();renderWizard();return}
  const action=e.target.closest('[data-wiz-action]');if(action){if(action.dataset.wizAction==='rotate'){ensurePhotoControls(selectedPanel).rotate=(ensurePhotoControls(selectedPanel).rotate+90)%360;autosave();renderWizard()}
   if(action.dataset.wizAction==='reset-photo'){project.photoControls[selectedPanel]={zoom:1,x:0,y:0,rotate:0,flip:false,brightness:100,contrast:100,fit:'contain-blur'};autosave();renderWizard()}
   if(action.dataset.wizAction==='remove-photo'){project.photos[selectedPanel]=null;autosave();renderWizard()}
   if(action.dataset.wizAction==='return-photo'){wizardKey='photo:'+wizPhotoPanels()[0];renderWizard()}
   if(action.dataset.wizAction==='return-text'){wizardKey='text';renderWizard()}
   if(action.dataset.wizAction==='fix-photo'){const panel=action.dataset.wizPanel||'front';wizardKey='photo:'+panel;renderWizard()}
   return}
  if(e.target.closest('#wizExport')){const btn=e.target.closest('#wizExport');btn.disabled=true;try{await exportClick(false)}finally{btn.disabled=false}return}
  if(e.target.closest('#wizShare')){const btn=e.target.closest('#wizShare');btn.disabled=true;try{await exportClick(true)}finally{btn.disabled=false}return}
  if(e.target.closest('#wizProof')){await exportProof();return}
 });
 $('wizardContent').addEventListener('input',e=>{const el=e.target;if(el.dataset.wizField)wizardField(el);if(el.dataset.wizPhoto){ensurePhotoControls(selectedPanel)[el.dataset.wizPhoto]=+el.value;autosave()}});
 $('wizardContent').addEventListener('change',e=>{const el=e.target;if(el.id==='wizPhotoInput'&&el.files?.[0])wizardUpload(el.files[0]);if(el.id==='wizDuplex'){project.duplexCassette=el.checked;autosave()}if(el.id==='wizPrintPart'){project.printPart=el.value;autosave();renderWizard();return}if(el.dataset.wizField)wizardField(el)});

}

async function init(){bindForm();bindWorkflow();setupWizard();setStep('format',false);let all=await getAllProjects();let current=storageGet('lacover-current');if(!all.length){try{const old=storageGet('lacover-fallback');if(old)all=[JSON.parse(old)]}catch(e){}}project=all.find(p=>p.id===current)||all.sort((a,b)=>b.updated-a.updated)[0]||defaultProject();project.duplexCassette=!!project.duplexCassette;project.photos={front:null,spine:null,back:null,inside:null,...project.photos};project.photoControls={...defaultProject().photoControls,...project.photoControls};for(const key of ['front','spine','back','inside'])ensurePhotoControls(key);await recoverCassetteSpine(project);await storeProject(project);storageSet('lacover-current',project.id);hydrate();refreshProjects();wizardStarted=false;wizardMedia=project.mode.startsWith('cassette')?'cassette':'cd';wizardFormatPicked=true;wizardKey='start';renderWizard();if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});showStatus('Проект сохраняется автоматически на этом устройстве.')}init();