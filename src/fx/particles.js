import * as THREE from 'three';
import {FX} from '../tokens.js';

const pools={};
const dummy=new THREE.Object3D();

export function initParticles(scene,blocks){
  for(const key of ['light','dark']){
    let template=null;
    blocks[key].traverse(o=>{if(!template && o.isMesh)template=o;});
    const mesh=new THREE.InstancedMesh(template.geometry,template.material,FX.particles.max);
    mesh.frustumCulled=false;
    mesh.castShadow=true;
    const items=Array.from({length:FX.particles.max},(_,i)=>{
      mesh.setMatrixAt(i,new THREE.Matrix4().makeScale(0,0,0));
      return {age:0,life:0,size:0,position:new THREE.Vector3(),velocity:new THREE.Vector3(),spin:new THREE.Vector3()};
    });
    scene.add(mesh);
    pools[key]={mesh,items,next:0};
  }
}

export function emit(position,isLight,{count,speed,up,life,size}){
  const pool=pools[isLight ? 'light' : 'dark'];
  for(let i=0;i<count;i++){
    const p=pool.items[pool.next];
    pool.next=(pool.next+1)%pool.items.length;
    const angle=Math.random()*Math.PI*2, force=speed*(.4+Math.random()*.6);
    p.position.copy(position);
    p.velocity.set(Math.cos(angle)*force,Math.sin(angle)*force,up*(.5+Math.random()*.5));
    p.spin.set(Math.random(),Math.random(),Math.random()).multiplyScalar(FX.particles.spin);
    p.age=0;
    p.life=life*(.7+Math.random()*.3);
    p.size=size;
  }
}

export function updateParticles(dt){
  for(const {mesh,items} of Object.values(pools)){
    items.forEach((p,i)=>{
      if(p.life<=0)return;
      p.age+=dt;
      const k=Math.min(p.age/p.life,1);
      p.velocity.z+=FX.particles.gravity*dt;
      p.position.addScaledVector(p.velocity,dt);
      dummy.position.copy(p.position);
      dummy.rotation.set(p.spin.x*p.age,p.spin.y*p.age,p.spin.z*p.age);
      dummy.scale.setScalar(p.size*(1-k));
      dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      if(k>=1)p.life=0;
    });
    mesh.instanceMatrix.needsUpdate=true;
  }
}
