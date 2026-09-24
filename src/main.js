import './style.css';
import * as THREE from 'three';
import {loadAssets} from './assets.js';
import {initGameplay, tap, tapTargets, updateGameplay} from './gameplay.js';
import {FRAME, LIGHTS, RENDER} from './tokens.js';

const scene=new THREE.Scene();
scene.background=new THREE.Color(RENDER.background);

const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,RENDER.maxPixelRatio));
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

const {hemisphere,key:keyLight}=LIGHTS;
scene.add(new THREE.HemisphereLight(hemisphere.sky,hemisphere.ground,hemisphere.intensity));
const key=new THREE.DirectionalLight(keyLight.color,keyLight.intensity);
key.position.set(...keyLight.position);
key.target.position.set(...keyLight.target);
key.castShadow=true;
key.shadow.mapSize.set(keyLight.shadowMapSize,keyLight.shadowMapSize);
Object.assign(key.shadow.camera,keyLight.shadowCamera);
key.shadow.camera.updateProjectionMatrix();
key.shadow.bias=keyLight.bias;
key.shadow.normalBias=keyLight.normalBias;
key.shadow.radius=keyLight.radius;
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
  const dt=Math.min((now-last)/1000,FRAME.maxDelta);
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
