// SPDX-License-Identifier: GPL-3.0-or-later
import {detectSave} from './vendor/reader/js/saves/index.js';
const $=id=>document.getElementById(id);
const status=message=>$('status').textContent=message;
const worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
let gameCode=null,loaded=false,isDiagnostic=false,running=false,busy=false,pressed=new Map(),keyboard=new Set(),touch=[-1,-1],checkpointFailures=new Set(),readerHandoff=false,readerTab=null;
const settings={autoLoadROM:localStorage.getItem('b1-auto-load-rom')!=='false',autoLoadState:localStorage.getItem('b1-auto-load-state')!=='false'};
$('auto-load-rom').checked=settings.autoLoadROM;$('auto-load-state').checked=settings.autoLoadState;
$('auto-load-rom').onchange=()=>{settings.autoLoadROM=$('auto-load-rom').checked;localStorage.setItem('b1-auto-load-rom',String(settings.autoLoadROM));};
$('auto-load-state').onchange=()=>{settings.autoLoadState=$('auto-load-state').checked;localStorage.setItem('b1-auto-load-state',String(settings.autoLoadState));};
let audio=null,audioNode=null,audioGain=null,audioMuted=true,audioHealth={},metrics={},saveHealth={},stateHealth={},presentations=0,presentationStart=0,presentationRate=0;
const capabilities={secureContext:isSecureContext,wasm:typeof WebAssembly==='object',worker:typeof Worker==='function',
  audioWorklet:typeof AudioWorkletNode==='function',indexedDB:!!globalThis.indexedDB,serviceWorker:'serviceWorker'in navigator,
  persistentStorage:!!navigator.storage?.persist,standalone:matchMedia('(display-mode: standalone)').matches||!!navigator.standalone,
  crossOriginIsolated:globalThis.crossOriginIsolated||false,webLocks:!!navigator.locks,threadedBuild:false};
$('capabilities').textContent=Object.entries(capabilities).map(([k,v])=>`${k}: ${v?'yes':'no'}`).join(' · ');
const contexts=[$('top'),$('bottom')].map(c=>c.getContext('2d',{alpha:false}));
const image=contexts.map(c=>c.createImageData(256,192));
function send(type,data={}){worker.postMessage({type,...data});}
function controls(){for(const id of ['rom','reopen','diagnostic'])$(id).disabled=busy;
  for(const id of ['resume','pause','export','persist','save-file'])$(id).disabled=busy||!loaded||(id==='save-file'&&isDiagnostic);
  $('quick-save').disabled=busy||!loaded||isDiagnostic;$('retry-state').disabled=busy||!loaded||!checkpointFailures.size;
  $('resume').disabled||=running;$('pause').disabled||=!running;
}

function checkpointTime(at){return new Date(at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});}
function showCheckpointChoices(options={}){
  const valid=['auto','quick'].filter(slot=>options[slot]?.at);
  if(!valid.length)return;
  const latest=valid.sort((a,b)=>options[b].at-options[a].at)[0],info=options[latest];
  $('checkpoint-summary').textContent=`A local ${latest==='quick'?'Quick Save':'automatic checkpoint'} is available from ${checkpointTime(info.at)}${info.recovered?' (recovered from the previous valid copy)':''}.`;
  $('resume-latest').textContent=`Resume latest · ${latest==='quick'?'Quick Save':'automatic'}`;
  $('resume-latest').dataset.slot=latest;
  $('restore-quick').hidden=!options.quick?.at;
  if(options.quick?.at)$('restore-quick').textContent=`Restore Quick Save · ${checkpointTime(options.quick.at)}${options.quick.recovered?' (previous copy)':''}`;
  $('checkpoint-dialog').showModal();
}
async function startAudio(){
  if(!globalThis.AudioContext||!capabilities.audioWorklet)throw Error('AudioWorklet unavailable. Use a current Safari over HTTPS.');
  if(!audio){audio=new AudioContext({sampleRate:48000,latencyHint:'interactive'});await audio.audioWorklet.addModule('./audio-worklet.js');
    audioNode=new AudioWorkletNode(audio,'reader-b1-audio',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});audioGain=audio.createGain();audioGain.gain.value=audioMuted?0:1;audioNode.connect(audioGain);audioGain.connect(audio.destination);
    audioNode.port.onmessage=({data})=>{audioHealth={...data,sampleRate:audio.sampleRate,state:audio.state};renderMetrics();};
    audio.onstatechange=()=>{if(running&&audio.state!=='running')pause();};
  }
  audioNode.port.postMessage({reset:true});await audio.resume();
}
function pause(){send('pause');clearInput();audioNode?.port.postMessage({reset:true});audio?.suspend().catch(()=>{});}
function clearInput(){pressed.clear();keyboard.clear();touch=[-1,-1];document.querySelectorAll('.pressed').forEach(e=>e.classList.remove('pressed'));input();}
function input(){let keys=0;for(const k of [...pressed.values(),...keyboard])keys|=1<<k;send('input',{keys,touch});}
const keyMap={KeyZ:0,KeyX:1,ShiftLeft:2,ShiftRight:2,Enter:3,ArrowRight:4,ArrowLeft:5,ArrowUp:6,ArrowDown:7,KeyW:8,KeyQ:9,KeyS:10,KeyA:11};
const controlSurface=document.querySelector('.controls');
const activePointers=new Map();
function buttonAtPoint(x,y){
  const target=document.elementFromPoint(x,y);
  const button=target?.closest?.('.controls [data-key]');
  return button&&controlSurface.contains(button)?button:null;
}
function refreshPressedButtons(){
  document.querySelectorAll('.controls [data-key]').forEach(button=>button.classList.toggle('pressed',
    [...pressed.values()].includes(Number(button.dataset.key))));
}
function updatePointer(event){
  if(!activePointers.has(event.pointerId))return;
  const button=buttonAtPoint(event.clientX,event.clientY);
  const key=button?Number(button.dataset.key):null;
  if(key===null)pressed.delete(event.pointerId);else pressed.set(event.pointerId,key);
  activePointers.set(event.pointerId,key);
  refreshPressedButtons();input();
}
controlSurface.addEventListener('pointerdown',event=>{
  const button=buttonAtPoint(event.clientX,event.clientY);
  if(!button)return;
  event.preventDefault();
  activePointers.set(event.pointerId,null);
  controlSurface.setPointerCapture(event.pointerId);
  updatePointer(event);
});
controlSurface.addEventListener('pointermove',updatePointer);
function releasePointer(event){
  if(!activePointers.has(event.pointerId))return;
  activePointers.delete(event.pointerId);pressed.delete(event.pointerId);
  refreshPressedButtons();input();
}
for(const name of ['pointerup','pointercancel','lostpointercapture'])controlSurface.addEventListener(name,releasePointer);
controlSurface.addEventListener('contextmenu',event=>event.preventDefault());
addEventListener('keydown',event=>{if(keyMap[event.code]===undefined||!running)return;event.preventDefault();keyboard.add(keyMap[event.code]);input();});
addEventListener('keyup',event=>{if(keyMap[event.code]===undefined)return;keyboard.delete(keyMap[event.code]);input();});
let touchPointer=null;
function mapTouch(event){const r=$('bottom').getBoundingClientRect();touch=[Math.max(0,Math.min(255,Math.floor((event.clientX-r.left)*256/r.width))),Math.max(0,Math.min(191,Math.floor((event.clientY-r.top)*192/r.height)))];input();}
$('bottom').addEventListener('pointerdown',event=>{if(touchPointer!==null)return;event.preventDefault();touchPointer=event.pointerId;$('bottom').setPointerCapture(event.pointerId);mapTouch(event);});
$('bottom').addEventListener('pointermove',event=>{if(touchPointer===event.pointerId)mapTouch(event);});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('bottom').addEventListener(name,event=>{if(touchPointer!==event.pointerId)return;touchPointer=null;touch=[-1,-1];input();});
addEventListener('blur',()=>{clearInput();if(running&&!readerHandoff)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
async function action(fn){try{await fn();}catch(error){busy=false;status(error.message);controls();}}
$('rom').onchange=()=>action(async()=>{const file=$('rom').files[0];if(!file)return;
  storageInfo(true);
  if(!/\.nds$/i.test(file.name)||file.size<512||file.size>512*1024*1024)throw Error('Choose an uncompressed .nds file, 512 bytes–512 MiB.');
  pause();busy=true;controls();status('Loading local cartridge and retaining an offline copy…');
  const rom=new Uint8Array(await file.arrayBuffer());send('load',{rom});$('rom').value='';});
for(const id of ['reopen','diagnostic'])$(id).onclick=()=>{pause();busy=true;controls();send(id);};
$('resume').onclick=()=>action(async()=>{if(!audioMuted)await startAudio();send('resume');});
$('pause').onclick=pause;
$('reader-link').addEventListener('click',event=>{event.preventDefault();readerHandoff=true;readerTab=window.open('about:blank','_blank');if(!readerTab){readerHandoff=false;status('Allow pop-ups to open Pokémon Reader after the game is safely paused.');return;}busy=true;controls();status('Pausing and saving the current emulator state before opening Reader…');send('pause-for-reader');});
function updateAudioToggle(){const button=$('audio-toggle');button.classList.toggle('muted',audioMuted);button.setAttribute('aria-pressed',String(audioMuted));button.setAttribute('aria-label',audioMuted?'Unmute game audio':'Mute game audio');button.title=audioMuted?'Unmute game audio':'Mute game audio';}
$('audio-toggle').onclick=()=>{audioMuted=!audioMuted;if(audioGain)audioGain.gain.setTargetAtTime(audioMuted?0:1,audio?.currentTime||0,.012);updateAudioToggle();if(!audioMuted)action(async()=>{await startAudio();});};
updateAudioToggle();
$('quick-save').onclick=()=>{if($('quick-save').disabled)return;$('quick-save').disabled=true;$('state-status').textContent='Capturing Quick Save…';send('quick-save');};
$('retry-state').onclick=()=>{const slot=checkpointFailures.values().next().value;if(slot)send('retry-state',{slot});};
$('resume-latest').onclick=()=>{busy=true;controls();send('restore-state',{slot:$('resume-latest').dataset.slot});};
$('restore-quick').onclick=()=>{busy=true;controls();send('restore-state',{slot:'quick'});};
$('export').onclick=()=>send('export');$('persist').onclick=()=>send('persist');
$('save-file').onchange=()=>action(async()=>{const f=$('save-file').files[0];if(!f)return;pause();
  if(!['CPUE','IPGE'].includes(gameCode))throw Error('B1 save import is validated for original English Platinum and SoulSilver only.');
  if(f.size!==0x80000)throw Error('Import a raw 512 KiB .sav. Containers and native states are not supported.');
  const bytes=new Uint8Array(await f.arrayBuffer()),parsed=detectSave(bytes),expected=gameCode==='CPUE'?'platinum':'soulsilver';
  if(!parsed.valid||(parsed.gameId||'soulsilver')!==expected)throw Error('Reader validation rejected this save for the loaded game.');
  if(!confirm('Replace this ROM’s current cartridge save and restart? Export your current save first if needed.'))return;
  busy=true;controls();send('import',{bytes});$('save-file').value='';});
function download(bytes,name,type='application/octet-stream'){const url=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function renderMetrics(){const rows={
  'Emulated speed':`${((metrics.speed||0)*100).toFixed(1)}% real time`,'Active / emulated time':`${(metrics.activeSeconds||0).toFixed(1)} / ${(metrics.emulatedSeconds||0).toFixed(1)} s`,
  'Core frame mean / p95':`${(metrics.coreFrameMeanMs||0).toFixed(2)} / ${(metrics.coreFrameP95Ms||0).toFixed(2)} ms`,
  'Emulation frame interval':`${(metrics.frameIntervalMeanMs||0).toFixed(2)} ms`,'Canvas presentations':`${presentationRate.toFixed(1)} /s`,
  'Audio health (cumulative)':`${audioHealth.underrunFrames||0} missing output samples · ${audioHealth.droppedFrames||0} dropped input frames`,
  'Audio queue / context':`${(audioHealth.bufferedMs||0).toFixed(0)} ms / ${audio?.state||'not started'}`,
  'Last persistence':`${saveHealth.state||'none'} · ${(saveHealth.ms||0).toFixed(1)} ms`,
  'Last full-state checkpoint':stateHealth.at?`${stateHealth.slot||'state'} · ${(stateHealth.length/1048576).toFixed(1)} MiB · ${(stateHealth.captureMs||0).toFixed(1)} ms capture / ${(stateHealth.ms||0).toFixed(1)} ms storage`:'none',
  'Persistence failures':saveHealth.failures||0,'Full-state failures':stateHealth.failures||0};
  $('metrics').replaceChildren(...Object.entries(rows).flatMap(([k,v])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k;dd.textContent=v;return[dt,dd];}));
}
worker.onmessage=({data})=>{
  switch(data.type){
    case 'ready':busy=false;controls();$('run-state').textContent='Ready';
      if(settings.autoLoadROM&&data.hasRetainedROM){busy=true;controls();status('Reopening your last .nds…');send('reopen');}
      else status('Choose your own cartridge, reopen a retained ROM, or run the original diagnostic.');
      break;
    case 'loaded':loaded=true;busy=false;gameCode=data.gameCode;isDiagnostic=data.diagnostic;controls();
      status(data.diagnostic?'Original red/green diagnostic loaded. Tap Resume.':'Cartridge loaded locally. Tap Resume.');
      $('save-status').textContent=data.recovered?'Recovered the previous checksum-valid cartridge save. Export a backup.':data.hasSave?'Stored cartridge save restored.':'No stored save yet. Save normally in-game.';
      checkpointFailures.clear();$('state-status').textContent=data.checkpoints?.auto?.error||data.checkpoints?.quick?.error||'No full-state checkpoint yet.';
      const valid=['auto','quick'].filter(slot=>data.checkpoints?.[slot]?.at);
      if(settings.autoLoadState&&valid.length){const latest=valid.sort((a,b)=>data.checkpoints[b].at-data.checkpoints[a].at)[0];busy=true;controls();status('Restoring the latest full-state checkpoint…');send('restore-state',{slot:latest});}
      else showCheckpointChoices(data.checkpoints);
      controls();break;
    case 'running':running=true;document.body.classList.add('playing');scrollTo(0,0);requestAnimationFrame(captureViewport);presentations=0;presentationRate=0;presentationStart=performance.now();$('run-state').textContent='Running';status('Normal speed · no fast-forward');controls();break;
    case 'paused':running=false;clearInput();document.body.classList.remove('playing');$('run-state').textContent='Paused';audioNode?.port.postMessage({reset:true});audio?.suspend().catch(()=>{});controls();break;
    case 'video':for(let s=0;s<2;s++){const src=data.data.subarray(s*256*192*4,(s+1)*256*192*4),dst=image[s].data;
      for(let p=0;p<src.length;p+=4){dst[p]=src[p+2];dst[p+1]=src[p+1];dst[p+2]=src[p];dst[p+3]=255;}contexts[s].putImageData(image[s],0,0);}
      presentations++;presentationRate=presentations/Math.max(.001,(performance.now()-presentationStart)/1000);send('presented');break;
    case 'audio':if(running&&audio?.state==='running')audioNode?.port.postMessage({samples:data.samples},[data.samples.buffer]);break;
    case 'metrics':metrics=data.metrics;renderMetrics();break;
    case 'save':saveHealth={...saveHealth,...data,failures:(saveHealth.failures||0)+(data.state==='failed'?1:0)};
      $('save-status').textContent=data.state==='persisted'?`Persisted browser snapshot at ${new Date(data.at).toLocaleTimeString()} (${data.ms.toFixed(1)} ms). Finish the in-game save, then export a backup.`:
        data.state==='failed'?'Persistence failed. RAM retained. Export now, free storage, then retry.':data.state==='dirty'?'Cartridge changed — persistence pending…':'Writing browser snapshot…';renderMetrics();break;
    case 'checkpoint':
      if(data.state==='persisted'){
        checkpointFailures.delete(data.slot);stateHealth={...data,failures:stateHealth.failures||0};$('state-status').textContent=`${data.slot==='quick'?'Quick Save':'Automatic recovery'} saved locally at ${checkpointTime(data.at)} · ${(data.length/1048576).toFixed(1)} MiB · ${(data.captureMs||0).toFixed(0)} ms capture / ${(data.ms||0).toFixed(0)} ms storage.`;
        $('quick-save').classList.toggle('saved',data.slot==='quick');setTimeout(()=>$('quick-save').classList.remove('saved'),1800);
      }else if(data.state==='failed'){
        checkpointFailures.add(data.slot);stateHealth={...stateHealth,failures:(stateHealth.failures||0)+1};$('state-status').textContent=`${data.slot==='quick'?'Quick Save':'Automatic recovery'} failed: ${data.message||'browser storage unavailable'}.`;
      }else $('state-status').textContent=data.slot==='quick'?'Writing Quick Save…':'Writing automatic recovery checkpoint…';
      controls();break;
    case 'state-restored':
      busy=false;$('checkpoint-dialog').close();checkpointFailures.clear();
      $('state-status').textContent=`Restored ${data.slot==='quick'?'Quick Save':'automatic recovery'} from ${checkpointTime(data.at)}${data.recovered?' (previous valid copy)':''}.`;
      status('Full emulator state restored. Resuming muted…');controls();send('resume');break;
    case 'export':{
      if(!data.bytes.length){status('No cartridge save memory to export.');break;}
      let validation='Reader check unavailable for this game';
      if(['CPUE','IPGE'].includes(gameCode)){const parsed=detectSave(data.bytes);validation=parsed.valid?'Reader parser validated this exported snapshot':'Reader validation failed: the game may not have finished saving. Keep this raw recovery copy and retry after a completed in-game save.';}
      download(data.bytes,'reader-b1-cartridge.sav');status(validation+'. Export pauses emulation.');break;}
    case 'reader-ready':if(readerTab&&!readerTab.closed)readerTab.location.href='https://thedraconicpanda.github.io/pokemon-reader/';readerTab=null;readerHandoff=false;busy=false;controls();status('Emulator paused and full-state checkpoint persisted. Pokémon Reader opened in a new tab.');break;
    case 'imported':busy=false;controls();status('Validated raw save imported and persisted. Cartridge restarted; tap Resume.');break;
    case 'error':if(readerHandoff){if(readerTab&&!readerTab.closed)readerTab.close();readerTab=null;readerHandoff=false;}busy=false;status(data.message);controls();break;
  }
};
worker.onerror=()=>{busy=true;status('Core worker could not start. Check secure context, available memory and the WASM build; reload before continuing.');controls();};
$('report').onclick=()=>download(JSON.stringify({prototype:'B1 0.1.1',core:'b86390e4428bf38ce4c1ce0e9ca446d6d25955e8',capabilities,metrics,presentationRate,audioHealth,saveHealth:{state:saveHealth.state,ms:saveHealth.ms,failures:saveHealth.failures||0},stateHealth,checkpointStatus:$('state-status').textContent,userAgent:navigator.userAgent,deviceAcceptance:'pending'},null,2),'reader-b1-diagnostics.json','application/json');
async function storageInfo(request=false){try{let persistent=await navigator.storage?.persisted?.();if(request)persistent=await navigator.storage?.persist?.();const estimate=await navigator.storage?.estimate?.();
  $('storage-status').textContent=`Persistent storage: ${persistent?'granted':'not granted / unsupported'}. Estimated use ${((estimate?.usage||0)/1048576).toFixed(1)} MiB / quota ${((estimate?.quota||0)/1048576).toFixed(0)} MiB. Export saves even when persistence is granted.`;
}catch{$('storage-status').textContent='Storage policy unavailable. Writes may fail; retain exported backups.';}}
$('storage').onclick=()=>storageInfo(true);storageInfo();
async function offline(){try{
  if(window.__readerNativeConfig){$('offline').textContent='Offline app bundled with Reader.';return;}
  if(!isSecureContext||!('serviceWorker'in navigator))throw Error('HTTPS required for offline installation. PC LAN HTTP does not qualify on iPhone.');
  const hadController=!!navigator.serviceWorker.controller;
  if(hadController)navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});
  const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
  await registration.update();
  if(registration.waiting)registration.waiting.postMessage({type:'SKIP_WAITING'});
  await navigator.serviceWorker.ready;
  if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
  const channel=new MessageChannel();channel.port1.onmessage=({data})=>$('offline').textContent=`Offline app ready · ${data.version}. On iPhone, add this page to Home Screen.`;
  navigator.serviceWorker.controller.postMessage({type:'version'},[channel.port2]);
}catch(error){$('offline').textContent=error.message||'Offline setup failed. Keep online and retry; do not assume startup is cached.';}}
offline();renderMetrics();busy=true;controls();
