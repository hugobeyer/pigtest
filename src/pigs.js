import * as THREE from 'three';
import {instantiate} from './assets.js';
import {createLabel} from './labels.js';
import {bump, grow, slide, tween} from './tweens.js';
import {ANIM, LABEL, PIGS} from './tokens.js';

let scene, columns, templates, labelLift;
export const tapTargets=[];

function spawn(pig,position){
  if(!pig)return null;
  const object=instantiate(pig.isLight ? templates.light : templates.dark);
  object.position.copy(position);
  const label=createLabel(object);
  label.position.z=labelLift;
  label.userData.set(String(pig.ammo));
  Object.assign(object.userData,{pig,label});
  scene.add(object);
  tapTargets.push(object);
  return object;
}

function remove(object){
  scene.remove(object);
  tapTargets.splice(tapTargets.indexOf(object),1);
}

function refresh(column){
  column.objects.forEach((object,i)=>{if(object)object.userData.label.material.opacity=i===0 ? 1 : LABEL.backOpacity;});
}

export function createPigs(targetScene,columnObjects,pigTemplates){
  scene=targetScene;
  templates=pigTemplates;
  const box=new THREE.Box3().setFromObject(templates.dark,true);
  labelLift=box.max.z-box.min.z+LABEL.lift;
  columns=columnObjects.map(columnObject=>{
    const {queue,row_step:rowStep}=columnObject.userData;
    if(!/^[DL]+$/.test(queue) || !(rowStep>0))throw new Error(`${columnObject.name}: requires queue (D/L) and positive row_step`);
    const front=columnObject.getWorldPosition(new THREE.Vector3());
    const column={slots:Array.from({length:PIGS.visibleRows},(_,i)=>front.clone().setY(front.y-rowStep*i)),queue:[...queue].map(key=>({isLight:key==='L',ammo:PIGS.ammo})),busy:false};
    column.objects=column.slots.map(slot=>spawn(column.queue.shift(),slot));
    refresh(column);
    return column;
  });
}

function advance(column){
  const [front,...rest]=column.objects;
  remove(front);
  rest.forEach((object,i)=>{if(object)slide(object,column.slots[i],ANIM.queueSlide);});
  const back=spawn(column.queue.shift(),column.slots.at(-1));
  if(back)grow(back,ANIM.queueGrow);
  column.objects=[...rest,back];
  refresh(column);
  tween(ANIM.queueSlide.duration,null,()=>column.busy=false);
}

export function takePig(object){
  const column=columns.find(column=>column.objects[0]===object);
  if(!column || column.busy)return null;
  column.busy=true;
  bump(object,ANIM.tapBump);
  tween(ANIM.tapBump.duration,null,()=>advance(column));
  return object.userData.pig;
}
