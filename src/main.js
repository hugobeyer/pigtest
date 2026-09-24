import './style.css';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x505471);

const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
document.querySelector('#app').appendChild(renderer.domElement);

const WORLD_H=23.4;
const camera=new THREE.OrthographicCamera();

function resize(){
  const aspect=9/16;
  const maxW=innerWidth;
  const maxH=innerHeight;
  let h=maxH, w=h*aspect;
  if(w>maxW){w=maxW; h=w/aspect;}

  camera.left=-WORLD_H*aspect*.5;
  camera.right=WORLD_H*aspect*.5;
  camera.top=WORLD_H*.5;
  camera.bottom=-WORLD_H*.5;
  camera.near=.1;
  camera.far=100;

  const elev=THREE.MathUtils.degToRad(62), dist=24;
  camera.position.set(0,-Math.cos(elev)*dist+1.25,Math.sin(elev)*dist-6.6);
  camera.lookAt(0,.40,0);
  camera.updateProjectionMatrix();

  renderer.setSize(w,h,false);
  renderer.domElement.style.width=w+'px';
  renderer.domElement.style.height=h+'px';
  renderer.domElement.style.position='absolute';
  renderer.domElement.style.left='50%';
  renderer.domElement.style.top='50%';
  renderer.domElement.style.transform='translate(-50%,-50%)';
}
addEventListener('resize',resize);
resize();

scene.add(new THREE.HemisphereLight(0xffffff,0x303449,1.65));

const key=new THREE.DirectionalLight(0xffffff,2.65);

// Screen-space intent on the floor:
// light rays project from bottom-right toward top-left.
key.position.set(10,-14,18);
key.target.position.set(0,1.5,0);
scene.add(key.target);

key.castShadow=true;
key.shadow.mapSize.set(2048,2048);

// Large enough to cover rail + pigs + their projected shadows.
// Prevents the hard clipping from the default shadow-camera bounds.
const sc=key.shadow.camera;
sc.left=-18;
sc.right=18;
sc.top=22;
sc.bottom=-22;
sc.near=.5;
sc.far=70;
sc.updateProjectionMatrix();

// Small depth offsets: reduce acne without visibly detaching shadows.
key.shadow.bias=-0.00035;
key.shadow.normalBias=.025;
key.shadow.radius=2.0;

scene.add(key);

const M={
  shell:new THREE.MeshStandardMaterial({color:0x62678d,roughness:.72}),
  panel:new THREE.MeshStandardMaterial({color:0x41455f,roughness:.8}),
  pipe:new THREE.MeshStandardMaterial({color:0xaab8f6,roughness:.23,metalness:.15,emissive:0x303968,emissiveIntensity:.34}),
  railWhite:new THREE.MeshStandardMaterial({color:0xf4f7ff,roughness:.28,metalness:.08,emissive:0x8597d1,emissiveIntensity:.15}),
  dark:new THREE.MeshStandardMaterial({color:0x242733,roughness:.62}),
  light:new THREE.MeshStandardMaterial({color:0xf3f5ff,roughness:.40}),
  terminalDark:new THREE.MeshStandardMaterial({color:0x697394,roughness:.48})
};

const floorMat=new THREE.MeshStandardMaterial({color:0x62678d,roughness:.82});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),floorMat);
floor.position.set(0,0,0);
floor.receiveShadow=true;
scene.add(floor);


function box(w,h,d,mat,x=0,y=0,z=0,parent=scene){
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  o.position.set(x,y,z);
  o.castShadow=true;
  o.receiveShadow=true;
  parent.add(o);
  return o;
}

function floorBox(w,h,d,mat,x=0,y=0,floorZ=0,parent=scene){
  const geo=new THREE.BoxGeometry(w,h,d);
  geo.translate(0,0,d*.5); // pivot/origin stays on the floor
  const o=new THREE.Mesh(geo,mat);
  o.position.set(x,y,floorZ);
  o.castShadow=true;
  o.receiveShadow=true;
  parent.add(o);
  return o;
}


// ------------------------------------------------------------
// 13x13 checker, each checker = 2x2 independent boxes
// ------------------------------------------------------------
const CHECKER=13;
const COLS=CHECKER*2, ROWS=CHECKER*2;
const CELL=.30, GAP=.022, STEP=CELL+GAP;
const GRID_HEIGHT=.84;
const GROUND_EPS=.012;
const RAIL_HEIGHT=.38;
const X0=-(COLS-1)*STEP*.5;
const Y0=7.70;

const grid=Array.from({length:ROWS},()=>Array(COLS).fill(null));

for(let r=0;r<ROWS;r++){
  for(let c=0;c<COLS;c++){
    const isLight=((Math.floor(r/2)+Math.floor(c/2))&1)===0;
    const mesh=floorBox(CELL,CELL,GRID_HEIGHT,isLight?M.light:M.dark,X0+c*STEP,Y0-r*STEP,GROUND_EPS);
    grid[r][c]={r,c,isLight,alive:true,reserved:false,mesh};
  }
}

// ------------------------------------------------------------
// Main open rail geometry
// start is bottom-left, end is left side above start.
// ------------------------------------------------------------
const SIDE_OFFSET=1.38;
const VERTICAL_OFFSET=2.38;
const CORNER_R=1.10;

const GRID_LEFT=X0;
const GRID_RIGHT=X0+(COLS-1)*STEP;
const GRID_TOP=Y0;
const GRID_BOTTOM=Y0-(ROWS-1)*STEP;

const LEFT=GRID_LEFT-SIDE_OFFSET;
const RIGHT=GRID_RIGHT+SIDE_OFFSET;
const TOP=GRID_TOP+VERTICAL_OFFSET;
const BOTTOM=GRID_BOTTOM-VERTICAL_OFFSET;

const START_X=GRID_LEFT-.10;
const END_Y=GRID_BOTTOM-.10;
const BR_X=RIGHT-CORNER_R;
const TR_Y=TOP-CORNER_R;
const TL_X=LEFT+CORNER_R;

// Separate assets:
const startRail=new THREE.Group();
startRail.name='StartRail';
scene.add(startRail);

// white starter module, immediately before the bottom rail
floorBox(1.18,1.02,.34,M.railWhite,START_X-.88,BOTTOM,GROUND_EPS,startRail);
for(let i=0;i<4;i++)floorBox(.12,.68,.36,M.terminalDark,-.28+i*.18,GROUND_EPS,startRail);

const endRail=new THREE.Group();
endRail.name='EndRail';
scene.add(endRail);

// white vertical terminal where the runner disappears
floorBox(1.02,1.58,.34,M.railWhite,LEFT,END_Y+.64,GROUND_EPS,endRail);
for(let i=0;i<5;i++)floorBox(.68,.10,.36,M.terminalDark,0,-.44+i*.20,GROUND_EPS,endRail);

class OpenRailCurve extends THREE.Curve{
  getPoint(t,target=new THREE.Vector3()){
    const r=CORNER_R;
    const L0=BR_X-START_X;
    const A=Math.PI*r*.5;
    const L1=TR_Y-(BOTTOM+r);
    const L2=(RIGHT-r)-TL_X;
    const L3=(TOP-r)-END_Y;
    const total=L0+A+L1+A+L2+A+L3;

    let d=THREE.MathUtils.clamp(t,0,1)*total;

    if(d<L0)return target.set(START_X+d,BOTTOM,0);
    d-=L0;

    if(d<A){
      const a=-Math.PI/2+d/r;
      return target.set(BR_X+Math.cos(a)*r,(BOTTOM+r)+Math.sin(a)*r,0);
    }
    d-=A;

    if(d<L1)return target.set(RIGHT,(BOTTOM+r)+d,0);
    d-=L1;

    if(d<A){
      const a=d/r;
      return target.set((RIGHT-r)+Math.cos(a)*r,TR_Y+Math.sin(a)*r,0);
    }
    d-=A;

    if(d<L2)return target.set((RIGHT-r)-d,TOP,0);
    d-=L2;

    if(d<A){
      const a=Math.PI/2+d/r;
      return target.set(TL_X+Math.cos(a)*r,(TOP-r)+Math.sin(a)*r,0);
    }
    d-=A;

    return target.set(LEFT,(TOP-r)-Math.min(d,L3),0);
  }
}

// Main swept rail is its own asset.
const mainRail=new THREE.Group();
mainRail.name='MainRail';
scene.add(mainRail);

const profile=new THREE.Shape();
const PW=.34, PH=1.08, PR=.15;
profile.moveTo(-PW*.5+PR,-PH*.5);
profile.lineTo(PW*.5-PR,-PH*.5);
profile.quadraticCurveTo(PW*.5,-PH*.5,PW*.5,-PH*.5+PR);
profile.lineTo(PW*.5,PH*.5-PR);
profile.quadraticCurveTo(PW*.5,PH*.5,PW*.5-PR,PH*.5);
profile.lineTo(-PW*.5+PR,PH*.5);
profile.quadraticCurveTo(-PW*.5,PH*.5,-PW*.5,PH*.5-PR);
profile.lineTo(-PW*.5,-PH*.5+PR);
profile.quadraticCurveTo(-PW*.5,-PH*.5,-PW*.5+PR,-PH*.5);

const railCurve=new OpenRailCurve();
const railGeo=new THREE.ExtrudeGeometry(profile,{
  steps:320,
  bevelEnabled:false,
  extrudePath:railCurve
});
railGeo.computeBoundingBox();
const railMinZ=railGeo.boundingBox.min.z;
const railRawH=Math.max(.0001,railGeo.boundingBox.max.z-railMinZ);
railGeo.translate(0,0,-railMinZ);
railGeo.scale(1,1,RAIL_HEIGHT/railRawH);

const railMesh=new THREE.Mesh(railGeo,M.pipe);
railMesh.position.z=GROUND_EPS;
railMesh.castShadow=true;
railMesh.receiveShadow=true;
mainRail.add(railMesh);

// ------------------------------------------------------------
// Discrete movement/firing nodes
// Pig follows rail orientation by default.
// It turns 90° inward ONLY when a valid same-color front block can be shot.
// ------------------------------------------------------------
const pathNodes=[];

// bottom gap + bottom shooting span: travel is RIGHT
pathNodes.push({x:X0-.42,y:BOTTOM,side:'gap',lane:-1,canShoot:false,travelFace:-Math.PI*.5});

for(let c=0;c<COLS;c++)
  pathNodes.push({
    x:X0+c*STEP,y:BOTTOM,side:'bottom',lane:c,canShoot:true,
    travelFace:-Math.PI*.5,shootFace:0
  });

pathNodes.push({x:GRID_RIGHT+.42,y:BOTTOM,side:'gap',lane:-1,canShoot:false,travelFace:-Math.PI*.5});
pathNodes.push({x:BR_X,y:BOTTOM,side:'gap',lane:-1,canShoot:false,travelFace:-Math.PI*.5});

// bottom-right arc: RIGHT -> UP
for(let i=1;i<=12;i++){
  const t=i/12;
  const a=THREE.MathUtils.lerp(-Math.PI/2,0,t);
  pathNodes.push({
    x:BR_X+Math.cos(a)*CORNER_R,
    y:(BOTTOM+CORNER_R)+Math.sin(a)*CORNER_R,
    side:'arc',lane:-1,canShoot:false,
    travelFace:THREE.MathUtils.lerp(-Math.PI*.5,0,t)
  });
}

// right shooting span: travel is UP, shoot LEFT
for(let r=ROWS-1;r>=0;r--)
  pathNodes.push({
    x:RIGHT,y:Y0-r*STEP,side:'right',lane:r,canShoot:true,
    travelFace:0,shootFace:Math.PI*.5
  });

pathNodes.push({x:RIGHT,y:TR_Y,side:'gap',lane:-1,canShoot:false,travelFace:0});

// top-right arc: UP -> LEFT
for(let i=1;i<=12;i++){
  const t=i/12;
  const a=THREE.MathUtils.lerp(0,Math.PI/2,t);
  pathNodes.push({
    x:(RIGHT-CORNER_R)+Math.cos(a)*CORNER_R,
    y:TR_Y+Math.sin(a)*CORNER_R,
    side:'arc',lane:-1,canShoot:false,
    travelFace:THREE.MathUtils.lerp(0,Math.PI*.5,t)
  });
}

// top gap + shooting span: travel is LEFT, shoot DOWN
pathNodes.push({x:GRID_RIGHT+.42,y:TOP,side:'gap',lane:-1,canShoot:false,travelFace:Math.PI*.5});

for(let c=COLS-1;c>=0;c--)
  pathNodes.push({
    x:X0+c*STEP,y:TOP,side:'top',lane:c,canShoot:true,
    travelFace:Math.PI*.5,shootFace:Math.PI
  });

pathNodes.push({x:X0-.42,y:TOP,side:'gap',lane:-1,canShoot:false,travelFace:Math.PI*.5});
pathNodes.push({x:TL_X,y:TOP,side:'gap',lane:-1,canShoot:false,travelFace:Math.PI*.5});

// top-left arc: LEFT -> DOWN
for(let i=1;i<=12;i++){
  const t=i/12;
  const a=THREE.MathUtils.lerp(Math.PI/2,Math.PI,t);
  pathNodes.push({
    x:TL_X+Math.cos(a)*CORNER_R,
    y:(TOP-CORNER_R)+Math.sin(a)*CORNER_R,
    side:'arc',lane:-1,canShoot:false,
    travelFace:THREE.MathUtils.lerp(Math.PI*.5,Math.PI,t)
  });
}

// left shooting span: travel is DOWN, shoot RIGHT
for(let r=0;r<ROWS;r++)
  pathNodes.push({
    x:LEFT,y:Y0-r*STEP,side:'left',lane:r,canShoot:true,
    travelFace:Math.PI,shootFace:Math.PI*1.5
  });

pathNodes.push({x:LEFT,y:END_Y+.15,side:'end',lane:-1,canShoot:false,travelFace:Math.PI});

// ------------------------------------------------------------
// Bottom pigs
// ------------------------------------------------------------
function makePig(isLight,x,y){
  const g=new THREE.Group();
  const mat=isLight?M.light:M.dark;

  // Floor-pivoted pig: local Z=0 is its feet/base.
  floorBox(1.22,1.28,.72,mat,0,0,0,g);
  floorBox(.62,.26,.24,mat,0,.73,.58,g);

  g.position.set(x,y,GROUND_EPS);
  g.userData={clickable:true,used:false,isLight};
  scene.add(g);
  return g;
}

function makeRunner(isLight,pos){
  const g=new THREE.Group();
  const mat=isLight?M.light:M.dark;
  floorBox(1.22,1.28,.72,mat,0,0,0,g);
  floorBox(.62,.26,.24,mat,0,.73,.58,g);
  g.position.copy(pos);
  scene.add(g);
  return g;
}

const pigs=[];
for(let r=0;r<3;r++){
  for(let c=0;c<4;c++){
    pigs.push(makePig((r+c)%2===1,-3.25+c*2.15,-10.20-r*1.62));
  }
}

const blenderAssets={rails:{},anchors:{},grid:Array.from({length:ROWS},()=>Array(COLS)),pigs:[],runner:null};

function requireBlenderObject(root,name){
  const object=root.getObjectByName(name);
  if(!object)throw new Error(`Missing Blender object: ${name}`);
  return object;
}

function resolveBlenderAssets(blenderRoot){
  for(const name of ['Rail_Start','Rail_Main','Rail_End'])blenderAssets.rails[name]=requireBlenderObject(blenderRoot,name);
  for(const name of ['RailStart','RailEnd','GridCenter','CameraTarget'])blenderAssets.anchors[name]=requireBlenderObject(blenderRoot,name);
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)blenderAssets.grid[r][c]=requireBlenderObject(blenderRoot,`Grid_r${String(r).padStart(2,'0')}_c${String(c).padStart(2,'0')}`);
  for(let index=0;index<pigs.length;index++)blenderAssets.pigs[index]=requireBlenderObject(blenderRoot,`Pig_${String(index).padStart(2,'0')}`);
  blenderAssets.runner=requireBlenderObject(blenderRoot,'PigRunner');
  blenderAssets.runner.visible=false;
  blenderRoot.traverse(object=>{
    if(object.isMesh){object.castShadow=true; object.receiveShadow=true;}
  });
}

new GLTFLoader().load(new URL('../assets/primitive_scene.glb',import.meta.url).href,gltf=>{
  const blenderRoot=gltf.scene;
  blenderRoot.rotation.x=Math.PI*.5;
  blenderRoot.updateMatrixWorld(true);
  resolveBlenderAssets(blenderRoot);
  scene.add(blenderRoot);
},undefined,error=>console.error('Blender GLB failed to load.',error));

// ------------------------------------------------------------
// Front-only occlusion
// ------------------------------------------------------------
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

const ray=new THREE.Raycaster();
const pointer=new THREE.Vector2();
const runs=[];
const shots=[];

function validTarget(run,node){
  const cell=frontCell(node);
  if(!cell || cell.reserved || cell.isLight!==run.isLight)return null;
  return cell;
}

function fireReserved(run){
  const cell=run.targetCell;
  if(!cell || !cell.alive)return;

  const bullet=new THREE.Mesh(
    new THREE.SphereGeometry(.24,16,12),
    run.isLight?M.light:M.dark
  );
  bullet.castShadow=true;

  // +Y is the pig's mouth/front.
  const mouthLocal=new THREE.Vector3(0,.92,.67);
  const a=run.runner.localToWorld(mouthLocal.clone());
  const b=cell.mesh.position.clone();
  b.z=GRID_HEIGHT*.72;

  bullet.position.copy(a);
  scene.add(bullet);
  shots.push({mesh:bullet,a,b,t:0,duration:Math.max(.045,a.distanceTo(b)/SHOT_SPEED),cell});
}

function startRun(pig){
  if(pig.userData.used || !pig.visible)return;

  pig.userData.used=true;
  pig.visible=false;

  const entry=new THREE.Vector3(START_X,BOTTOM,GROUND_EPS+RAIL_HEIGHT+.015);
  const runner=makeRunner(pig.userData.isLight,entry);

  // Default orientation follows the bottom rail to the right.
  runner.rotation.z=-Math.PI*.5;

  runs.push({
    runner,
    isLight:pig.userData.isLight,
    nodeIndex:0,
    phase:'move',
    from:entry.clone(),
    to:entry.clone(),
    stepT:1,
    stepDuration:0,
    fromRot:-Math.PI*.5,
    toRot:-Math.PI*.5,
    targetCell:null,
    activeNode:null,
    turnT:0,
    engaged:false
  });
}

renderer.domElement.addEventListener('pointerdown',e=>{
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
  pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
  ray.setFromCamera(pointer,camera);

  const hits=ray.intersectObjects(pigs,true);
  for(const hit of hits){
    let o=hit.object;
    while(o.parent && !o.userData.clickable)o=o.parent;
    if(o.userData.clickable && !o.userData.used && o.visible){
      startRun(o);
      break;
    }
  }
});

const MOVE_SPEED=6.4;
const ENGAGED_MOVE_SPEED=10.7;
const AIM_TIME=.028;
const SHOT_SPEED=22.0;

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
  run.to=new THREE.Vector3(n.x,n.y,GROUND_EPS+RAIL_HEIGHT+.015);
  run.stepT=0;

  const distance=run.from.distanceTo(run.to);
  run.stepDuration=distance/(run.engaged?ENGAGED_MOVE_SPEED:MOVE_SPEED);

  run.fromRot=run.runner.rotation.z;

  // Before first shot: follow the rail.
  // After first shot: remain 90 degrees inward from the rail until disappearing.
  run.toRot=run.engaged ? n.travelFace+Math.PI*.5 : n.travelFace;
  return true;
}

function finishNode(run){
  const node=run.activeNode;

  if(node.canShoot){
    const cell=validTarget(run,node);

    if(cell){
      cell.reserved=true;
      run.targetCell=cell;

      if(!run.engaged){
        // First legal shot: turn 90 degrees inward once.
        run.phase='aimIn';
        run.turnT=0;
        run.fromRot=run.runner.rotation.z;
        run.toRot=node.shootFace;
        return false;
      }

      // Already engaged: stay inward-facing and fire immediately.
      fireReserved(run);
      run.targetCell=null;
    }
  }

  run.nodeIndex++;
  if(run.nodeIndex>=pathNodes.length){
    scene.remove(run.runner);
    return true;
  }

  beginStep(run);
  return false;
}

function updateRun(run,dt){
  if(run.phase==='move'){
    if(run.stepT>=1 && !beginStep(run))return true;

    run.stepT+=dt/run.stepDuration;
    const k=Math.min(run.stepT,1);

    run.runner.position.lerpVectors(run.from,run.to,k);
    run.runner.rotation.z=angleLerp(run.fromRot,run.toRot,k);

    if(k>=1)return finishNode(run);
    return false;
  }

  if(run.phase==='aimIn'){
    run.turnT+=dt/AIM_TIME;
    const k=Math.min(run.turnT,1);
    run.runner.rotation.z=angleLerp(run.fromRot,run.toRot,k);

    if(k>=1){
      run.engaged=true;
      fireReserved(run);
      run.targetCell=null;
      run.nodeIndex++;

      if(run.nodeIndex>=pathNodes.length){
        scene.remove(run.runner);
        return true;
      }

      beginStep(run);
    }
    return false;
  }

  return false;
}

function destroyCell(cell){
  cell.reserved=false;
  if(!cell.alive)return;
  cell.alive=false;
  cell.mesh.visible=false;
}

let last=performance.now();
function frame(now){
  const dt=Math.min((now-last)/1000,.033);
  last=now;

  for(let i=runs.length-1;i>=0;i--)
    if(updateRun(runs[i],dt))runs.splice(i,1);

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

  renderer.render(scene,camera);
}
renderer.setAnimationLoop(frame);
