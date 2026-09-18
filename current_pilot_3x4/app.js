const TASKS=__TASK_DATA__;
const METHODS=[{key:'ours',label:'Variante A / Option A',short:'A'},{key:'adavec',label:'Variante B / Option B',short:'B'},{key:'vtracer',label:'Variante C / Option C',short:'C'},{key:'live',label:'Variante D / Option D',short:'D'}],PRACTICE_METHOD={key:'practice',label:'Übung / Practice',short:null};
const PRACTICE={id:'PRACTICE',before:'M 64 128 C 64 84 92 64 128 64 C 164 64 192 84 192 128 C 192 172 164 192 128 192 C 92 192 64 172 64 128 Z',after:'M 64 128 C 64 84 92 64 128 64 C 178 64 208 88 208 128 C 208 168 178 192 128 192 C 92 192 64 172 64 128 Z',target_guide:'M 128 64 C 178 64 208 88 208 128 C 208 168 178 192 128 192',target_guide_bounds:{x:118,y:54,width:100,height:148},input_sha256:'synthetic-practice-not-recorded',predictions:{practice:{method:'Synthetic practice',d:'M 64 128 C 64 84 92 64 128 64 C 164 64 192 84 192 128 C 192 172 164 192 128 192 C 92 192 64 172 64 128 Z',sha256:'synthetic-practice-not-recorded',original_anchor_count:4,relative_path:'embedded synthetic practice'}}};
const PRACTICE_STEPS=[
 {type:'move_anchor',title:'Schritt 1 · Ankerpunkt bewegen / Step 1 · Move anchor',text:'Den markierten blauen Ankerpunkt ziehen. / Drag the highlighted blue anchor point.'},
 {type:'insert_anchor',title:'Schritt 2 · Ankerpunkt hinzufügen / Step 2 · Add anchor',text:'„+ Ankerpunkt / Anchor“ wählen und dann die markierte Kurve anklicken. / Select “+ Anchor” and then click the marked curve.'},
 {type:'move_control',title:'Schritt 3 · Steuerpunkt anpassen / Step 3 · Adjust control',text:'Den markierten orangefarbenen Steuerpunkt ziehen. / Drag the highlighted orange control point.'}
];
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg',clone=x=>JSON.parse(JSON.stringify(x));
let phase='practice',index=0,states={},results=[],downloaded=true,finalSubmitted=false,activeKey=null,lastKey='practice',space=false,tutorialStep=0;
const SESSION_ID=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36));
const methodStarted=new Set();
function currentTask(){return phase==='practice'?PRACTICE:TASKS[index]}
function currentMethods(){return phase==='practice'?[PRACTICE_METHOD]:METHODS}
function firstStartRequired(s){return phase==='practice'?!methodStarted.has('practice'):index===0&&!methodStarted.has(s.key)}
function el(tag,attrs,parent){const n=document.createElementNS(NS,tag);for(const k in attrs)n.setAttribute(k,attrs[k]);parent.append(n);return n}
function source(s){return currentTask().predictions[s.key]}
function q(s,role){return s.card.querySelector(`[data-role="${role}"]`)}
function segmentPath(s,e){const a=s.graph.nodes[e.a],b=s.graph.nodes[e.b];return `M ${a.x} ${a.y}`+(e.c1?` C ${e.c1.x} ${e.c1.y} ${e.c2.x} ${e.c2.y} ${b.x} ${b.y}`:` L ${b.x} ${b.y}`)}
function drawPracticeGuide(s,svg){
 if(phase!=='practice'||tutorialStep>=3||s.submitted)return;
 let target,title,detail;
 if(tutorialStep===0){target=s.graph.nodes[Math.min(2,s.graph.nodes.length-1)];title='Blauen Ankerpunkt ziehen';detail='Drag the blue anchor point right'}
 if(tutorialStep===1){const seg=svg.querySelector('[data-segment="0"]'),len=seg.getTotalLength();target=seg.getPointAtLength(len*.5);title='„+ Ankerpunkt“ wählen';detail='Select “+ Anchor”, then click curve'}
 if(tutorialStep===2){const handle=svg.querySelector('.handle');if(!handle)return;target={x:+handle.getAttribute('cx'),y:+handle.getAttribute('cy')};title='Orangen Steuerpunkt ziehen';detail='Drag the orange control point'}
 const g=el('g',{class:'canvas-guide','pointer-events':'none','aria-hidden':'true'},svg),markerId=`guide-arrow-${s.key}`;
 const defs=el('defs',{},g),marker=el('marker',{id:markerId,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'},defs);el('path',{d:'M 0 0 L 10 5 L 0 10 Z',fill:'#8b5a18'},marker);
 el('line',{x1:198,y1:54,x2:target.x,y2:target.y,stroke:'#8b5a18','stroke-width':1.8,'marker-end':`url(#${markerId})`},g);
 el('circle',{class:'guide-ring',cx:target.x,cy:target.y,r:8,fill:'none',stroke:tutorialStep===2?'#d9862f':'#236f9a','stroke-width':2.2},g);
 el('rect',{x:10,y:10,width:194,height:46,rx:7,fill:'#fff7dc',stroke:'#c79243','stroke-width':1.2},g);
 const a=el('text',{x:18,y:29,fill:'#563914','font-size':9.5,'font-weight':700},g);a.textContent=title;
 const b=el('text',{x:18,y:46,fill:'#72572d','font-size':8.7},g);b.textContent=detail;
}
function elapsedMs(s){return Math.min(90000,s.accumulated+(s.running?performance.now()-s.runStarted:0))}
function log(s,type,extra={}){s.operations.push({type,elapsed_seconds:+(elapsedMs(s)/1000).toFixed(3),...extra})}
function snapshot(s){return {graph:clone(s.graph),selected:[...s.selected]}}
function remember(s,type){s.history.push(snapshot(s));s.future=[];log(s,type)}
function status(s,text){q(s,'status').textContent=text}
function createState(method){
 const src=currentTask().predictions[method.key],graph=Geometry.parse(src.d);if(graph.nodes.length!==src.original_anchor_count)throw Error('Ankerzahl stimmt nicht / Anchor count mismatch');
 return {key:method.key,label:method.label,short:method.short,graph,initial:clone(graph),selected:new Set([0]),history:[],future:[],operations:[],running:false,submitted:false,submissionReason:null,accumulated:0,runStarted:0,manualPaused:false,adding:false,drag:null,view:{x:-12,y:-12,w:280,h:280},card:null,svg:null};
}
function createCard(s){
 const finish=phase==='practice'?'Übung fertig / Finish practice':'Fertig / Done',abandon=phase==='practice'?'Überspringen / Skip':'Aufgeben / Give up';
 const clock=phase==='practice'?'Ohne Zeitlimit / Untimed':'<span class="timer"><strong data-role="remaining">90</strong> Sek. / sec</span>';
 const card=document.createElement('section');card.className='panel editor-card';card.dataset.method=s.key;
 card.innerHTML=`<div class="heading"><span>${s.label}</span><span>${clock}</span></div><div class="canvas-wrap"><svg class="canvas editor" viewBox="0 0 256 256" aria-label="${s.label} – bearbeitbare Kontur / editable contour"></svg><div data-role="startGate" class="start-gate"><button data-role="startGateButton">${phase==='practice'?'Übung starten / Start practice':'Starten / Start'}</button><span></span></div><div class="canvas-controls"><button data-role="toggle" class="primary canvas-control">Starten / Start →</button><button data-role="finish" class="complete canvas-control">${finish}</button><button data-role="abandon" class="abandon canvas-control">${abandon}</button></div></div><div class="card-actions"><button data-role="add">＋ Ankerpunkt / Anchor</button><button data-role="delete"${phase==='practice'?' hidden':''}>Anker löschen / Delete</button><button data-role="undo">Rückgängig / Undo</button><button data-role="redo">Wiederholen / Redo</button></div><div data-role="status" class="status" role="status" aria-live="polite"></div>`;
 s.card=card;s.svg=card.querySelector('svg');s.svg.setAttribute('tabindex','0');$('editors').append(card);bindCard(s);
}
function draw(s){
 const task=currentTask(),svg=s.svg,scale=s.view.w/280;svg.replaceChildren();svg.setAttribute('viewBox',`${s.view.x} ${s.view.y} ${s.view.w} ${s.view.h}`);
 const clipId=`target-clip-${task.id}-${s.key}`,defs=el('defs',{},svg),clip=el('clipPath',{id:clipId},defs),bounds=task.target_guide_bounds;el('rect',{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},clip);
 el('path',{class:'editable-path','data-method':s.key,d:Geometry.path(s.graph),fill:'#d9e7ee',stroke:'#397ca3','stroke-width':.8*scale,'pointer-events':'none'},svg);
 el('path',{class:'target-overlay',d:task.target_guide||task.after,fill:'none',stroke:'#b34763','stroke-width':1.35*scale,'stroke-dasharray':`${4*scale} ${3*scale}`,'stroke-linecap':'round','stroke-linejoin':'round','clip-path':`url(#${clipId})`,'pointer-events':'none'},svg);
 s.graph.edges.forEach((e,j)=>el('path',{d:segmentPath(s,e),fill:'none',stroke:'transparent','stroke-width':8*scale,class:'segment','data-segment':j},svg));
 s.graph.edges.forEach((e,j)=>{if(!e.c1||(phase==='practice'&&tutorialStep<2))return;for(const [k,ni] of [['c1',e.a],['c2',e.b]]){if(!s.selected.has(ni))continue;const p=e[k],a=s.graph.nodes[ni];el('line',{x1:a.x,y1:a.y,x2:p.x,y2:p.y,stroke:'#d49145','stroke-width':.7*scale,'pointer-events':'none'},svg);el('circle',{cx:p.x,cy:p.y,r:2.7*scale,fill:'#e4a355',stroke:'white','stroke-width':.7*scale,class:'handle','data-edge':j,'data-control':k},svg)}});
 s.graph.nodes.forEach((p,j)=>el('circle',{cx:p.x,cy:p.y,r:(s.selected.has(j)?3.2:2.4)*scale,fill:s.selected.has(j)?'#165c88':'#3989b6',stroke:'white','stroke-width':.8*scale,class:'node','data-node':j},svg));
 drawPracticeGuide(s,svg);
 q(s,'undo').disabled=!s.history.length||s.submitted;q(s,'redo').disabled=!s.future.length||s.submitted;q(s,'delete').disabled=!s.selected.size||s.submitted||s.graph.nodes.length<=2;q(s,'add').disabled=s.submitted||(phase==='practice'&&tutorialStep===0);q(s,'add').classList.toggle('active',s.adding);
 const toggle=q(s,'toggle'),finish=q(s,'finish'),abandon=q(s,'abandon'),gate=q(s,'startGate'),showGate=firstStartRequired(s)&&!s.submitted;toggle.className='canvas-control';toggle.hidden=showGate;gate.hidden=!showGate;finish.disabled=s.submitted||firstStartRequired(s);abandon.disabled=s.submitted;
 if(phase==='practice'&&!s.submitted&&tutorialStep<3)finish.disabled=true;
 if(phase==='practice'){finish.textContent=s.submitted&&s.submissionReason!=='participant_abandoned'?'Fertig / Done':'Übung fertig / Finish practice';abandon.textContent=s.submitted&&s.submissionReason==='participant_abandoned'?'Übersprungen / Skipped':'Überspringen / Skip'}else{finish.textContent=s.submitted&&s.submissionReason!=='participant_abandoned'?'Fertig / Done':'Fertig / Done';abandon.textContent=s.submitted&&s.submissionReason==='participant_abandoned'?'Aufgegeben / Given up':'Aufgeben / Give up'}
 if(s.submitted){toggle.textContent='Weiter bearbeiten / Edit again';toggle.classList.add('primary');toggle.disabled=false}else if(firstStartRequired(s)){toggle.textContent=phase==='practice'?'Übung starten / Start practice →':'Starten / Start →';toggle.classList.add('primary');toggle.disabled=false}else if(s.running){toggle.textContent='Pause';toggle.classList.add('pause');toggle.disabled=false}else{toggle.textContent='Fortsetzen / Resume';toggle.classList.add('primary');toggle.disabled=false}
}
function drawAll(){currentMethods().forEach(m=>draw(states[m.key]))}
function updateTutorial(){
 if(phase!=='practice')return;
 $('taskBadge').textContent=tutorialStep<3?`Übung ${tutorialStep+1} / 3 · Practice`:'Übung fertig / Practice complete';
 document.querySelectorAll('.tutorial-step').forEach((item,i)=>{item.classList.toggle('done',i<tutorialStep);item.classList.toggle('current',i===tutorialStep&&tutorialStep<3);if(i<tutorialStep)item.textContent='✓ '+['Ankerpunkt bewegen / Move anchor','Ankerpunkt hinzufügen / Add anchor','Steuerpunkt anpassen / Adjust control'][i]});
 if(tutorialStep<3){const step=PRACTICE_STEPS[tutorialStep];$('name').textContent=step.title;$('instruction').textContent=step.text}else{$('name').textContent='Übung fertig / Practice complete';$('instruction').textContent='Alle drei Aktionen sind abgeschlossen. / All three actions are complete.'}
}
function markPracticeStep(type){
 if(phase!=='practice'||tutorialStep>=3||PRACTICE_STEPS[tutorialStep].type!==type)return;
 tutorialStep+=1;updateTutorial();status(states.practice,tutorialStep<3?'Gut. Weiter zum nächsten Schritt. / Good. Continue to the next step.':'Übung abgeschlossen. / Practice complete.')
}
function pauseState(s,reason,manual=false){if(!s.running)return;s.accumulated=elapsedMs(s);s.running=false;s.runStarted=0;s.manualPaused=manual;log(s,reason);if(activeKey===s.key)activeKey=null;draw(s)}
function activate(s,reason,allowFirst=false){
 if(s.submitted)return false;if(firstStartRequired(s)&&!allowFirst){status(s,phase==='practice'?'Bitte zuerst die Übung starten. / Please start the practice first.':'Bitte zuerst starten. / Please start first.');return false}
 for(const other of Object.values(states))if(other!==s&&other.running){pauseState(other,'auto_pause_switch',false);status(other,'Automatisch pausiert. / Automatically paused.')}
 methodStarted.add(s.key);s.manualPaused=false;s.running=true;s.runStarted=performance.now();activeKey=lastKey=s.key;log(s,reason);status(s,phase==='practice'?'Übung gestartet. / Practice started.':'Zeit läuft. / Timer running.');drawAll();return true;
}
function removeRecordedResult(s){if(phase!=='study')return;for(let i=results.length-1;i>=0;i--){if(results[i].task_id===TASKS[index].id&&results[i].method_key===s.key){results.splice(i,1);break}}downloaded=false;finalSubmitted=false;updateProgress()}
function reopen(s){removeRecordedResult(s);s.submitted=false;s.submissionReason=null;s.manualPaused=false;log(s,'participant_reopen');updatePageState();activate(s,'participant_continue_after_submission',true)}
function toggleRun(s){if(s.submitted){reopen(s);return}if(s.running){pauseState(s,'participant_pause',true);status(s,'Pausiert. „Fortsetzen / Resume“ wählen. / Paused. Choose resume.')}else activate(s,methodStarted.has(s.key)?'participant_resume':'participant_start',true)}
function canEdit(s){if(s.submitted)return false;if(s.running)return true;if(firstStartRequired(s)){status(s,phase==='practice'?'Bitte zuerst die Übung starten. / Please start the practice first.':'Bitte zuerst starten. / Please start first.');return false}if(s.manualPaused){status(s,'Pausiert. Bitte fortsetzen. / Paused. Please resume.');return false}return activate(s,'auto_resume_on_edit',true)}
function applyEdit(s,type,fn){if(!canEdit(s))return;const saved=snapshot(s);try{remember(s,type);fn();markPracticeStep(type);draw(s)}catch(e){s.graph=saved.graph;s.selected=new Set(saved.selected);s.history.pop();s.operations.pop();status(s,e.message);draw(s)}}
function undo(s){if(!canEdit(s)||!s.history.length)return;s.future.push(snapshot(s));const v=s.history.pop();s.graph=v.graph;s.selected=new Set(v.selected);log(s,'undo');draw(s)}
function redo(s){if(!canEdit(s)||!s.future.length)return;s.history.push(snapshot(s));const v=s.future.pop();s.graph=v.graph;s.selected=new Set(v.selected);log(s,'redo');draw(s)}
function insert(s,j,p){applyEdit(s,'insert_anchor',()=>{const t=Geometry.nearest(s.graph,j,p);s.selected=new Set([Geometry.split(s.graph,j,t)]);s.adding=false});status(s,'Ankerpunkt eingefügt; Form unverändert. / Anchor inserted; shape unchanged.')}
function remove(s){if(!s.selected.size)return;applyEdit(s,'delete_anchor',()=>{if(s.graph.nodes.length-s.selected.size<2)throw Error('Mindestens zwei Ankerpunkte erforderlich. / At least two anchors are required.');let next=0;for(const n of [...s.selected].sort((a,b)=>b-a))next=Geometry.remove(s.graph,n);s.selected=new Set([next]);status(s,'Kurvensegmente zusammengeführt. / Curve segments merged.')})}
function point(s,e){const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(s.svg.getScreenCTM().inverse());return {x:p.x,y:p.y}}
function bindCard(s){
 q(s,'toggle').onclick=()=>toggleRun(s);q(s,'startGateButton').onclick=()=>toggleRun(s);q(s,'undo').onclick=()=>undo(s);q(s,'redo').onclick=()=>redo(s);q(s,'delete').onclick=()=>remove(s);q(s,'finish').onclick=()=>submitState(s,'participant_finished');q(s,'abandon').onclick=()=>submitState(s,'participant_abandoned');
 q(s,'add').onclick=()=>{if(!canEdit(s))return;s.adding=!s.adding;status(s,s.adding?'Kurve anklicken. / Click the curve.':'Auswahlmodus. / Selection mode.');draw(s)};
 const svg=s.svg;svg.addEventListener('focus',()=>{lastKey=s.key});svg.addEventListener('pointerdown',e=>{lastKey=s.key;if(e.button!==0&&e.button!==1)return;svg.focus({preventScroll:true});if(space||e.button===1){e.preventDefault();s.drag={pan:true,startX:e.clientX,startY:e.clientY,view:{...s.view},pointerId:e.pointerId};svg.setPointerCapture(e.pointerId);return}const n=e.target.dataset.node,edge=e.target.dataset.edge,segment=e.target.dataset.segment;if(s.adding&&segment!==undefined){e.preventDefault();if(canEdit(s))insert(s,+segment,point(s,e));return}if(segment!==undefined)return;if(n===undefined&&edge===undefined){if(!e.shiftKey){s.selected.clear();draw(s)}return}if(n!==undefined){const j=+n;if(e.shiftKey){if(s.selected.has(j))s.selected.delete(j);else s.selected.add(j);draw(s);return}if(!s.selected.has(j))s.selected=new Set([j])}if(!canEdit(s)){draw(s);return}e.preventDefault();s.drag={node:n===undefined?null:+n,edge:edge===undefined?null:+edge,control:e.target.dataset.control,base:clone(s.graph),selection:[...s.selected],start:point(s,e),pointerId:e.pointerId,remembered:false};svg.setPointerCapture(e.pointerId);draw(s)});
 svg.addEventListener('pointermove',e=>{if(!s.drag||s.drag.pointerId!==e.pointerId)return;if(s.drag.pan){const scale=s.drag.view.w/svg.getBoundingClientRect().width;s.view={...s.drag.view,x:s.drag.view.x-(e.clientX-s.drag.startX)*scale,y:s.drag.view.y-(e.clientY-s.drag.startY)*scale};draw(s);return}if(!canEdit(s)||!s.drag)return;const p=point(s,e),dx=p.x-s.drag.start.x,dy=p.y-s.drag.start.y;if(!s.drag.remembered){if(Math.hypot(dx,dy)<.15)return;remember(s,s.drag.node===null?'move_control':'move_anchor');s.drag.remembered=true}s.graph=clone(s.drag.base);if(s.drag.node!==null){const set=new Set(s.drag.selection);for(const n of set){s.graph.nodes[n].x+=dx;s.graph.nodes[n].y+=dy}for(const ed of s.graph.edges){if(ed.c1&&set.has(ed.a)){ed.c1.x+=dx;ed.c1.y+=dy}if(ed.c2&&set.has(ed.b)){ed.c2.x+=dx;ed.c2.y+=dy}}}else{const old=s.drag.base.edges[s.drag.edge][s.drag.control];Geometry.moveControl(s.graph,s.drag.edge,s.drag.control,{x:old.x+dx,y:old.y+dy})}if(!s.drag.tutorialMarked){markPracticeStep(s.drag.node===null?'move_control':'move_anchor');s.drag.tutorialMarked=true}draw(s)});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(ev,()=>{s.drag=null});svg.addEventListener('dblclick',e=>{const j=e.target.dataset.segment;if(j!==undefined&&canEdit(s)){e.preventDefault();insert(s,+j,point(s,e))}});svg.addEventListener('wheel',e=>{e.preventDefault();if(s.drag)return;const p=point(s,e),factor=e.deltaY>0?1.12:1/1.12,w=Math.max(35,Math.min(900,s.view.w*factor)),ratio=w/s.view.w;s.view={x:p.x-(p.x-s.view.x)*ratio,y:p.y-(p.y-s.view.y)*ratio,w,h:w};draw(s)},{passive:false});
}
function submitState(s,reason){
 if(s.submitted||(reason!=='participant_abandoned'&&firstStartRequired(s)))return;if(s.running){s.accumulated=elapsedMs(s);s.running=false;s.runStarted=0}if(activeKey===s.key)activeKey=null;s.submitted=true;s.submissionReason=reason;s.drag=null;s.adding=false;log(s,reason);
 if(phase==='study'){const src=source(s),elapsed=Math.min(90,s.accumulated/1000);results.push({mode:'clean2400_editing_pilot',task_id:TASKS[index].id,benchmark_ordinal:TASKS[index].benchmark_ordinal,sample_id:TASKS[index].sample_id,method:src.method,method_key:s.key,method_code:s.short,completion_state:reason==='participant_abandoned'?'abandoned':'completed',source_svg_sha256:src.sha256,input_sha256:TASKS[index].input_sha256,source_path:src.relative_path,attempt:results.length+1,submitted_at:new Date().toISOString(),elapsed_seconds:+elapsed.toFixed(3),stop_reason:reason,success:null,original_anchor_count:s.initial.nodes.length,final_anchor_count:s.graph.nodes.length,initial_path:Geometry.path(s.initial),edited_path:Geometry.path(s.graph),target_path:TASKS[index].after,operations:clone(s.operations)});downloaded=false;updateProgress()}
 status(s,reason==='participant_abandoned'?(phase==='practice'?'Übung übersprungen. / Practice skipped.':'Als aufgegeben markiert. / Marked as given up.'):(reason==='timeout'?'Zeit abgelaufen; Ergebnis gespeichert. / Time expired; result saved.':phase==='practice'?'Übung abgeschlossen. / Practice complete.':'Variante abgeschlossen. / Option complete.'));updatePageState();draw(s);
}
function tick(){if(phase==='practice')return;for(const s of Object.values(states)){if(!s.running)continue;const left=Math.max(0,90-elapsedMs(s)/1000);q(s,'remaining').textContent=Math.ceil(left);if(left<=0)submitState(s,'timeout')}}
function updateProgress(){const total=results.length,max=TASKS.length*METHODS.length;$('totalProgress').max=max;$('totalProgress').value=total;$('progressLabel').textContent=`${total} / ${max}`;for(const m of METHODS){const count=results.filter(r=>r.method_code===m.short).length;$('progress'+m.short).max=TASKS.length;$('progress'+m.short).value=count;$('progress'+m.short+'Text').textContent=`${count} / ${TASKS.length}`}$('count').textContent=`${total} / ${max} fertig / complete`}
function updatePageState(){
 const complete=currentMethods().every(m=>states[m.key].submitted);
 if(phase==='practice'){
  $('submit').hidden=true;$('next').hidden=false;
  if($('experienceWrap')) $('experienceWrap').style.display='flex';
  const exp=$('experience')?$('experience').value:'';
  const canStart=complete&&exp!=='';
  $('next').disabled=!canStart;$('next').textContent='Studie starten / Start study →';
  $('pageStatus').textContent=complete?(exp===''?'Bitte Erfahrung wählen. / Please select experience.':'Übung fertig. / Practice complete.'):'Drei Schritte ausführen oder überspringen. / Complete three steps or skip.';
  return;
 }
 if($('experienceWrap')) $('experienceWrap').style.display='none';
 const last=index===TASKS.length-1;$('next').hidden=last;$('next').disabled=!complete;$('next').textContent='Nächste Aufgabe / Next task →';$('submit').hidden=!(last&&complete);$('submit').disabled=false;$('submit').textContent=finalSubmitted?'Erneut teilen / Share again':'Teilen / Ergebnisse speichern · Share / Save results';$('pageStatus').classList.toggle('submit-success',finalSubmitted);$('pageStatus').textContent=finalSubmitted?'Ergebnisse bereit. / Results ready.':complete?(last?'Alles abgeschlossen. / All complete.':'Aufgabe abgeschlossen. / Task complete.'):'Alle vier Varianten abschließen oder aufgeben. / Complete or give up all four options.';
}
function renderTarget(task){$('target').replaceChildren();el('path',{d:task.after,fill:'#397fa6'},$('target'));el('path',{d:task.before,fill:'none',stroke:'#8b99a3','stroke-width':.8,'stroke-dasharray':'3 2'},$('target'))}
function buildCards(methods){$('editors').replaceChildren();states={};for(const method of methods){const s=createState(method);states[method.key]=s;createCard(s);status(s,'');draw(s)}}
function loadPractice(){phase='practice';tutorialStep=0;activeKey=null;lastKey='practice';$('taskBadge').textContent='Übung 1 / 3 · Practice';$('count').textContent='Ohne Zeitlimit / Untimed';$('progressBlock').hidden=true;$('tutorialSteps').hidden=true;$('name').textContent='Schritt 1 · Ankerpunkt bewegen / Step 1 · Move anchor';$('instruction').textContent='Hinweise in der Arbeitsfläche befolgen. / Follow the in-canvas guide.';$('editors').classList.add('practice');renderTarget(PRACTICE);buildCards([PRACTICE_METHOD]);updateTutorial();updatePageState()}
function loadStudy(i){phase='study';index=i;activeKey=null;lastKey='ours';$('progressBlock').hidden=false;$('tutorialSteps').hidden=true;$('editors').classList.remove('practice');$('name').textContent=TASKS[i].title;$('instruction').textContent='';$('taskBadge').textContent=`Aufgabe ${i+1} / ${TASKS.length} · Task · ${TASKS[i].title}`;renderTarget(TASKS[i]);buildCards(METHODS);updateProgress();updatePageState()}
function load(i){loadStudy(i)}
function download(text,type,name){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
function resultText(){return JSON.stringify({schema:'anchorflow-benchmark2400-editor-v1',study_session_id:SESSION_ID,participant_experience:$('experience')?$('experience').value:'',note:'Synthetic practice is not recorded. Clean2400 examples 1092, 973, and 1285 use four native method outputs and authored target edits. Results are not uploaded automatically.',records:results},null,2)}
async function deliverResults(){
 const text=resultText(),name=`shape-edit-${SESSION_ID.slice(0,8)}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`,file=new File([text],name,{type:'application/json'});let shared=false;
 if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({title:'Ergebnisse der Formbearbeitungsstudie / Shape Editing Study Results',text:'Bitte an das Forschungsteam senden. / Please send this file to the research team.',files:[file]});shared=true}catch(e){if(e.name!=='AbortError')console.warn(e)}}
 if(!shared)download(text,'application/json',name);
 downloaded=true;finalSubmitted=true;updatePageState();$('pageStatus').textContent=shared?'Freigabe geöffnet. / Share sheet opened.':'Datei heruntergeladen. Bitte per E-Mail oder Chat senden. / File downloaded. Please send it by email or chat.';
}
$('next').onclick=()=>{if(phase==='practice'){if(states.practice.submitted&&$('experience')&&$('experience').value!=='')loadStudy(0);return}if(METHODS.every(m=>states[m.key].submitted)&&index<TASKS.length-1)loadStudy(index+1)};
$('submit').onclick=()=>{if(results.length===TASKS.length*METHODS.length)deliverResults()};
if($('experience')) $('experience').onchange=updatePageState;
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;const s=states[activeKey]||states[lastKey];if(e.code==='Space'){e.preventDefault();space=true}if(!s)return;if(e.key==='Escape'){s.adding=false;draw(s)}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo(s):undo(s)}if((e.key==='Delete'||e.key==='Backspace')&&s.selected.size){e.preventDefault();remove(s)}});
document.addEventListener('keyup',e=>{if(e.code==='Space')space=false});window.addEventListener('blur',()=>{space=false;for(const s of Object.values(states))s.drag=null});window.addEventListener('beforeunload',e=>{if(Object.values(states).some(s=>s.running)||(!downloaded&&results.length)){e.preventDefault();e.returnValue=''}});
setInterval(tick,100);loadPractice();
