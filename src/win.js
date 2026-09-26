import {wordImage} from './fx/popups.js';
import {writeText} from './labels.js';
import {WIN} from './tokens.js';

const format={time:value=>`${value}s`};

export function showWin(stats){
  const panel=document.createElement('div');
  panel.id='win';
  panel.style.setProperty('--bump-in',`${WIN.bumpIn}s`);
  panel.style.setProperty('--swing',`${WIN.swing}s`);
  panel.style.setProperty('--swing-angle',`${WIN.swingAngle}deg`);
  panel.innerHTML=`<div class="card"><div class="word title" style="--word:url(${wordImage(WIN.title)})"></div><ul>${WIN.stats.map(([key,label],i)=>
    `<li style="animation-delay:${WIN.bumpIn+i*WIN.rowStagger}s"><canvas data-text="${label}"></canvas><canvas class="value" data-key="${key}"></canvas></li>`).join('')}</ul><canvas class="hint" data-text="${WIN.hint}"></canvas></div>`;
  panel.addEventListener('pointerdown',()=>location.reload());
  document.body.appendChild(panel);
  panel.querySelectorAll('[data-text]').forEach(canvas=>writeText(canvas,canvas.dataset.text,canvas.classList.contains('hint') ? WIN.text.hint : WIN.text.label));
  const values=[...panel.querySelectorAll('.value')];
  const start=performance.now()+WIN.bumpIn*1000;
  const count=now=>{
    const k=Math.min(Math.max((now-start)/(WIN.countDuration*1000),0),1), eased=1-(1-k)**3;
    for(const b of values){
      const value=Math.round(stats[b.dataset.key]*eased);
      writeText(b,String(format[b.dataset.key]?.(value)??value),WIN.text.value);
    }
    if(k<1)requestAnimationFrame(count);
  };
  requestAnimationFrame(count);
}
