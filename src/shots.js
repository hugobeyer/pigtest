import {instantiate} from './assets.js';
import {destroyCell} from './grid.js';
import {createTrail, updateTrail} from './fx/trail.js';
import {sparkle} from './fx/sparkles.js';
import {play} from './sfx.js';
import {FX, SHOT} from './tokens.js';

const shots=[], fading=[];

export function fireShot(scene,from,cell,bulletTemplate,color,hits){
  const mesh=instantiate(bulletTemplate);
  const to=cell.position.clone();
  to.z=SHOT.targetZ;
  mesh.position.copy(from);
  const trail=createTrail(from,color);
  scene.add(mesh,trail);
  shots.push({scene,mesh,trail,from,to,t:0,duration:Math.max(SHOT.minDuration,from.distanceTo(to)/SHOT.speed),cell,color,hits});
}

export const activeShots=()=>shots.length;

export function clearShots(){
  shots.length=0;
  fading.length=0;
}

export function updateShots(dt){
  for(let i=shots.length-1;i>=0;i--){
    const s=shots[i];
    s.t+=dt/s.duration;
    const k=Math.min(s.t,1);
    s.mesh.position.lerpVectors(s.from,s.to,k);
    updateTrail(s.trail,s.mesh.position,FX.trail.length);
    if(k>=1){
      sparkle(s.to,s.cell.isLight ? 'blockLight' : 'blockDark');
      play('hit');
      destroyCell(s.cell,s.color,s.hits);
      s.scene.remove(s.mesh);
      fading.push({scene:s.scene,trail:s.trail,head:s.to,t:0});
      shots.splice(i,1);
    }
  }
  for(let i=fading.length-1;i>=0;i--){
    const f=fading[i];
    f.t+=dt;
    const k=Math.min(f.t/FX.trail.fade,1);
    updateTrail(f.trail,f.head,FX.trail.length*(1-k));
    if(k>=1){
      f.scene.remove(f.trail);
      f.trail.geometry.dispose();
      fading.splice(i,1);
    }
  }
}
