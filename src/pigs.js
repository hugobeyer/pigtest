import * as THREE from 'three';
import {createLabel} from './labels.js';
import {bump, tween} from './tweens.js';
import {ANIM, LABEL, PIGS} from './tokens.js';

let columns;
const box=new THREE.Box3();
const world=object=>object.getWorldPosition(new THREE.Vector3());

export function materialOf(object){
  let material=null;
  object.traverse(o=>{if(!material && o.isMesh)material=o.material;});
  return material;
}

function refreshFront(){
  for(const column of columns){
    const front=column.find(pig=>!pig.userData.used);
    for(const pig of column){
      pig.userData.front=pig===front;
      pig.userData.label.material.opacity=pig===front ? 1 : PIGS.backLabelOpacity;
    }
  }
}

export function createPigs(scene,pigs){
  const byColumn={};
  for(const pig of pigs){
    if(typeof pig.userData.is_light!=='boolean')throw new Error(`${pig.name}: invalid is_light metadata`);
    box.setFromObject(pig);
    const label=createLabel(scene);
    label.position.set(world(pig).x,box.getCenter(new THREE.Vector3()).y,box.max.z+LABEL.lift);
    label.userData.set(String(PIGS.ammo));
    Object.assign(pig.userData,{used:false,front:false,isLight:pig.userData.is_light,ammo:PIGS.ammo,label});
    (byColumn[Math.round(world(pig).x*10)]??=[]).push(pig);
  }
  columns=Object.values(byColumn).map(column=>column.sort((a,b)=>world(b).y-world(a).y));
  refreshFront();
}

export function takePig(pig){
  const data=pig.userData;
  if(data.used || !data.front)return null;
  data.used=true;
  refreshFront();
  bump(pig,ANIM.tapBump);
  tween(ANIM.tapBump.duration,null,()=>{pig.visible=false; data.label.visible=false;});
  return data;
}
