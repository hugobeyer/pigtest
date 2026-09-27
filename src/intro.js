import {writeText} from './labels.js';
import {INTRO} from './tokens.js';

export function showIntro(){
  const banner=document.createElement('div');
  banner.id='intro';
  banner.style.top=INTRO.top;
  banner.innerHTML='<div class="fit"><canvas></canvas></div>';
  document.body.appendChild(banner);
  const text=banner.firstChild;
  writeText(text.firstChild,INTRO.text,text.offsetHeight*INTRO.size);
  addEventListener('pointerdown',()=>{
    banner.classList.add('out');
    banner.addEventListener('animationend',event=>{if(event.animationName==='intro-out')banner.remove();});
  },{capture:true,once:true});
}
