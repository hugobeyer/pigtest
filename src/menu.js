import {writeText} from './labels.js';
import {MENU, WIN} from './tokens.js';

export function showMenu(modes){
  const menu=document.createElement('div');
  menu.id='menu';
  menu.innerHTML=`<div class="sign"><div class="fit"><canvas></canvas></div></div>${Object.keys(modes).map((mode,i)=>
    `<div class="plank" data-mode="${mode}" style="animation-delay:${.25+i*.12}s"><div class="fit"><canvas></canvas></div></div>`).join('')}`;
  menu.addEventListener('pointerdown',event=>{
    const button=event.target.closest('[data-mode]');
    if(!button)return;
    menu.remove();
    modes[button.dataset.mode]();
  });
  document.body.appendChild(menu);
  const [title,...buttons]=menu.querySelectorAll('.fit');
  writeText(title.firstChild,MENU.title,title.offsetHeight*WIN.text.sign,WIN.ink);
  buttons.forEach(fit=>writeText(fit.firstChild,MENU[fit.parentNode.dataset.mode],fit.offsetHeight*MENU.size));
}
