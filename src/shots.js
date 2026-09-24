import {instantiate} from './assets.js';
import {destroyCell} from './grid.js';
import {createTrail} from './fx/trail.js';
import {FX, SHOT} from './tokens.js';

const shots=[];

export function fireShot(scene,from,cell,bulletTemplate){
  const mesh=instantiate(bulletTemplate);
  const to=cell.position.clone();
  to.z=SHOT.targetZ;
  mesh.position.copy(from);
  const trail=createTrail(bulletTemplate,from,to);
  scene.add(mesh,trail);
  const distance=from.distanceTo(to);
  shots.push({scene,mesh,trail,from,to,distance,t:0,duration:Math.max(SHOT.minDuration,distance/SHOT.speed),cell});
}

export function updateShots(dt){
  for(let i=shots.length-1;i>=0;i--){
    const s=shots[i];
    s.t+=dt/s.duration;
    const k=Math.min(s.t,1);
    s.mesh.position.lerpVectors(s.from,s.to,k);
    const length=Math.min(s.distance*k,FX.trail.length);
    s.trail.position.lerpVectors(s.from,s.to,k-length/s.distance);
    s.trail.scale.y=length;
    if(k>=1){
      destroyCell(s.cell);
      s.scene.remove(s.mesh,s.trail);
      shots.splice(i,1);
    }
  }
}
