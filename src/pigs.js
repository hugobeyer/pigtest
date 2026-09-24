import * as THREE from 'three';
import {instantiate} from './assets.js';
import {createLabel} from './labels.js';
import {bump, grow, slide, tween} from './tweens.js';
import {ANIM, LABEL, PIGS} from './tokens.js';

let columns, materials;

function paint(object,pig){
  object.userData.pig=pig;
  object.visible=!!pig;
  if(!pig)return;
  const material=pig.isLight ? materials.light : materials.dark;
  object.traverse(o=>{if(o.isMesh)o.material=material;});
  object.userData.label.userData.set(String(pig.ammo));
}

function refresh(column){
  column.objects.forEach((object,i)=>object.userData.label.material.opacity=i===0 ? 1 : LABEL.backOpacity);
}

export function createPigs(scene,columnObjects,template,pigMaterials){
  materials=pigMaterials;
  const box=new THREE.Box3().setFromObject(template,true);
  const labelLift=box.max.z-box.min.z+LABEL.lift;
  columns=columnObjects.map(columnObject=>{
    const {queue,row_step:rowStep}=columnObject.userData;
    if(!/^[DL]+$/.test(queue) || !(rowStep>0))throw new Error(`${columnObject.name}: requires queue (D/L) and positive row_step`);
    const front=columnObject.getWorldPosition(new THREE.Vector3());
    const slots=Array.from({length:PIGS.visibleRows},(_,i)=>front.clone().setY(front.y-rowStep*i));
    const objects=slots.map(slot=>{
      const object=instantiate(template,materials.dark);
      object.position.copy(slot);
      object.userData.label=createLabel(object);
      object.userData.label.position.z=labelLift;
      scene.add(object);
      return object;
    });
    const column={objects,slots,queue:[...queue].map(key=>({isLight:key==='L',ammo:PIGS.ammo})),busy:false};
    objects.forEach(object=>paint(object,column.queue.shift()??null));
    refresh(column);
    return column;
  });
  return columns.flatMap(column=>column.objects);
}

function advance(column){
  const [front,...rest]=column.objects;
  column.objects=[...rest,front];
  rest.forEach((object,i)=>slide(object,column.slots[i],ANIM.queueSlide));
  front.position.copy(column.slots.at(-1));
  paint(front,column.queue.shift()??null);
  if(front.visible)grow(front,ANIM.queueGrow);
  refresh(column);
  tween(ANIM.queueSlide.duration,null,()=>column.busy=false);
}

export function takePig(object){
  const column=columns.find(column=>column.objects[0]===object);
  const pig=object.userData.pig;
  if(!column || column.busy || !pig)return null;
  column.busy=true;
  bump(object,ANIM.tapBump);
  tween(ANIM.tapBump.duration,null,()=>advance(column));
  return pig;
}
