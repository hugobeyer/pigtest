import {FX} from '../tokens.js';

let camera, base, t=0, duration=0;

export function initShake(target){
  camera=target;
  base=camera.position.clone();
}

export function shake(){
  t=0;
  duration=FX.shake.duration;
}

export function updateShake(dt){
  if(t>=duration)return;
  t+=dt;
  if(t>=duration){camera.position.copy(base); return;}
  const amplitude=FX.shake.amplitude*(1-t/duration);
  camera.position.set(base.x+(Math.random()*2-1)*amplitude,base.y+(Math.random()*2-1)*amplitude,base.z);
}
