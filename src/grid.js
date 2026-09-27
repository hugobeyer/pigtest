import * as THREE from 'three';
import {shake} from './fx/shake.js';
import {FX} from './tokens.js';

let grid, remaining, ghosts, ghostSlots, ghostNext=0;
const popping=[];
const popScale=new THREE.Vector3(), popMatrix=new THREE.Matrix4();
const hidden=new THREE.Matrix4().makeScale(0,0,0);
const flashDefault=new THREE.Color(FX.blockFlash.color), ghostColor=new THREE.Color(), black=new THREE.Color(0);
const flashMaterials=new Map();
export const hooks={};

function flashMaterial(source){
  if(!flashMaterials.has(source)){
    const material=source.clone();
    material.defines={...source.defines,BLOCK_FLASH:''};
    material.onBeforeCompile=source.onBeforeCompile;
    material.customProgramCacheKey=()=>'toon-block';
    flashMaterials.set(source,material);
  }
  return flashMaterials.get(source);
}

export function createGrid(scene,center,blocks,layout=center.userData){
  const {rows,columns,step,checker,pattern='checker'}=layout;
  if(![rows,columns,step,checker].every(value=>value>0))throw new Error('GridCenter requires rows, columns, step and checker');
  const origin=center.getWorldPosition(new THREE.Vector3());
  grid=Array.from({length:rows},(_,r)=>Array.from({length:columns},(_,c)=>({
    r,c,isLight:((Math.floor(r/checker)+(pattern==='stripes' ? 0 : Math.floor(c/checker)))&1)===0,alive:true,reserved:false,
    position:new THREE.Vector3(origin.x+(c-(columns-1)*.5)*step,origin.y+((rows-1)*.5-r)*step,origin.z)
  })));
  const cells=grid.flat();
  remaining=cells.length;
  popping.length=0;
  for(const [key,isLight] of [['light',true],['dark',false]]){
    let template=null;
    blocks[key].traverse(o=>{if(!template && o.isMesh)template=o;});
    const members=cells.filter(cell=>cell.isLight===isLight);
    const geometry=template.geometry.clone();
    geometry.setAttribute('aFlash',new THREE.InstancedBufferAttribute(new Float32Array(members.length*3),3).setUsage(THREE.DynamicDrawUsage));
    const mesh=new THREE.InstancedMesh(geometry,flashMaterial(template.material),members.length);
    mesh.userData.ownsGeometry=true;
    mesh.castShadow=mesh.receiveShadow=true;
    const matrix=template.matrixWorld.clone();
    members.forEach((cell,index)=>{
      mesh.setMatrixAt(index,matrix.setPosition(cell.position));
      Object.assign(cell,{mesh,index,matrix:matrix.clone()});
    });
    mesh.computeBoundingSphere();
    scene.add(mesh);
    if(isLight)createGhosts(scene,template.geometry);
  }
  return grid;
}

const ghostVertex=`uniform vec3 uCenter;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vColor;
void main(){
  mat4 model=modelMatrix*instanceMatrix;
  vec4 world=model*vec4(position,1.);
  vNormal=normalize(mat3(model)*(position-uCenter));
  vView=cameraPosition-world.xyz;
  vColor=instanceColor;
  gl_Position=projectionMatrix*viewMatrix*world;
}`;

const ghostFragment=`uniform float uPower, uCore;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vColor;
void main(){
  float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),uPower);
  gl_FragColor=vec4(vColor*(rim+uCore),1.);
  #include <colorspace_fragment>
}`;

function createGhosts(scene,geometry){
  const {max,power,core}=FX.ghost;
  geometry.computeBoundingBox();
  const material=new THREE.ShaderMaterial({
    uniforms:{uCenter:{value:geometry.boundingBox.getCenter(new THREE.Vector3())},uPower:{value:power},uCore:{value:core}},
    vertexShader:ghostVertex,fragmentShader:ghostFragment,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide
  });
  ghosts=new THREE.InstancedMesh(geometry,material,max);
  ghosts.userData.ownsMaterial=true;
  ghosts.frustumCulled=false;
  for(let i=0;i<max;i++){ghosts.setMatrixAt(i,hidden); ghosts.setColorAt(i,black);}
  ghostSlots=new Array(max).fill(null);
  ghostNext=0;
  scene.add(ghosts);
}

function frontCell(node){
  if(!node.canShoot || node.lane<0)return null;
  const rows=grid.length, cols=grid[0].length;
  if(node.side==='bottom'){
    for(let r=rows-1;r>=0;r--)if(grid[r][node.lane].alive)return grid[r][node.lane];
  }else if(node.side==='top'){
    for(let r=0;r<rows;r++)if(grid[r][node.lane].alive)return grid[r][node.lane];
  }else if(node.side==='left'){
    for(let c=0;c<cols;c++)if(grid[node.lane][c].alive)return grid[node.lane][c];
  }else if(node.side==='right'){
    for(let c=cols-1;c>=0;c--)if(grid[node.lane][c].alive)return grid[node.lane][c];
  }
  return null;
}

export function validTarget(isLight,node){
  const cell=frontCell(node);
  if(!cell || cell.reserved || (isLight!==null && cell.isLight!==isLight))return null;
  return cell;
}

export function destroyCell(cell,color=flashDefault,hits=0,depth=0){
  cell.reserved=false;
  if(!cell.alive)return;
  cell.alive=false;
  popping.push({cell,t:0,color,hits});
  remaining--;
  if(grid[cell.r].every(c=>!c.alive) || grid.every(row=>!row[cell.c].alive))shake();
  hooks.destroyed?.(cell,depth);
}

export function glowCell(cell,color,amount){
  cell.mesh.geometry.attributes.aFlash.setXYZ(cell.index,color.r*amount,color.g*amount,color.b*amount);
  cell.mesh.geometry.attributes.aFlash.needsUpdate=true;
}

export function updateGrid(dt){
  const {amount,time}=FX.blockPop, {strength}=FX.blockFlash;
  for(let i=popping.length-1;i>=0;i--){
    const pop=popping[i], {cell,color,hits}=pop;
    pop.t+=dt;
    const k=Math.min(pop.t/time,1);
    popMatrix.copy(cell.matrix).scale(popScale.setScalar(1+amount*k));
    cell.mesh.setMatrixAt(cell.index,k>=1 ? hidden : popMatrix);
    cell.mesh.instanceMatrix.needsUpdate=true;
    const flash=k>=1 ? 0 : strength*k;
    cell.mesh.geometry.attributes.aFlash.setXYZ(cell.index,color.r*flash,color.g*flash,color.b*flash);
    cell.mesh.geometry.attributes.aFlash.needsUpdate=true;
    if(k<1)continue;
    ghostSlots[ghostNext]={base:cell.matrix.clone().setPosition(0,0,0),position:cell.position,color,t:0,tall:FX.ghost.tall+(FX.ghost.tallMax-FX.ghost.tall)*Math.min(hits/FX.ghost.tallAt,1)};
    ghostNext=(ghostNext+1)%ghostSlots.length;
    popping.splice(i,1);
  }
  updateGhosts(dt,1+amount);
}

function updateGhosts(dt,from){
  const {scale,rise,life,snap,glow}=FX.ghost;
  let moved=false;
  for(let i=0;i<ghostSlots.length;i++){
    const ghost=ghostSlots[i];
    if(!ghost)continue;
    ghost.t+=dt;
    const k=Math.min(ghost.t/life,1), eased=1-(1-k)**snap, {x,y,z}=ghost.position;
    popMatrix.makeScale(from+(scale-from)*eased,from+(scale-from)*eased,from+(ghost.tall-from)*eased).multiply(ghost.base).setPosition(x,y,z+rise*eased);
    ghosts.setMatrixAt(i,k>=1 ? hidden : popMatrix);
    ghosts.setColorAt(i,ghostColor.copy(ghost.color).multiplyScalar(glow*(1-k)**1.5));
    if(k>=1)ghostSlots[i]=null;
    moved=true;
  }
  if(!moved)return;
  ghosts.instanceMatrix.needsUpdate=true;
  ghosts.instanceColor.needsUpdate=true;
}

export const remainingCells=()=>remaining;
export const board=()=>grid;
export function destroyAll(){
  grid?.flat().forEach(cell=>destroyCell(cell));
}
