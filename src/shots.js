import {instantiate} from './assets.js';
import {destroyCell} from './grid.js';
import {SHOT} from './tokens.js';

const shots=[];

export function fireShot(scene,from,cell,template){
  const mesh=instantiate(template);
  const to=cell.position.clone();
  to.z=SHOT.targetZ;
  mesh.position.copy(from);
  scene.add(mesh);
  shots.push({scene,mesh,from,to,t:0,duration:Math.max(SHOT.minDuration,from.distanceTo(to)/SHOT.speed),cell});
}

export function updateShots(dt){
  for(let i=shots.length-1;i>=0;i--){
    const s=shots[i];
    s.t+=dt/s.duration;
    const k=Math.min(s.t,1);
    s.mesh.position.lerpVectors(s.from,s.to,k);
    if(k>=1){
      destroyCell(s.cell);
      s.scene.remove(s.mesh);
      shots.splice(i,1);
    }
  }
}
