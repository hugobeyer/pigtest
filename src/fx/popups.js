import {FX} from '../tokens.js';

const images=import.meta.glob('../../assets/words/*.webp',{eager:true,import:'default'});
let camera;

export const wordImage=name=>images[`../../assets/words/${name}.webp`];

export function initPopups(targetCamera){
  camera=targetCamera;
}

export function popup(name,position){
  const {width,lift,duration,sweep}=FX.combo;
  const point=position.clone();
  point.z+=lift;
  point.project(camera);
  const rect=document.querySelector('canvas').getBoundingClientRect();
  const word=document.createElement('div');
  word.className='word popup';
  word.style.cssText=`left:${rect.left+(point.x*.5+.5)*rect.width}px;top:${rect.top+(.5-point.y*.5)*rect.height}px;width:${width*rect.width}px;--word:url(${wordImage(name)});--life:${duration}s;--sweep:${sweep}s`;
  word.addEventListener('animationend',event=>{if(event.animationName==='word-life')word.remove();});
  document.body.appendChild(word);
}
