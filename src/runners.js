import * as THREE from 'three';
import {instantiate} from './assets.js';
import {createLabel} from './labels.js';
import {validTarget} from './grid.js';
import {fireShot} from './shots.js';
import {bump, vanish} from './tweens.js';
import {emit} from './fx/particles.js';
import {popup} from './fx/popups.js';
import {ANIM, FX, LABEL, MOTION, SHOT} from './tokens.js';

let scene, path, bullets, labelLift;
export const runs=[];
const mouthLocal=new THREE.Vector3(...SHOT.mouth);

export function initRunners(targetScene,templates,bulletTemplates,runnerPath){
  scene=targetScene;
  bullets=bulletTemplates;
  path=runnerPath;
  const box=new THREE.Box3().setFromObject(templates.dark,true);
  labelLift=box.max.z-box.min.z+LABEL.lift;
}

function spawn(template){
  const runner=new THREE.Group(), pop=instantiate(template);
  runner.add(pop);
  const label=createLabel(runner);
  label.position.z=labelLift;
  runner.position.copy(path.entry);
  runner.rotation.z=path.nodes[0].travelFace;
  scene.add(runner);
  bump(pop,ANIM.enterBump);
  return {runner,pop,label};
}

export function launchRunner({template,ammo,isLight}){
  const parts=spawn(template);
  parts.label.userData.set(String(ammo));
  runs.push({
    ...parts,bullet:isLight ? bullets.light : bullets.dark,ammo,isLight,
    nodeIndex:0,phase:'move',
    from:path.entry.clone(),to:path.entry.clone(),
    stepT:1,stepDuration:0,
    fromRot:path.nodes[0].travelFace,toRot:path.nodes[0].travelFace,
    targetCell:null,activeNode:null,turnT:0,engaged:false
  });
}

function fire(run){
  const cell=run.targetCell;
  run.targetCell=null;
  if(!cell || !cell.alive)return;
  fireShot(scene,run.runner.localToWorld(mouthLocal.clone()),cell,run.bullet);
  run.label.userData.set(String(--run.ammo));
  bump(run.pop,ANIM.shotBump);
  bump(run.label,FX.numberPunch);
  run.hits=(run.hits??0)+1;
  if(run.hits%FX.combo.every===0){
    const {words}=FX.combo;
    popup(scene,words[Math.min(run.hits/FX.combo.every-1,words.length-1)],run.runner.position);
  }
}

function angleLerp(a,b,t){
  let d=b-a;
  while(d>Math.PI)d-=Math.PI*2;
  while(d<-Math.PI)d+=Math.PI*2;
  return a+d*t;
}

function beginStep(run){
  if(run.nodeIndex>=path.nodes.length)return false;
  const n=path.nodes[run.nodeIndex];
  run.activeNode=n;
  run.phase='move';
  run.from=run.runner.position.clone();
  run.to=new THREE.Vector3(n.x,n.y,path.entry.z);
  run.stepT=0;
  run.stepDuration=run.from.distanceTo(run.to)/MOTION.speed;
  run.fromRot=run.runner.rotation.z;
  run.toRot=run.engaged ? n.travelFace+Math.PI*.5 : n.travelFace;
  return true;
}

function advance(run){
  run.nodeIndex++;
  if(run.ammo<=0 || run.nodeIndex>=path.nodes.length){
    emit(run.runner.position,run.isLight,FX.death);
    vanish(run.runner,ANIM.vanish,()=>scene.remove(run.runner));
    return true;
  }
  beginStep(run);
  return false;
}

function finishNode(run){
  const node=run.activeNode;
  if(node.canShoot){
    const cell=validTarget(run.isLight,node);
    if(cell){
      cell.reserved=true;
      run.targetCell=cell;
      if(!run.engaged){
        run.phase='aimIn';
        run.turnT=0;
        run.fromRot=run.runner.rotation.z;
        run.toRot=node.shootFace;
        return false;
      }
      fire(run);
    }
  }
  return advance(run);
}

function updateRun(run,dt){
  if(run.phase==='move'){
    if(run.stepT>=1 && !beginStep(run))return true;
    run.stepT+=dt/run.stepDuration;
    const k=Math.min(run.stepT,1);
    run.runner.position.lerpVectors(run.from,run.to,k);
    run.runner.rotation.z=angleLerp(run.fromRot,run.toRot,k);
    return k>=1 ? finishNode(run) : false;
  }
  if(run.phase==='aimIn'){
    run.turnT+=dt/MOTION.aimTime;
    const k=Math.min(run.turnT,1);
    run.runner.rotation.z=angleLerp(run.fromRot,run.toRot,k);
    if(k>=1){
      run.engaged=true;
      fire(run);
      return advance(run);
    }
  }
  return false;
}

export function updateRunners(dt){
  for(let i=runs.length-1;i>=0;i--)if(updateRun(runs[i],dt))runs.splice(i,1);
}
