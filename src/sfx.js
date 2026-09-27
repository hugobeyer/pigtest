import musicUrl from '../assets/music/farm_fun_groove.mp3';
import {SFX} from './tokens.js';

const files=import.meta.glob('../assets/sfx/*.mp3',{eager:true,import:'default'});
const context=new AudioContext();
const master=context.createGain(), musicGain=context.createGain();
const banks={}, last={};
let unlocked=false, music=null, playing=false, muted=false;
master.gain.value=SFX.volume;
master.connect(context.destination);
musicGain.connect(master);
addEventListener('pointerdown',()=>{unlocked=true; context.resume(); startMusic();},true);
addEventListener('visibilitychange',()=>document.hidden ? context.suspend() : unlocked && context.resume());
const button=document.createElement('button');
button.id='mute';
button.textContent='🔊';
button.addEventListener('click',()=>toggleMute());
document.body.appendChild(button);
addEventListener('keydown',event=>{if((event.key==='m' || event.key==='M') && event.target.tagName!=='INPUT')toggleMute();});

export function toggleMute(){
  muted=!muted;
  master.gain.setTargetAtTime(muted ? 0 : SFX.volume,context.currentTime,.03);
  button.textContent=muted ? '🔇' : '🔊';
}

const load=url=>fetch(url).then(response=>response.arrayBuffer()).then(data=>context.decodeAudioData(data));

for(const [path,url] of Object.entries(files)){
  const name=path.match(/(\w+)_\d+\.mp3$/)[1];
  load(url).then(buffer=>(banks[name]??=[]).push(buffer));
}

load(musicUrl).then(buffer=>{music=buffer; startMusic();});

function startMusic(){
  if(!music || !unlocked || playing)return;
  playing=true;
  const source=context.createBufferSource(), {volume,fadeIn}=SFX.music;
  source.buffer=music;
  source.loop=true;
  source.connect(musicGain);
  musicGain.gain.setValueAtTime(0,context.currentTime);
  musicGain.gain.linearRampToValueAtTime(volume,context.currentTime+fadeIn);
  source.start();
}

export function play(name,rate=1){
  const bank=banks[name], {volume,pitch,gap}=SFX.sounds[name], now=context.currentTime;
  if(!bank || !unlocked || now-(last[name]??-gap)<gap)return;
  last[name]=now;
  const source=context.createBufferSource(), gain=context.createGain();
  source.buffer=bank[Math.floor(Math.random()*bank.length)];
  source.playbackRate.value=rate*(1+(Math.random()*2-1)*pitch);
  gain.gain.value=volume;
  source.connect(gain).connect(master);
  source.start();
}
