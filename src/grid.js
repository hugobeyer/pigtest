import * as THREE from 'three';
import {emit} from './fx/particles.js';
import {shake} from './fx/shake.js';
import {FX} from './tokens.js';

let grid, remaining;
const popping=[];
const popScale=new THREE.Vector3(), popMatrix=new THREE.Matrix4();
const hidden=new THREE.Matrix4().makeScale(0,0,0);

export function createGrid(scene,center,blocks){
  const {rows,columns,step,checker}=center.userData;
  if(![rows,columns,step,checker].every(value=>value>0))throw new Error('GridCenter requires rows, columns, step and checker');
  const origin=center.getWorldPosition(new THREE.Vector3());
  grid=Array.from({length:rows},(_,r)=>Array.from({length:columns},(_,c)=>({
    r,c,isLight:((Math.floor(r/checker)+Math.floor(c/checker))&1)===0,alive:true,reserved:false,
    position:new THREE.Vector3(origin.x+(c-(columns-1)*.5)*step,origin.y+((rows-1)*.5-r)*step,origin.z)
  })));
  const cells=grid.flat();
  remaining=cells.length;
  for(const [key,isLight] of [['light',true],['dark',false]]){
    let template=null;
    blocks[key].traverse(o=>{if(!template && o.isMesh)template=o;});
    const members=cells.filter(cell=>cell.isLight===isLight);
    const mesh=new THREE.InstancedMesh(template.geometry,template.material,members.length);
    mesh.castShadow=mesh.receiveShadow=true;
    const matrix=template.matrixWorld.clone();
    members.forEach((cell,index)=>{
      mesh.setMatrixAt(index,matrix.setPosition(cell.position));
      Object.assign(cell,{mesh,index,matrix:matrix.clone()});
    });
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }
  return grid;
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
  if(!cell || cell.reserved || cell.isLight!==isLight)return null;
  return cell;
}

export function destroyCell(cell){
  cell.reserved=false;
  if(!cell.alive)return;
  cell.alive=false;
  popping.push({cell,t:0});
  emit(cell.position,cell.isLight,FX.hit);
  remaining--;
  if(grid[cell.r].every(c=>!c.alive) || grid.every(row=>!row[cell.c].alive))shake();
}

export function updateGrid(dt){
  const {amount,peak,duration}=FX.blockPop;
  for(let i=popping.length-1;i>=0;i--){
    const pop=popping[i], {cell}=pop;
    pop.t+=dt;
    const k=Math.min(pop.t/duration,1);
    const scale=k<peak ? 1+amount*k/peak : (1+amount)*(1-(k-peak)/(1-peak));
    cell.mesh.setMatrixAt(cell.index,k>=1 ? hidden : popMatrix.copy(cell.matrix).scale(popScale.setScalar(scale)));
    cell.mesh.instanceMatrix.needsUpdate=true;
    if(k>=1)popping.splice(i,1);
  }
}

export const remainingCells=()=>remaining;
