import {WIN} from './tokens.js';

const format={time:value=>`${value}s`};

export function showWin(stats){
  const panel=document.createElement('div');
  panel.id='win';
  panel.style.setProperty('--bump-in',`${WIN.bumpIn}s`);
  panel.style.setProperty('--swing',`${WIN.swing}s`);
  panel.style.setProperty('--swing-angle',`${WIN.swingAngle}deg`);
  panel.innerHTML=`<div class="card"><strong>${WIN.title}</strong><ul>${WIN.stats.map(([key,label],i)=>
    `<li style="animation-delay:${WIN.bumpIn+i*WIN.rowStagger}s"><span>${label}</span><b data-key="${key}">0</b></li>`).join('')}</ul><em>${WIN.hint}</em></div>`;
  panel.addEventListener('pointerdown',()=>location.reload());
  document.body.appendChild(panel);
  const values=[...panel.querySelectorAll('b')];
  const start=performance.now()+WIN.bumpIn*1000;
  const count=now=>{
    const k=Math.min(Math.max((now-start)/(WIN.countDuration*1000),0),1), eased=1-(1-k)**3;
    for(const b of values){
      const value=Math.round(stats[b.dataset.key]*eased);
      b.textContent=format[b.dataset.key]?.(value)??value;
    }
    if(k<1)requestAnimationFrame(count);
  };
  requestAnimationFrame(count);
}
