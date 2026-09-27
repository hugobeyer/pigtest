import {writeText} from './labels.js';
import {WIN} from './tokens.js';

const format={time:value=>`${value}s`};

export function showWin(stats){
  const panel=document.createElement('div');
  panel.id='win';
  panel.style.setProperty('--bump-in',`${WIN.bumpIn}s`);
  panel.style.setProperty('--swing',`${WIN.swing}s`);
  panel.style.setProperty('--swing-angle',`${WIN.swingAngle}deg`);
  panel.innerHTML=`<div class="sign"><div class="fit"><canvas></canvas></div></div><div class="card"><div class="fit top"><canvas></canvas></div><ul>${WIN.stats.map(([key,label],i)=>
    `<li style="animation-delay:${WIN.bumpIn*1.4+i*WIN.rowStagger}s"><canvas data-label="${label}"></canvas><canvas class="value" data-key="${key}"></canvas></li>`).join('')}</ul><div class="fit bottom"><canvas></canvas></div></div>`;
  panel.addEventListener('pointerdown',()=>location.reload());
  document.body.appendChild(panel);
  const [sign,top,bottom]=panel.querySelectorAll('.fit'), row=panel.querySelector('ul').offsetHeight/WIN.stats.length;
  writeText(sign.firstChild,WIN.title,sign.offsetHeight*WIN.text.sign,WIN.ink);
  writeText(top.firstChild,WIN.heading,top.offsetHeight*WIN.text.plank);
  writeText(bottom.firstChild,WIN.hint,bottom.offsetHeight*WIN.text.plank);
  panel.querySelectorAll('[data-label]').forEach(canvas=>writeText(canvas,canvas.dataset.label,row*WIN.text.label,WIN.ink));
  const values=[...panel.querySelectorAll('.value')];
  const start=performance.now()+WIN.bumpIn*1.4*1000;
  const count=now=>{
    const k=Math.min(Math.max((now-start)/(WIN.countDuration*1000),0),1), eased=1-(1-k)**3;
    for(const b of values){
      const value=Math.round(stats[b.dataset.key]*eased);
      writeText(b,String(format[b.dataset.key]?.(value)??value),row*WIN.text.value,WIN.ink);
    }
    if(k<1)requestAnimationFrame(count);
  };
  requestAnimationFrame(count);
}
