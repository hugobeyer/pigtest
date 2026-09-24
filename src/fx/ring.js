import * as THREE from 'three';
import {tween} from '../tweens.js';
import {FX} from '../tokens.js';

const geometry=new THREE.PlaneGeometry(1,1);
let material;

export function initRing(){
  const texture=new THREE.TextureLoader().load(new URL('../../assets/fx/tap_ring.png',import.meta.url).href);
  texture.colorSpace=THREE.SRGBColorSpace;
  material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false});
}

export function tapRing(scene,position,height){
  const {size,from,to,duration,lift}=FX.tapRing;
  const ring=new THREE.Mesh(geometry,material.clone());
  ring.position.copy(position);
  ring.position.z+=height+lift;
  scene.add(ring);
  tween(duration,k=>{
    ring.scale.setScalar(size*(from+(to-from)*k*(2-k)));
    ring.material.opacity=1-k;
  },()=>{
    scene.remove(ring);
    ring.material.dispose();
  });
}
