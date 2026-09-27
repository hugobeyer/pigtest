import * as THREE from 'three';
import {instantiate} from './assets.js';
import {createLabel, disposeLabel} from './labels.js';
import {backOut, grow, slide, tween} from './tweens.js';
import {tapRing} from './fx/ring.js';
import {rimFlash} from './fx/glow.js';
import {sparkle} from './fx/sparkles.js';
import {play} from './sfx.js';
import {ANIM, FX, LABEL, PIGS} from './tokens.js';

let scene, columns, templates, pigHeight, labelLift, now=0, waitStart=0, nextHint=0;
export const tapTargets=[];
const hitMaterial=new THREE.MeshBasicMaterial();
let hitGeometry;

function spawn(pig,position){
  if(!pig)return null;
  const object=instantiate(pig.isLight ? templates.light : templates.dark);
  object.position.copy(position);
  const label=createLabel(object);
  label.position.z=labelLift;
  label.userData.set(String(pig.ammo));
  const hit=new THREE.Mesh(hitGeometry,hitMaterial);
  hit.visible=false;
  object.add(hit);
  Object.assign(object.userData,{pig,label,clock:0,phase:Math.random()*Math.PI*2,rate:1+(Math.random()*2-1)*FX.queueSway.vary});
  scene.add(object);
  tapTargets.push(object);
  return object;
}

function remove(object){
  scene.remove(object);
  disposeLabel(object.userData.label);
  tapTargets.splice(tapTargets.indexOf(object),1);
}

function refresh(column){
  column.objects.forEach((object,i)=>{if(object)object.userData.label.material.opacity=i===0 ? 1 : LABEL.backOpacity;});
}

export function createPigs(targetScene,columnObjects,pigTemplates,time,queues,ammo=PIGS.ammo){
  scene=targetScene;
  tapTargets.length=0;
  now=waitStart=time;
  nextHint=0;
  templates=pigTemplates;
  const box=new THREE.Box3().setFromObject(templates.dark,true);
  pigHeight=box.max.z-box.min.z;
  labelLift=pigHeight+LABEL.lift;
  const size=box.getSize(new THREE.Vector3()).multiply(new THREE.Vector3(PIGS.hitScale,PIGS.hitScale,1)), center=box.getCenter(new THREE.Vector3()).sub(templates.dark.getWorldPosition(new THREE.Vector3()));
  hitGeometry?.dispose();
  hitGeometry=new THREE.BoxGeometry(size.x,size.y,size.z).translate(center.x,center.y,center.z);
  columns=columnObjects.map((columnObject,i)=>{
    const {row_step:rowStep}=columnObject.userData, queue=queues?.[i]??columnObject.userData.queue;
    if(!/^[DL]+$/.test(queue) || !(rowStep>0))throw new Error(`${columnObject.name}: requires queue (D/L) and positive row_step`);
    const front=columnObject.getWorldPosition(new THREE.Vector3());
    const column={slots:Array.from({length:PIGS.visibleRows},(_,i)=>front.clone().setY(front.y-rowStep*PIGS.rowGap*i)),queue:[...queue].map(key=>({isLight:key==='L',ammo})),busy:false};
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

export const pigsLeft=()=>columns.reduce((sum,column)=>sum+column.queue.length+column.objects.filter(Boolean).length,0);

export function refuse(object){
  object.userData.refuse=now;
}

export function takePig(object){
  const column=columns.find(column=>column.objects[0]===object);
  if(!column || column.busy)return null;
  column.busy=true;
  waitStart=now;
  delete object.userData.huh;
  object.scale.setScalar(1);
  tapRing(scene,object.position,pigHeight);
  rimFlash(object);
  play('tap');
  sparkle(object.position.clone().setZ(object.position.z+pigHeight),'tap');
  object.children[0].position.z=0;
  const {amount,bump,shrink}=ANIM.tapOut;
  tween(bump+shrink,k=>{
    const t=k*(bump+shrink);
    object.scale.setScalar(t<bump ? 1+amount*t/bump : (1+amount)*(1-(t-bump)/shrink));
  },()=>advance(column));
  return object.userData.pig;
}

function exclaim(object){
  const {marks,size,lift,duration,popIn,fadeOut,wobble,wobbles}=FX.idleHint;
  const sprite=createLabel(object,size,.6);
  sprite.position.z=labelLift+lift;
  sprite.userData.set(marks[Math.floor(Math.random()*marks.length)]);
  const scale=sprite.scale.clone();
  tween(duration,k=>{
    sprite.scale.copy(scale).multiplyScalar(backOut(Math.min(k/popIn,1)));
    sprite.material.rotation=Math.sin(k*Math.PI*2*wobbles)*wobble*(1-k);
    sprite.material.opacity=Math.min((1-k)/fadeOut,1);
  },()=>disposeLabel(sprite));
}

export function updatePigs(time,canTap){
  const {height,speed,tilt,rows}=FX.queueSway, dt=time-now;
  now=time;
  for(const column of columns)column.objects.forEach((object,i)=>{
    if(!object)return;
    const data=object.userData;
    let flow=1, pose=0;
    if(data.huh!==undefined){
      const {rise,hold,recover,jump,stretch}=FX.idleHint.huh, e=time-data.huh, k=Math.min(Math.max((e-rise-hold)/recover,0),1);
      flow=k*k*(3-2*k);
      const p=e<rise ? backOut(e/rise) : 1-flow;
      pose=p*jump;
      object.scale.set(1-stretch*p*.5,1-stretch*p*.5,1+stretch*p);
      if(k>=1)delete data.huh;
    }
    data.clock+=dt*flow;
    const t=data.clock*speed*data.rate+data.phase, a=rows[i]??rows.at(-1);
    object.rotation.set(Math.sin(t*.7)*tilt*a,Math.cos(t*.9)*tilt*a,Math.sin(t*.4)*tilt*a*1.5);
    if(data.refuse!==undefined){
      const {duration,angle,shakes}=ANIM.refuse, e=(time-data.refuse)/duration;
      if(e>=1)delete data.refuse;
      else object.rotation.z+=Math.sin(e*Math.PI*2*shakes)*angle*(1-e);
    }
    if(i>0)object.children[0].position.z=height*a*(.5+.5*Math.sin(t));
    else if(!column.busy)object.children[0].position.z=FX.idleBob.height*Math.abs(Math.sin(data.clock*FX.idleBob.speed*data.rate+data.phase))+pose;
  });
  if(!canTap)waitStart=time;
  if(time-waitStart<FX.idleHint.after || time<nextHint)return;
  nextHint=time+FX.idleHint.every*(1+(Math.random()*2-1)*FX.idleHint.jitter);
  const fronts=columns.filter(column=>column.objects[0] && !column.busy && column.objects[0].userData.huh===undefined).map(column=>column.objects[0]);
  if(!fronts.length)return;
  const object=fronts[Math.floor(Math.random()*fronts.length)];
  object.userData.huh=time;
  exclaim(object);
  play('huh');
}
