import {WIN} from './tokens.js';

export function showWin(){
  const panel=document.createElement('div');
  panel.id='win';
  panel.innerHTML=`<strong>${WIN.title}</strong><span>${WIN.hint}</span>`;
  panel.addEventListener('pointerdown',()=>location.reload());
  document.body.appendChild(panel);
}
