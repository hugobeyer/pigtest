import * as THREE from 'three';
import sheetUrl from '../../assets/fx/sparkles.webp';
import {FX, SPARKLES} from '../tokens.js';

const MAX=FX.sparkles.max, {columns,rows}=FX.sparkles;
const particles=Array.from({length:MAX},()=>({position:new THREE.Vector3(),velocity:new THREE.Vector3(),age:0,life:1,size:0,angle:0,spin:0,frame:0,gravity:0,drag:0,align:false}));
let geometry, offsets, data, velocities, active=0;

const vertexShader=`attribute vec3 aOffset;
attribute vec4 aData;
attribute vec4 aVelocity;
varying vec2 vUv;
varying float vAlpha;
void main(){
  vec3 v=mat3(modelViewMatrix)*aVelocity.xyz;
  float a=aData.y+aVelocity.w*(atan(v.y,v.x+1e-5)-1.5707963), c=cos(a), s=sin(a);
  vec4 view=modelViewMatrix*vec4(aOffset,1.);
  view.xy+=mat2(c,s,-s,c)*position.xy*aData.x;
  gl_Position=projectionMatrix*view;
  float row=floor((aData.z+.5)/${columns}.);
  vUv=(uv+vec2(aData.z-row*${columns}.,${rows-1}.-row))/vec2(${columns}.,${rows}.);
  vAlpha=aData.w;
}`;

const fragmentShader=`uniform sampler2D map;
varying vec2 vUv;
varying float vAlpha;
void main(){
  vec4 texel=texture2D(map,vUv);
  gl_FragColor=vec4(texel.rgb,texel.a*vAlpha);
  #include <colorspace_fragment>
}`;

export function initSparkles(scene){
  const map=new THREE.TextureLoader().load(sheetUrl);
  map.colorSpace=THREE.SRGBColorSpace;
  geometry=new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1,1));
  offsets=new THREE.InstancedBufferAttribute(new Float32Array(MAX*3),3).setUsage(THREE.DynamicDrawUsage);
  data=new THREE.InstancedBufferAttribute(new Float32Array(MAX*4),4).setUsage(THREE.DynamicDrawUsage);
  velocities=new THREE.InstancedBufferAttribute(new Float32Array(MAX*4),4).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('aOffset',offsets);
  geometry.setAttribute('aData',data);
  geometry.setAttribute('aVelocity',velocities);
  geometry.instanceCount=0;
  const mesh=new THREE.Mesh(geometry,new THREE.ShaderMaterial({uniforms:{map:{value:map}},vertexShader,fragmentShader,transparent:true,depthTest:false,depthWrite:false}));
  mesh.frustumCulled=false;
  mesh.renderOrder=9;
  scene.add(mesh);
}

export function sparkle(position,name){
  const {frames,count,maxCount,sizeJitter,speed,up,gravity,drag,life,size,spin,tilt,ring,align}=SPARKLES[name], {sizeScale,countScale,lifeJitter,speedJitter,upJitter,frameScale}=FX.sparkles, total=Math.round((count+Math.floor(Math.random()*(Math.max(maxCount,count)-count+1)))*countScale), cells=String(frames).match(/\d+/g);
  for(let i=0;i<total && active<MAX;i++){
    const p=particles[active++];
    const angle=ring ? i/total*Math.PI*2 : Math.random()*Math.PI*2, force=speed*(ring ? 1 : 1-Math.random()*speedJitter);
    p.position.copy(position);
    p.velocity.set(Math.cos(angle)*force,Math.sin(angle)*force,up*(1-Math.random()*upJitter));
    p.frame=+cells[Math.floor(Math.random()*cells.length)];
    p.age=0; p.life=life*(1-Math.random()*lifeJitter); p.size=size*sizeScale*(frameScale[p.frame]??1)*(1-Math.random()*sizeJitter);
    p.angle=(Math.random()*2-1)*tilt*Math.PI; p.spin=(Math.random()*2-1)*spin;
    p.gravity=gravity; p.drag=drag; p.align=align;
  }
}

export function updateSparkles(dt){
  const {growIn,shrinkPower,fadeOut}=FX.sparkles;
  for(let i=active-1;i>=0;i--){
    const p=particles[i];
    p.age+=dt;
    if(p.age>=p.life){particles[i]=particles[--active]; particles[active]=p; continue;}
    p.velocity.multiplyScalar(Math.exp(-p.drag*dt));
    p.velocity.z+=p.gravity*dt;
    p.position.addScaledVector(p.velocity,dt);
  }
  for(let i=0;i<active;i++){
    const p=particles[i], k=p.age/p.life;
    p.position.toArray(offsets.array,i*3);
    velocities.setXYZW(i,p.velocity.x,p.velocity.y,p.velocity.z,+p.align);
    data.setXYZW(i,p.size*Math.min(k/growIn,1)*(1-k**shrinkPower),p.angle+p.spin*p.age,p.frame,Math.min((1-k)/fadeOut,1));
  }
  if(active)offsets.needsUpdate=data.needsUpdate=velocities.needsUpdate=true;
  geometry.instanceCount=active;
}
