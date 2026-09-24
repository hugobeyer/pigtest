import * as THREE from 'three';
import {ROWS, COLS} from './assets.js';
import {createLabel} from './labels.js';
import {AIM_TIME, ARC_STEPS, CORNER_R, END_OFFSET, ENGAGED_MOVE_SPEED, LANE_GAP, MOUTH_OFFSET, MOVE_SPEED, PIG_AMMO, RAIL_CAPACITY, RUNNER_LIFT, SHOT_RADIUS, SHOT_SPEED, SHOT_TARGET_Z, SIDE_OFFSET, VERTICAL_OFFSET} from './config.js';

let scene, runnerTemplate, grid, pathNodes, entry, runnerLift, capacityLabel;
const runs=[], shots=[];
const mouthLocal=new THREE.Vector3(...MOUTH_OFFSET);
const box=new THREE.Box3();

function materialOf(object){
  let material=null;
  object.traverse(o=>{if(!material && o.isMesh)material=o.material;});
  return material;
}

function createCells(objects){
  return objects.map((row,r)=>row.map((object,c)=>{
    const {row:rr,column:cc,is_light}=object.userData;
    if(rr!==r || cc!==c || typeof is_light!=='boolean')throw new Error(`${object.name}: invalid row/column/is_light metadata`);
    return {r,c,isLight:is_light,alive:true,reserved:false,object};
  }));
}

function createPath(anchors){
  const colX=grid[0].map(cell=>cell.object.getWorldPosition(new THREE.Vector3()).x);
  const rowY=grid.map(row=>row[0].object.getWorldPosition(new THREE.Vector3()).y);
  const start=anchors.RailStart.getWorldPosition(new THREE.Vector3());
  const end=anchors.RailEnd.getWorldPosition(new THREE.Vector3());
  const GRID_LEFT=colX[0], GRID_RIGHT=colX[COLS-1], GRID_TOP=rowY[0];
  const LEFT=end.x, BOTTOM=start.y, RIGHT=GRID_RIGHT+SIDE_OFFSET, TOP=GRID_TOP+VERTICAL_OFFSET;
  const BR_X=RIGHT-CORNER_R, TR_Y=TOP-CORNER_R, TL_X=LEFT+CORNER_R;
  const nodes=[];
  const arc=(cx,cy,a0,f0)=>{
    for(let i=1;i<=ARC_STEPS;i++){
      const t=i/ARC_STEPS, a=a0+Math.PI*.5*t;
      nodes.push({x:cx+Math.cos(a)*CORNER_R,y:cy+Math.sin(a)*CORNER_R,side:'arc',lane:-1,canShoot:false,travelFace:f0+Math.PI*.5*t});
    }
  };
  nodes.push({x:GRID_LEFT-LANE_GAP,y:BOTTOM,side:'gap',lane:-1,canShoot:false,travelFace:-Math.PI*.5});
  for(let c=0;c<COLS;c++)nodes.push({x:colX[c],y:BOTTOM,side:'bottom',lane:c,canShoot:true,travelFace:-Math.PI*.5,shootFace:0});
  nodes.push({x:GRID_RIGHT+LANE_GAP,y:BOTTOM,side:'gap',lane:-1,canShoot:false,travelFace:-Math.PI*.5});
  nodes.push({x:BR_X,y:BOTTOM,side:'gap',lane:-1,canShoot:false,travelFace:-Math.PI*.5});
  arc(BR_X,BOTTOM+CORNER_R,-Math.PI*.5,-Math.PI*.5);
  for(let r=ROWS-1;r>=0;r--)nodes.push({x:RIGHT,y:rowY[r],side:'right',lane:r,canShoot:true,travelFace:0,shootFace:Math.PI*.5});
  nodes.push({x:RIGHT,y:TR_Y,side:'gap',lane:-1,canShoot:false,travelFace:0});
  arc(RIGHT-CORNER_R,TR_Y,0,0);
  nodes.push({x:GRID_RIGHT+LANE_GAP,y:TOP,side:'gap',lane:-1,canShoot:false,travelFace:Math.PI*.5});
  for(let c=COLS-1;c>=0;c--)nodes.push({x:colX[c],y:TOP,side:'top',lane:c,canShoot:true,travelFace:Math.PI*.5,shootFace:Math.PI});
  nodes.push({x:GRID_LEFT-LANE_GAP,y:TOP,side:'gap',lane:-1,canShoot:false,travelFace:Math.PI*.5});
  nodes.push({x:TL_X,y:TOP,side:'gap',lane:-1,canShoot:false,travelFace:Math.PI*.5});
  arc(TL_X,TOP-CORNER_R,Math.PI*.5,Math.PI*.5);
  for(let r=0;r<ROWS;r++)nodes.push({x:LEFT,y:rowY[r],side:'left',lane:r,canShoot:true,travelFace:Math.PI,shootFace:Math.PI*1.5});
  nodes.push({x:LEFT,y:end.y+END_OFFSET,side:'end',lane:-1,canShoot:false,travelFace:Math.PI});
  entry=new THREE.Vector3(start.x,BOTTOM,start.z+RUNNER_LIFT);
  return nodes;
}

export function initGameplay(targetScene,assets){
  scene=targetScene;
  runnerTemplate=assets.runner;
  grid=createCells(assets.grid);
  pathNodes=createPath(assets.anchors);
  for(const pig of assets.pigs){
    if(typeof pig.userData.is_light!=='boolean')throw new Error(`${pig.name}: invalid is_light metadata`);
    box.setFromObject(pig);
    const label=createLabel(scene);
    label.position.set(pig.getWorldPosition(new THREE.Vector3()).x,box.getCenter(new THREE.Vector3()).y,box.max.z+.35);
    label.userData.set(String(PIG_AMMO));
    Object.assign(pig.userData,{clickable:true,used:false,isLight:pig.userData.is_light,ammo:PIG_AMMO,label});
  }
  runnerLift=box.setFromObject(runnerTemplate,true).max.z-box.min.z+.35;
  box.setFromObject(assets.railStart);
  capacityLabel=createLabel(scene);
  capacityLabel.position.set(box.getCenter(new THREE.Vector3()).x,box.min.y-.55,box.max.z);
  capacityLabel.userData.set(`${RAIL_CAPACITY}/${RAIL_CAPACITY}`);
}

function frontCell(node){
  if(!node.canShoot || node.lane<0)return null;
  if(node.side==='bottom'){
    for(let r=ROWS-1;r>=0;r--)if(grid[r][node.lane].alive)return grid[r][node.lane];
  }else if(node.side==='top'){
    for(let r=0;r<ROWS;r++)if(grid[r][node.lane].alive)return grid[r][node.lane];
  }else if(node.side==='left'){
    for(let c=0;c<COLS;c++)if(grid[node.lane][c].alive)return grid[node.lane][c];
  }else if(node.side==='right'){
    for(let c=COLS-1;c>=0;c--)if(grid[node.lane][c].alive)return grid[node.lane][c];
  }
  return null;
}

function validTarget(run,node){
  const cell=frontCell(node);
  if(!cell || cell.reserved || cell.isLight!==run.isLight)return null;
  return cell;
}

function fireReserved(run){
  const cell=run.targetCell;
  if(!cell || !cell.alive)return;
  const bullet=new THREE.Mesh(new THREE.SphereGeometry(SHOT_RADIUS,16,12),run.material);
  bullet.castShadow=true;
  const a=run.runner.localToWorld(mouthLocal.clone());
  const b=cell.object.getWorldPosition(new THREE.Vector3());
  b.z=SHOT_TARGET_Z;
  bullet.position.copy(a);
  scene.add(bullet);
  shots.push({mesh:bullet,a,b,t:0,duration:Math.max(.045,a.distanceTo(b)/SHOT_SPEED),cell});
  run.label.userData.set(String(--run.ammo));
}

function spawnRunner(material){
  const runner=new THREE.Group();
  const body=runnerTemplate.clone();
  runnerTemplate.matrixWorld.decompose(body.position,body.quaternion,body.scale);
  body.visible=true;
  body.traverse(o=>{if(o.isMesh)o.material=material;});
  runner.add(body);
  runner.userData.label=createLabel(runner);
  runner.userData.label.position.z=runnerLift;
  runner.position.copy(entry);
  runner.rotation.z=-Math.PI*.5;
  scene.add(runner);
  return runner;
}

export function startRun(pig){
  if(pig.userData.used || !pig.visible || runs.length>=RAIL_CAPACITY)return;
  pig.userData.used=true;
  pig.visible=false;
  pig.userData.label.visible=false;
  const material=materialOf(pig);
  const runner=spawnRunner(material);
  const label=runner.userData.label;
  label.userData.set(String(pig.userData.ammo));
  runs.push({
    runner,material,label,ammo:pig.userData.ammo,
    isLight:pig.userData.isLight,
    nodeIndex:0,phase:'move',
    from:entry.clone(),to:entry.clone(),
    stepT:1,stepDuration:0,
    fromRot:-Math.PI*.5,toRot:-Math.PI*.5,
    targetCell:null,activeNode:null,turnT:0,engaged:false
  });
}

function angleLerp(a,b,t){
  let d=b-a;
  while(d>Math.PI)d-=Math.PI*2;
  while(d<-Math.PI)d+=Math.PI*2;
  return a+d*t;
}

function beginStep(run){
  if(run.nodeIndex>=pathNodes.length)return false;
  const n=pathNodes[run.nodeIndex];
  run.activeNode=n;
  run.phase='move';
  run.from=run.runner.position.clone();
  run.to=new THREE.Vector3(n.x,n.y,entry.z);
  run.stepT=0;
  run.stepDuration=run.from.distanceTo(run.to)/(run.engaged?ENGAGED_MOVE_SPEED:MOVE_SPEED);
  run.fromRot=run.runner.rotation.z;
  run.toRot=run.engaged ? n.travelFace+Math.PI*.5 : n.travelFace;
  return true;
}

function advance(run){
  run.nodeIndex++;
  if(run.ammo<=0 || run.nodeIndex>=pathNodes.length){
    scene.remove(run.runner);
    return true;
  }
  beginStep(run);
  return false;
}

function finishNode(run){
  const node=run.activeNode;
  if(node.canShoot){
    const cell=validTarget(run,node);
    if(cell){
      cell.reserved=true;
      run.targetCell=cell;
      if(!run.engaged){
        run.phase='aimIn';
        run.turnT=0;
        run.fromRot=run.runner.rotation.z;
        run.toRot=node.shootFace;
        return false;
      }
      fireReserved(run);
      run.targetCell=null;
    }
  }
  return advance(run);
}

function updateRun(run,dt){
  if(run.phase==='move'){
    if(run.stepT>=1 && !beginStep(run))return true;
    run.stepT+=dt/run.stepDuration;
    const k=Math.min(run.stepT,1);
    run.runner.position.lerpVectors(run.from,run.to,k);
    run.runner.rotation.z=angleLerp(run.fromRot,run.toRot,k);
    return k>=1 ? finishNode(run) : false;
  }
  if(run.phase==='aimIn'){
    run.turnT+=dt/AIM_TIME;
    const k=Math.min(run.turnT,1);
    run.runner.rotation.z=angleLerp(run.fromRot,run.toRot,k);
    if(k>=1){
      run.engaged=true;
      fireReserved(run);
      run.targetCell=null;
      return advance(run);
    }
  }
  return false;
}

function destroyCell(cell){
  cell.reserved=false;
  if(!cell.alive)return;
  cell.alive=false;
  cell.object.visible=false;
}

export function updateGameplay(dt){
  for(let i=runs.length-1;i>=0;i--)if(updateRun(runs[i],dt))runs.splice(i,1);
  capacityLabel.userData.set(`${RAIL_CAPACITY-runs.length}/${RAIL_CAPACITY}`);
  for(let i=shots.length-1;i>=0;i--){
    const s=shots[i];
    s.t+=dt/s.duration;
    const k=Math.min(s.t,1);
    s.mesh.position.lerpVectors(s.a,s.b,k);
    if(k>=1){
      destroyCell(s.cell);
      scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      shots.splice(i,1);
    }
  }
}
