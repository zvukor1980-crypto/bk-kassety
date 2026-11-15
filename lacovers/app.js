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
const DEFAULT_TRACKS='01. Первая песня\n02. Вторая песня\n03. Третья песня\n04. Четвертая песня\n05. Пятая песня';
function defaultProject(){return{id:'p'+Date.now()+Math.random().toString(16).slice(2,7),name:'Новый альбом',created:Date.now(),updated:Date.now(),mode:'cassette',style:0,font:'heavy',accent:'#ff51a5',title:'МОЯ ГРУППА',album:'МОЙ АЛЬБОМ',year:'2026',edition:'SPECIAL EDITION',tracks:DEFAULT_TRACKS,notes:'Записано с любовью. Музыка навсегда.',titlePos:69,titleScale:100,bw:false,guides:true,calibration:true,duplexCassette:false,copies:1,quality:300,photos:{front:null,back:null,inside:null},photoControls:{front:{zoom:1,x:0,y:0,rotate:0,flip:false,brightness:100,contrast:100},back:{zoom:1,x:0,y:0,rotate:0,flip:false,brightness:100,contrast:100},inside:{zoom:1,x:0,y:0,rotate:0,flip:false,brightness:100,contrast:100}}}}
let project=defaultProject(),projects=[],selectedPanel='front',previewBack=false,previewPending=false,saveTimer=null,db=null,lastPdf=null,renderSeq=0,images=new Map();
const dbReady=new Promise((resolve)=>{if(!window.indexedDB){resolve(null);return}let r;try{r=indexedDB.open('lacovers-projects-v1',1)}catch(e){resolve(null);return}r.onupgradeneeded=()=>{r.result.createObjectStore('projects',{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null)});
async function database(){return db??(db=await dbReady)}
async function getAllProjects(){const d=await database();if(!d)return[];return new Promise(res=>{let r=d.transaction('projects','readonly').objectStore('projects').getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>res([])})}
async function storeProject(p){const d=await database();if(!d){try{storageSet('lacover-fallback',JSON.stringify(p));return true}catch(e){showStatus('Память устройства заполнена. Сохраните резервную копию.',true);return false}}return new Promise(res=>{const r=d.transaction('projects','readwrite').objectStore('projects').put(structuredClone(p));r.onsuccess=()=>res(true);r.onerror=()=>{showStatus('Не удалось сохранить. Сохраните проект в файл.',true);res(false)}})}
async function removeProject(id){const d=await database();if(!d)return;return new Promise(res=>{const r=d.transaction('projects','readwrite').objectStore('projects').delete(id);r.onsuccess=()=>res();r.onerror=()=>res()})}
function autosave(){project.updated=Date.now();lastPdf=null;clearTimeout(saveTimer);const snapshot=project;saveTimer=setTimeout(()=>storeProject(snapshot).then(()=>refreshProjects(false)),550);schedulePreview()}
function refreshProjects(rebuild=true){const list=$('projectSelect');if(rebuild||!Array.from(list.options).some(o=>o.value===project.id)){getAllProjects().then(all=>{projects=all.sort((a,b)=>b.updated-a.updated);list.replaceChildren(...projects.map(p=>new Option(p.album+' · '+MODES[p.mode]?.name,p.id)));list.value=project.id})}else{const opt=list.selectedOptions[0];if(opt)opt.textContent=project.album+' · '+MODES[project.mode]?.name}}
function hydrate(){const value={fontSelect:project.font,accentColor:project.accent,projectTitle:project.title,albumTitle:project.album,year:project.year,edition:project.edition,tracks:project.tracks,notes:project.notes,titlePos:project.titlePos,titleScale:project.titleScale,bw:project.bw,guides:project.guides,calibration:project.calibration,cassetteDuplex:project.duplexCassette,copies:project.copies,quality:project.quality};for(const [id,v] of Object.entries(value)){const el=$(id);if(!el)continue;if(el.type==='checkbox')el.checked=v;else el.value=v}document.querySelectorAll('.format-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===project.mode));const choices=allowedPanels();$('panelSelect').replaceChildren(...choices.map(([v,l])=>new Option(l,v)));if(!choices.some(([k])=>k===selectedPanel))selectedPanel=choices[0][0];$('panelSelect').value=selectedPanel;const controls=ensurePhotoControls(selectedPanel);$('zoom').value=controls.zoom;$('photoPositionX').value=controls.x;$('photoPosition').value=controls.y;$('brightness').value=controls.brightness;$('contrast').value=controls.contrast;$('flipPhoto').setAttribute('aria-pressed',String(controls.flip));$('photoToolStatus').textContent='Поворот: '+controls.rotate+'°'+(controls.flip?' • зеркальное отражение':'');renderSwatches();updatePhotoLabel();updateDetails();schedulePreview()}
function ensurePhotoControls(panel){
 const defaults={zoom:1,x:0,y:0,rotate:0,flip:false,brightness:100,contrast:100};
 project.photoControls??={};
 const c=project.photoControls[panel]||{};
 return project.photoControls[panel]={...defaults,...c};
}
function newProjectId(){return 'p'+Date.now()+Math.random().toString(16).slice(2,9)}
function numberTracksText(text){return lines(text).map((t,i)=>String(i+1).padStart(2,'0')+'. '+t.replace(/^\s*(?:\d{1,3}\s*[.):\-–—]\s*|[•*\-]\s*)/,'')).join('\n')}
function allowedPanels(){const m=project.mode;if(m==='cdFront')return [['front','Лицевая обложка']];if(m==='cdBack')return [['back','Задняя обложка']];if(m==='cassette')return [['front','Лицевая сторона'],['back','Задний клапан']];return [['front','Лицевая сторона'],['back','Задняя сторона'],['inside','Внутренняя сторона']]}
function updatePhotoLabel(){const exists=!!project.photos[selectedPanel];$('removePhoto').style.display=exists?'inline-block':'none';const label=document.querySelector('.upload-zone label b');label.textContent=exists?'Заменить фото':'Выбрать фото'}
function renderSwatches(){$('styleSwatches').replaceChildren(...STYLES.map((s,i)=>{const b=document.createElement('button');b.type='button';b.className='swatch'+(i===project.style?' selected':'');b.style.background=`linear-gradient(135deg,${s.colors[0]},${s.colors[1]})`;b.innerHTML='<b>'+s.name+'</b>';b.title='Стиль '+s.name;b.onclick=()=>{project.style=i;project.accent=s.accent;project.bw=false;$('accentColor').value=s.accent;$('bw').checked=false;renderSwatches();autosave()};return b}))}
function updateDetails(){const mode=MODES[project.mode];const paper=mode.landscape?'A4 альбомный':'A4 книжный';const isCassette=project.mode==='cassette'||project.mode==='cassetteXL';$('duplexOption').hidden=!isCassette;$('previewReverse').hidden=!isCassette;$('previewReverse').textContent=previewBack?'Показать лицевую сторону':'Показать изнанку';if(!isCassette)previewBack=false;$('previewCaption').textContent=paper+' • '+mode.w+' × '+mode.h+' мм';$('panelLegend').replaceChildren(...mode.parts.map(t=>{let e=document.createElement('span');e.textContent=({front:'Передняя',back:'Задняя',inside:'Внутренняя',spine:'Корешок',spines:'2 корешка'})[t];return e}))}
function showStatus(s,error=false){$('status').textContent=s;$('status').className=error?'error':''}
function schedulePreview(){if(previewPending)return;previewPending=true;requestAnimationFrame(async()=>{previewPending=false;const seq=++renderSeq;const current=project;try{await renderPage($('preview'),current,0,96,1,previewBack);if(seq!==renderSeq)return}catch(e){console.error(e);showStatus('Ошибка предпросмотра: '+e.message,true)}})}
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
async function resolveImages(p){const parts=['front','back','inside'];const vals=await Promise.all(parts.map(t=>loadImage(p.photos[t])));return Object.fromEntries(parts.map((t,i)=>[t,vals[i]]))}
function clippedImage(ctx,img,x,y,w,h,options={}){
 if(!img)return false;
 const deg=([0,90,180,270].includes(+options.rotate)?+options.rotate:0);
 const turn=deg%180===90;
 const intrinsicW=turn?img.height:img.width,intrinsicH=turn?img.width:img.height;
 const zoom=Math.max(1,Math.min(2.5,Number(options.zoom)||1));
 const ratio=Math.max(w/intrinsicW,h/intrinsicH)*zoom;
 const dw=img.width*ratio,dh=img.height*ratio;
 const occupiedW=turn?dh:dw,occupiedH=turn?dw:dh;
 const dx=(Number(options.x)||0)/100*Math.max(0,occupiedW-w)*.49;
 const dy=(Number(options.y)||0)/100*Math.max(0,occupiedH-h)*.49;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 ctx.translate(x+w/2+dx,y+h/2+dy);
 ctx.rotate(deg*Math.PI/180);if(options.flip)ctx.scale(-1,1);
 const brightness=Math.max(50,Math.min(150,Number(options.brightness)||100));
 const contrast=Math.max(50,Math.min(150,Number(options.contrast)||100));
 ctx.filter=`brightness(${brightness}%) contrast(${contrast}%)`;
 ctx.drawImage(img,-dw/2,-dh/2,dw,dh);
 ctx.restore();return true;
}
function styleBackground(ctx,x,y,w,h,p){const st=STYLES[p.style]||STYLES[0];const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,st.colors[0]);g.addColorStop(1,st.colors[1]);ctx.fillStyle=g;ctx.fillRect(x,y,w,h);ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.globalAlpha=.14;ctx.strokeStyle=p.accent;ctx.lineWidth=.6;for(let i=-180;i<250;i+=9){ctx.beginPath();ctx.moveTo(x+i,y);ctx.lineTo(x+i+w*.85,y+h);ctx.stroke()}ctx.globalAlpha=.26;ctx.strokeStyle=p.accent;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x+w*.72,y+h*.1,w*.42,0,Math.PI*2);ctx.stroke();ctx.restore()}
function drawFront(ctx,x,y,w,h,p,img){const st=STYLES[p.style]||STYLES[0];ctx.save();styleBackground(ctx,x,y,w,h,p);const hasPhoto=clippedImage(ctx,img.front,x,y,w,h,p.photoControls.front);if(hasPhoto){const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'#09081980');g.addColorStop(.28,'#00000010');g.addColorStop(.52,'#00000026');g.addColorStop(1,'#080614e8');ctx.fillStyle=g;ctx.fillRect(x,y,w,h)}ctx.fillStyle=p.accent;ctx.fillRect(x+3.6,y+4,Math.min(w*.25,15),1.1);ctx.textAlign='left';ctx.textBaseline='top';const artist=safe(p.title)||'ИСПОЛНИТЕЛЬ';fitText(ctx,artist,w-8,Math.min(5.2,w*.08),2.8,p,true);ctx.fillStyle=hasPhoto?'white':st.color;ctx.shadowColor=hasPhoto?'#000':'transparent';ctx.shadowBlur=1.2;ctx.fillText(ellipsisText(ctx,artist,w-8),x+4,y+8);ctx.shadowBlur=0;const titleY=y+h*(p.titlePos/100);const big=Math.max(4.5,Math.min(w*.135,10.5))*(p.titleScale/100);setFont(ctx,big,p,true);const titleLines=wrapText(ctx,safe(p.album)||'МОЙ АЛЬБОМ',w-8,3);ctx.textAlign='left';ctx.textBaseline='alphabetic';let lineH=big*1.12;const start=Math.min(y+h-12-titleLines.length*lineH,Math.max(y+23,titleY));const albColor=hasPhoto?'white':st.color;ctx.fillStyle=albColor;ctx.shadowColor=hasPhoto?'#000000bd':'transparent';ctx.shadowBlur=hasPhoto?2.5:0;titleLines.forEach((s,i)=>{const font=fitText(ctx,s,w-8,big,Math.max(3.2,big*.55),p,true);ctx.fillText(s,x+4,start+i*lineH+font)});ctx.shadowBlur=0;ctx.fillStyle=p.accent;ctx.fillRect(x+4,y+h-10,Math.min(w-8,13),.9);setFont(ctx,Math.min(2.6,w*.05),p,true);ctx.textBaseline='alphabetic';ctx.fillStyle=hasPhoto?'#fefefe':st.color;ctx.fillText(ellipsisText(ctx,safe(p.edition)||'ORIGINAL RECORDING',w-12),x+4,y+h-4);ctx.textAlign='right';ctx.fillText(ellipsisText(ctx,safe(p.year),w*.25),x+w-4,y+h-4);ctx.restore()}
function drawBack(ctx,x,y,w,h,p,img,small=false){const st=STYLES[p.style]||STYLES[0];ctx.save();styleBackground(ctx,x,y,w,h,p);const hasPhoto=clippedImage(ctx,img.back,x,y,w,h,p.photoControls.back);if(hasPhoto){ctx.fillStyle='#05050cc5';ctx.fillRect(x,y,w,h)}ctx.fillStyle=hasPhoto?'#fff':st.color;ctx.textBaseline='alphabetic';ctx.textAlign='left';let margin=Math.min(5,w*.11);let head=Math.min(5.6,w*.08);if(small)head=Math.min(3,w*.13);fitText(ctx,safe(p.album),w-margin*2,head,1.8,p,true);ctx.fillText(ellipsisText(ctx,safe(p.album),w-margin*2),x+margin,y+Math.max(9,head+3));ctx.fillStyle=p.accent;ctx.fillRect(x+margin,y+Math.max(11,head+5),Math.min(w-margin*2,19),.7);
 const songs=lines(p.tracks),n=songs.length;const top=Math.max(18,head+10);const footer=small?9:13;const usable=h-top-footer;let sz=small?Math.min(1.65,w*.055):Math.min(3.1,w*.048);sz=Math.min(sz,usable/Math.max(1,n)*.77);sz=Math.max(Math.min(1.45,sz),sz);setFont(ctx,sz,p);ctx.fillStyle=hasPhoto?'#fff':st.color;const rowH=Math.max(sz*1.4,Math.min(6,usable/Math.max(1,n)));let maxLines=Math.min(n,Math.floor(usable/rowH));if(small)maxLines=Math.min(maxLines,17);for(let i=0;i<maxLines;i++){const t=/^\d+[.)\-\s]/.test(songs[i])?songs[i]:(String(i+1).padStart(2,'0')+'. '+songs[i]);ctx.fillText(ellipsisText(ctx,t,w-margin*2),x+margin,y+top+i*rowH)}if(maxLines<n){ctx.fillStyle=p.accent;setFont(ctx,small?1.5:2.5,p,true);ctx.fillText('+'+(n-maxLines)+' треков',x+margin,y+top+maxLines*rowH)}setFont(ctx,small?1.6:2.3,p);ctx.fillStyle=hasPhoto?'#d3d3d9':st.color;ctx.fillText(ellipsisText(ctx,safe(p.year)+'  •  '+safe(p.edition),w-margin*2),x+margin,y+h-4);ctx.restore()}
function drawInside(ctx,x,y,w,h,p,img){const st=STYLES[p.style]||STYLES[0];styleBackground(ctx,x,y,w,h,p);const hasPhoto=clippedImage(ctx,img.inside,x,y,w,h,p.photoControls.inside);if(hasPhoto){ctx.fillStyle='#101022aa';ctx.fillRect(x,y,w,h)}ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle=p.accent;setFont(ctx,Math.min(5,w*.1),p,true);ctx.fillText('INSIDE / NOTES',x+4,y+11);ctx.fillStyle=hasPhoto?'white':st.color;setFont(ctx,Math.min(3,w*.05),p);const words=wrapText(ctx,safe(p.notes)||'Музыка живет здесь.',w-9,Math.max(4,Math.floor((h-25)/4)));words.forEach((s,i)=>ctx.fillText(s,x+4,y+20+i*4));const songs=lines(p.tracks);if(songs.length){setFont(ctx,2.45,p);let n=Math.min(8,songs.length);for(let i=0;i<n;i++)ctx.fillText(ellipsisText(ctx,songs[i],w-9),x+4,y+h-7-(n-i-1)*3.7)}}
function drawSpine(ctx,x,y,w,h,p){const st=STYLES[p.style]||STYLES[0];ctx.save();styleBackground(ctx,x,y,w,h,p);ctx.translate(x+w/2,y+h/2);ctx.rotate(-Math.PI/2);ctx.textAlign='center';ctx.textBaseline='middle';const txt=[safe(p.title),safe(p.album)].filter(Boolean).join(' — ');fitText(ctx,txt,h-8,Math.min(3.1,w*.52),1.8,p,true);ctx.fillStyle=st.color;ctx.fillText(ellipsisText(ctx,txt,h-8),0,0);ctx.restore()}
function drawFold(ctx,x,y,h){ctx.save();ctx.setLineDash([1.25,1.35]);ctx.lineWidth=.23;ctx.strokeStyle='#12a9d0';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+h);ctx.stroke();ctx.restore()}
function drawCut(ctx,x,y,w,h){ctx.save();ctx.lineWidth=.19;ctx.strokeStyle='#555';const m=2.8,g=.75;for(const px of [x,x+w]){for(const py of [y,y+h]){ctx.beginPath();ctx.moveTo(px,py-MAX(g,.5)-m);ctx.lineTo(px,py-g);ctx.moveTo(px,py+g);ctx.lineTo(px,py+g+m);ctx.moveTo(px-g-m,py);ctx.lineTo(px-g,py);ctx.moveTo(px+g,py);ctx.lineTo(px+g+m,py);ctx.stroke()}}ctx.restore()}
function MAX(a,b){return Math.max(a,b)}
function art(ctx,type,x,y,p,img){ctx.save();let w,h;if(type==='cassette'||type==='cassetteXL'){w=MODES[type].w;h=101.6;const frontX=x+25.4+12.7;drawBack(ctx,x,y,25.4,h,p,img,true);drawSpine(ctx,x+25.4,y,12.7,h,p);drawFront(ctx,frontX,y,65.1,h,p,img);if(type==='cassetteXL')drawInside(ctx,frontX+65.1,y,65.1,h,p,img);if(p.guides){drawFold(ctx,x+25.4,y,h);drawFold(ctx,frontX,y,h);if(type==='cassetteXL')drawFold(ctx,frontX+65.1,y,h)}}else if(type==='cdFront'){w=120;h=120;drawFront(ctx,x,y,w,h,p,img)}else if(type==='cdBack'){w=150;h=118;const spine=6.25;drawSpine(ctx,x,y,spine,h,p);drawBack(ctx,x+spine,y,w-2*spine,h,p,img,false);drawSpine(ctx,x+w-spine,y,spine,h,p);if(p.guides){drawFold(ctx,x+spine,y,h);drawFold(ctx,x+w-spine,y,h)}}else if(type==='booklet'){w=240;h=120;drawInside(ctx,x,y,120,h,p,img);drawFront(ctx,x+120,y,120,h,p,img);if(p.guides)drawFold(ctx,x+120,y,h)}if(p.guides)drawCut(ctx,x,y,w,h);ctx.restore()}
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
async function renderPage(canvas,p,pageIndex,dpi,countOverride,backSide=false){const [paperW,paperH]=sheetDimensions(p);let per=MODES[p.mode].perSheet;let copies=Number(countOverride??p.copies);let start=pageIndex*per;let thisPage=Math.min(per,Math.max(0,copies-start));const ppm=dpi/25.4;canvas.width=Math.round(paperW*ppm);canvas.height=Math.round(paperH*ppm);const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:!!p.bw});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.scale(canvas.width/paperW,canvas.height/paperH);const loaded=await resolveImages(p);const layout=artPlacements(p,thisPage);for(const item of layout){if(backSide&&(item.type==='cassette'||item.type==='cassetteXL')){artReverse(ctx,item.type,paperW-item.x-MODES[item.type].w,item.y,p,loaded)}else art(ctx,item.type,item.x,item.y,p,loaded)};if(p.calibration){let x=17,y=paperH-13;ctx.strokeStyle='#252525';ctx.lineWidth=.25;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+50,y);ctx.moveTo(x,y-1.2);ctx.lineTo(x,y+1.2);ctx.moveTo(x+50,y-1.2);ctx.lineTo(x+50,y+1.2);ctx.stroke();ctx.fillStyle='#252525';ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='2.7px Arial';ctx.fillText('50 мм · проверьте размер линейкой',x,y-2)}ctx.textAlign='right';ctx.textBaseline='alphabetic';ctx.font='2.65px Arial';ctx.fillStyle='#888';ctx.fillText('A4  •  100% / фактический размер',paperW-13,paperH-11);if(p.bw){const px=ctx.getImageData(0,0,canvas.width,canvas.height);const a=px.data;for(let i=0;i<a.length;i+=4){const v=(.299*a[i]+.587*a[i+1]+.114*a[i+2])|0;a[i]=a[i+1]=a[i+2]=v}ctx.putImageData(px,0,0)}return canvas}
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
 const per=MODES[project.mode].perSheet,count=Number(project.copies),pages=[],dpi=Number(project.quality);
 const isCassette=project.mode==='cassette'||project.mode==='cassetteXL';
 const doubleSided=!!project.duplexCassette&&isCassette;
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
 const fileName=('Обложки_'+(safe(snapshot.album)||'album').replace(/[\/:*?"<>|]/g,'_').slice(0,55)+'_'+snapshot.mode+(doubleSided?'_2-стороны':'')+'.pdf');
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
  imported.photos={front:null,back:null,inside:null,...original.photos};
  imported.photoControls={...defaultProject().photoControls,...original.photoControls};
  try{if(await storeProject(imported)){added++;first??=imported}else failed++}catch(e){failed++}
 }
 if(first){project=first;selectedPanel='front';storageSet('lacover-current',project.id);hydrate();refreshProjects()}
 showStatus('Восстановлено: '+added+' проект(ов).'+(failed?' Ошибок: '+failed+'. Проверь свободную память.':''),failed>0);
}
function bindForm(){const mapping={fontSelect:'font',accentColor:'accent',projectTitle:'title',albumTitle:'album',year:'year',edition:'edition',tracks:'tracks',notes:'notes',titlePos:'titlePos',titleScale:'titleScale',bw:'bw',guides:'guides',calibration:'calibration',cassetteDuplex:'duplexCassette',copies:'copies',quality:'quality'};for(const [id,key] of Object.entries(mapping)){$(id).addEventListener(id==='bw'||id==='guides'||id==='calibration'||id==='cassetteDuplex'||id==='copies'||id==='quality'?'change':'input',e=>{project[key]=e.target.type==='checkbox'?e.target.checked:e.target.value;if(id==='albumTitle')project.name=project.album;autosave()})}
 $('formatGrid').addEventListener('click',e=>{const btn=e.target.closest('[data-mode]');if(!btn)return;project.mode=btn.dataset.mode;hydrate();autosave()});$('panelSelect').addEventListener('change',e=>{selectedPanel=e.target.value;hydrate()});$('zoom').addEventListener('input',e=>{project.photoControls[selectedPanel].zoom=+e.target.value;autosave()});$('photoPositionX').addEventListener('input',e=>{project.photoControls[selectedPanel].x=+e.target.value;autosave()});$('photoPosition').addEventListener('input',e=>{ensurePhotoControls(selectedPanel).y=+e.target.value;autosave()});
 for(const name of ['brightness','contrast'])$(name).addEventListener('input',e=>{ensurePhotoControls(selectedPanel)[name]=+e.target.value;autosave()});
 $('rotatePhoto').onclick=()=>{const c=ensurePhotoControls(selectedPanel);c.rotate=(c.rotate+90)%360;hydrate();autosave()};
 $('flipPhoto').onclick=()=>{const c=ensurePhotoControls(selectedPanel);c.flip=!c.flip;hydrate();autosave()};
 $('resetPhoto').onclick=()=>{project.photoControls[selectedPanel]={zoom:1,x:0,y:0,rotate:0,flip:false,brightness:100,contrast:100};hydrate();autosave()};
 $('randomStyle').onclick=()=>{const previous=project.style;project.style=(previous+1+Math.floor(Math.random()*(STYLES.length-1)))%STYLES.length;project.accent=STYLES[project.style].accent;project.bw=false;hydrate();autosave();showStatus('Новый дизайн применён. Фото и надписи сохранены.')};
 $('numberTracks').onclick=()=>{const initial=project.tracks||'';if(!initial.trim()){showStatus('Впиши названия песен — нумерация появится автоматически.',true);return}const updated=numberTracksText(initial);project.tracks=updated;$('tracks').value=updated;autosave();showStatus('Песни пронумерованы: '+lines(updated).length)};
 $('imageInput').addEventListener('change',async e=>{if(!e.target.files?.length)return;const target=selectedPanel;showStatus('Обрабатываю фотографию…');try{project.photos[target]=await photoToDataURL(e.target.files[0]);updatePhotoLabel();autosave();showStatus('Фото добавлено и сохранено на устройстве.')}catch(err){showStatus(err.message,true)}e.target.value=''});$('removePhoto').onclick=()=>{project.photos[selectedPanel]=null;updatePhotoLabel();autosave()};$('exportBtn').onclick=()=>exportClick(false);$('proofBtn').onclick=exportProof;$('previewReverse').onclick=()=>{previewBack=!previewBack;updateDetails();schedulePreview()};$('shareBtn').onclick=()=>exportClick(true);$('pngBtn').onclick=exportPNG;$('infoSize').onclick=()=>$('helpDialog').showModal();$('helpBtn').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=$('okHelp').onclick=()=>$('helpDialog').close();$('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog'))$('helpDialog').close()});
 $('newBtn').onclick=async()=>{await storeProject(project);project=defaultProject();selectedPanel='front';await storeProject(project);storageSet('lacover-current',project.id);await refreshProjects();hydrate();showStatus('Новый проект создан.')};$('duplicateBtn').onclick=async()=>{let p=structuredClone(project);p.id='p'+Date.now();p.name=(project.album||'Альбом')+' — копия';p.album=p.name;p.updated=Date.now();project=p;await storeProject(project);storageSet('lacover-current',project.id);refreshProjects();hydrate()};$('deleteBtn').onclick=async()=>{if(!confirm('Удалить этот проект вместе с его фотографиями?'))return;await removeProject(project.id);let a=await getAllProjects();project=a.sort((x,y)=>y.updated-x.updated)[0]||defaultProject();await storeProject(project);selectedPanel='front';storageSet('lacover-current',project.id);refreshProjects();hydrate()};$('projectSelect').addEventListener('change',async e=>{clearTimeout(saveTimer);await storeProject(project);const a=await getAllProjects();const p=a.find(x=>x.id===e.target.value);if(!p)return;project=p;selectedPanel='front';storageSet('lacover-current',project.id);hydrate()});
 $('backupAllBtn').onclick=()=>exportAllProjects().catch(e=>showStatus('Ошибка архива: '+e.message,true));
 $('restoreAllInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{await importAllProjects(file)}catch(err){showStatus('Ошибка восстановления коллекции: '+err.message,true)}e.target.value=''});
 $('backupBtn').onclick=()=>{const json=JSON.stringify({application:'lacovers',version:1,project},null,2);offerDownload(new Blob([json],{type:'application/json'}),'Проект_'+(project.album||'Обложки')+'.json');showStatus('Резервная копия проекта сохранена.')};$('restoreInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.application!=='lacovers'||!data.project?.mode||!MODES[data.project.mode])throw new Error('Неизвестный файл проекта');project={...defaultProject(),...data.project,id:'p'+Date.now(),updated:Date.now()};project.photos={front:null,back:null,inside:null,...data.project.photos};project.photoControls={...defaultProject().photoControls,...data.project.photoControls};for(const key of ['front','back','inside'])ensurePhotoControls(key);await storeProject(project);storageSet('lacover-current',project.id);refreshProjects();hydrate();showStatus('Проект восстановлен.')}catch(err){showStatus('Ошибка импорта: '+err.message,true)}e.target.value=''})}
async function init(){bindForm();let all=await getAllProjects();let current=storageGet('lacover-current');if(!all.length){try{const old=storageGet('lacover-fallback');if(old)all=[JSON.parse(old)]}catch(e){}}project=all.find(p=>p.id===current)||all.sort((a,b)=>b.updated-a.updated)[0]||defaultProject();project.duplexCassette=!!project.duplexCassette;project.photos={front:null,back:null,inside:null,...project.photos};project.photoControls={...defaultProject().photoControls,...project.photoControls};for(const key of ['front','back','inside'])ensurePhotoControls(key);await storeProject(project);storageSet('lacover-current',project.id);hydrate();refreshProjects();if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});showStatus('Проект сохраняется автоматически на этом устройстве.')}init();