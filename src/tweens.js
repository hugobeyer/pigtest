const tweens=[];
const bumps=new Map();

export function tween(duration,update,done){
  tweens.push({t:0,duration,update,done});
}

export function bump(object,{amount,duration}){
  bumps.set(object,{base:bumps.get(object)?.base??object.scale.clone(),amount,duration,t:0});
}

const easeOut=k=>k*(2-k);

export function slide(object,to,{duration}){
  const from=object.position.clone();
  tween(duration,k=>object.position.lerpVectors(from,to,easeOut(k)));
}

export function grow(object,{duration}){
  const scale=object.scale.clone();
  tween(duration,k=>object.scale.copy(scale).multiplyScalar(easeOut(k)));
}

export function vanish(object,{rise,duration},done){
  const z=object.position.z, scale=object.scale.clone();
  tween(duration,k=>{
    object.position.z=z+rise*k;
    object.scale.copy(scale).multiplyScalar(1-k*k);
  },done);
}

export function updateTweens(dt){
  for(let i=tweens.length-1;i>=0;i--){
    const t=tweens[i];
    t.t+=dt;
    const k=Math.min(t.t/t.duration,1);
    t.update?.(k);
    if(k>=1){tweens.splice(i,1); t.done?.();}
  }
  for(const [object,b] of bumps){
    b.t+=dt;
    const k=Math.min(b.t/b.duration,1);
    object.scale.copy(b.base).multiplyScalar(1+Math.sin(k*Math.PI)*b.amount);
    if(k>=1)bumps.delete(object);
  }
}
