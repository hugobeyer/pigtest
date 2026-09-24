import './style.css';
import * as THREE from 'three';
import {loadAssets} from './assets.js';
import {initGameplay, tap, tapTargets, updateGameplay} from './gameplay.js';

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x505471);

const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
document.querySelector('#app').appendChild(renderer.domElement);

let camera;

function resize(){
  const aspect=(camera.right-camera.left)/(camera.top-camera.bottom);
  let h=innerHeight, w=h*aspect;
  if(w>innerWidth){w=innerWidth; h=w/aspect;}
  renderer.setSize(w,h,false);
  Object.assign(renderer.domElement.style,{width:w+'px',height:h+'px',position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)'});
}

scene.add(new THREE.HemisphereLight(0xffffff,0x303449,1.65));
const key=new THREE.DirectionalLight(0xffffff,2.65);
key.position.set(10,-14,18);
key.target.position.set(0,1.5,0);
key.castShadow=true;
key.shadow.mapSize.set(2048,2048);
Object.assign(key.shadow.camera,{left:-18,right:18,top:22,bottom:-22,near:.5,far:70});
key.shadow.camera.updateProjectionMatrix();
key.shadow.bias=-0.00035;
key.shadow.normalBias=.025;
key.shadow.radius=2.0;
scene.add(key,key.target);

const ray=new THREE.Raycaster();
const pointer=new THREE.Vector2();

function enableInput(){
  renderer.domElement.addEventListener('pointerdown',e=>{
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);
    ray.setFromCamera(pointer,camera);
    for(const hit of ray.intersectObjects(tapTargets,true)){
      let o=hit.object;
      while(o && !tapTargets.includes(o))o=o.parent;
      if(o && tap(o))break;
    }
  });
}

let last=performance.now();
function frame(now){
  const dt=Math.min((now-last)/1000,.033);
  last=now;
  updateGameplay(dt);
  renderer.render(scene,camera);
}

loadAssets(new URL('../assets/primitive_scene.glb',import.meta.url).href).then(assets=>{
  initGameplay(scene,assets);
  scene.add(assets.root);
  camera=assets.camera;
  resize();
  addEventListener('resize',resize);
  enableInput();
  last=performance.now();
  renderer.setAnimationLoop(frame);
},error=>console.error('Blender GLB failed to load.',error));
