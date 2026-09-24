import * as THREE from 'three';
import {createLabel} from './labels.js';
import {bump, grow, slide, tween} from './tweens.js';
import {ANIM, LABEL, PIGS} from './tokens.js';

let columns, materials;
const box=new THREE.Box3();
const world=object=>object.getWorldPosition(new THREE.Vector3());

export function materialOf(object){
  let material=null;
  object.traverse(o=>{if(!material && o.isMesh)material=o.material;});
  return material;
}

function paint(object,pig){
  object.userData.pig=pig;
  object.visible=object.userData.label.visible=!!pig;
  if(!pig)return;
  const material=pig.isLight ? materials.light : materials.dark;
  object.traverse(o=>{if(o.isMesh)o.material=material;});
  object.userData.label.userData.set(String(pig.ammo));
}

function refresh(column){
  column.objects.forEach((object,i)=>object.userData.label.material.opacity=i===0 ? 1 : LABEL.backOpacity);
}

export function createPigs(scene,pigs){
  const byColumn={};
  for(const pig of pigs){
    if(typeof pig.userData.is_light!=='boolean')throw new Error(`${pig.name}: invalid is_light metadata`);
    box.setFromObject(pig);
    const label=createLabel(scene);
    const offset=new THREE.Vector3(0,box.getCenter(new THREE.Vector3()).y,box.max.z+LABEL.lift).sub(world(pig).setX(0));
    pig.userData.label=label;
    pig.userData.labelOffset=offset;
    (byColumn[Math.round(world(pig).x/PIGS.columnSnap)]??=[]).push(pig);
  }
  materials={light:materialOf(pigs.find(pig=>pig.userData.is_light)),dark:materialOf(pigs.find(pig=>!pig.userData.is_light))};
  columns=Object.values(byColumn).map(objects=>{
    objects.sort((a,b)=>world(b).y-world(a).y);
    const first=objects[0].userData.is_light;
    const queue=Array.from({length:PIGS.perColumn},(_,i)=>({isLight:i<objects.length ? objects[i].userData.is_light : (i%2===0)===first,ammo:PIGS.ammo}));
    const column={objects,slots:objects.map(object=>object.position.clone()),queue,busy:false};
    objects.forEach(object=>paint(object,column.queue.shift()??null));
    refresh(column);
    return column;
  });
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

export function updatePigs(){
  for(const column of columns)for(const object of column.objects){
    const {label,labelOffset}=object.userData;
    object.getWorldPosition(label.position).add(labelOffset);
  }
}
