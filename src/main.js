import './style.css';
import * as THREE from 'three';
import {loadAssets} from './assets.js';
import {initGameplay, tap, tapTargets, updateGameplay} from './gameplay.js';
import {FOG, FRAME, LIGHTS, RENDER} from './tokens.js';

const scene=new THREE.Scene();
scene.background=new THREE.Color(RENDER.background);
const fog=new THREE.Fog(FOG.color,FOG.near,FOG.far);
scene.fog=FOG.enabled ? fog : null;

const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,RENDER.maxPixelRatio));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
const toneMappings={none:THREE.NoToneMapping,neutral:THREE.NeutralToneMapping,agx:THREE.AgXToneMapping,aces:THREE.ACESFilmicToneMapping,reinhard:THREE.ReinhardToneMapping,cineon:THREE.CineonToneMapping};
renderer.toneMapping=toneMappings[RENDER.tone.mapping];
renderer.toneMappingExposure=RENDER.tone.exposure;
document.querySelector('#app').appendChild(renderer.domElement);

let camera;

function resize(){
  const aspect=camera.aspect;
  let h=innerHeight, w=h*aspect;
  if(w>innerWidth){w=innerWidth; h=w/aspect;}
  renderer.setSize(w,h,false);
  Object.assign(renderer.domElement.style,{width:w+'px',height:h+'px',position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)'});
}

const {hemisphere,key:keyLight}=LIGHTS;
const ambient=new THREE.HemisphereLight(hemisphere.sky,hemisphere.ground,hemisphere.intensity);
scene.add(ambient);
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
  if(assets.world){
    ambient.color.copy(assets.world.color);
    ambient.intensity=assets.world.intensity;
  }
  if(assets.key){
    key.color.copy(assets.key.color);
    key.intensity=assets.key.intensity;
    const distance=key.position.distanceTo(key.target.position);
    key.position.copy(key.target.position).addScaledVector(assets.key.direction,-distance);
  }
  initGameplay(scene,assets);
  scene.add(assets.root);
  camera=assets.camera;
  resize();
  addEventListener('resize',resize);
  enableInput();
  last=performance.now();
  renderer.setAnimationLoop(frame);
  if(import.meta.env.DEV)import('./debug.js').then(({debug})=>debug({scene,renderer,toneMappings,fog,ambient,key,blender:{world:!!assets.world},center:assets.gridCenter.getWorldPosition(new THREE.Vector3())}));
},error=>console.error('Blender GLB failed to load.',error));
