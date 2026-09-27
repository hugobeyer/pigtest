import * as THREE from 'three';
import {createGrid, remainingCells, updateGrid} from './grid.js';
import {createPath} from './path.js';
import {createPigs, pigsLeft, takePig, tapTargets, updatePigs} from './pigs.js';
import {initRunners, launchRunner, runStats, runs, updateRunners} from './runners.js';
import {activeShots, clearShots, updateShots} from './shots.js';
import {bump, clearTweens, tween, updateTweens} from './tweens.js';
import {emit, initParticles, updateParticles} from './fx/particles.js';
import {initPopups} from './fx/popups.js';
import {initShake, shake, updateShake} from './fx/shake.js';
import {initRing} from './fx/ring.js';
import {initTrails} from './fx/trail.js';
import {initSparkles, sparkle, updateSparkles} from './fx/sparkles.js';
import {showWin} from './win.js';
import {showIntro} from './intro.js';
import {showMenu} from './menu.js';
import {play} from './sfx.js';
import {createLabel} from './labels.js';
import {ADVENTURE, FX, INTRO, LABEL, PIGS, WIN} from './tokens.js';

let scene, assets, stage=null, level=null, levelIndex=0, capacityLabel, capacityText, center, totalBlocks, won=false, lost=false, time=0, startTime=0, pigsUsed=0;
export {tapTargets};

export function initGameplay(targetScene,loaded){
  scene=targetScene;
  assets=loaded;
  center=assets.gridCenter.getWorldPosition(new THREE.Vector3());
  initParticles(scene,assets.blocks);
  initShake(assets.camera);
  initPopups(assets.camera);
  initRing();
  initTrails(assets.camera);
  initSparkles(scene);
  capacityLabel=createLabel(scene);
  capacityLabel.position.copy(assets.anchors.RailStart.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(...LABEL.capacityOffset));
  menu();
}

function menu(){
  teardown();
  showMenu({classic:()=>start(null),adventure:()=>start(0)});
}

function teardown(){
  clearTweens();
  clearShots();
  tapTargets.length=0;
  capacityLabel.visible=false;
  document.querySelectorAll('.popup,#intro,#win').forEach(element=>element.remove());
  if(!stage)return;
  scene.remove(stage);
  stage.traverse(o=>{
    if(o.isInstancedMesh)o.dispose();
    if(o.isSprite){o.material.map.dispose(); o.material.dispose();}
    if(o.userData.ownsGeometry)o.geometry.dispose();
    if(o.userData.ownsMaterial)o.material.dispose();
  });
  stage=null;
}

function layoutFor(base,{size,pattern,checker}){
  return {rows:size,columns:size,step:base.step,checker,pattern};
}

function start(index){
  teardown();
  levelIndex=index;
  level=index===null ? null : ADVENTURE.levels[index];
  stage=new THREE.Group();
  scene.add(stage);
  const base=assets.gridCenter.userData, layout=level ? layoutFor(base,level) : base;
  const grid=createGrid(stage,assets.gridCenter,assets.blocks,layout);
  totalBlocks=remainingCells();
  const rail={right:center.x+(base.columns-1)*.5*base.step,top:center.y+(base.rows-1)*.5*base.step};
  initRunners(stage,assets.pigs,assets.bullets,createPath(grid,assets.anchors,rail),assets.camera);
  createPigs(stage,assets.columns,assets.pigs,time,level?.queues,level?.ammo);
  won=lost=false;
  pigsUsed=0;
  startTime=time;
  capacityText=null;
  capacityLabel.visible=true;
  showIntro(level ? `${INTRO.level} ${index+1}` : INTRO.text);
}

export function tap(object){
  if(!stage || won || lost)return false;
  if(runs.length>=PIGS.railCapacity){play('full'); return true;}
  const pig=takePig(object);
  if(!pig)return false;
  pigsUsed++;
  launchRunner({template:pig.isLight ? assets.pigs.light : assets.pigs.dark,ammo:pig.ammo,isLight:pig.isLight});
  return true;
}

function stats(){
  return {blocks:totalBlocks,left:remainingCells(),time:Math.round(time-startTime),pigs:pigsUsed,...runStats};
}

function celebrate(){
  emit(center,true,FX.confetti);
  emit(center,false,FX.confetti);
  sparkle(center,'levelClear');
  play('clear');
  shake();
  const last=level && levelIndex===ADVENTURE.levels.length-1;
  tween(WIN.delay,null,()=>showWin(stats(),{
    hint:!level ? WIN.hint : last ? WIN.done : WIN.next,
    onTap:!level ? ()=>start(null) : last ? menu : ()=>start(levelIndex+1),
    onMenu:menu
  }));
}

function fail(){
  play('full');
  tween(WIN.fail.delay,null,()=>showWin(stats(),{...WIN.fail,onTap:()=>start(level ? levelIndex : null),onMenu:menu}));
}

export function updateGameplay(dt){
  time+=dt;
  if(stage){
    updateRunners(dt);
    updateShots(dt);
    updateGrid(dt);
  }
  updateTweens(dt);
  updateParticles(dt);
  updateSparkles(dt);
  updateShake(dt);
  if(!stage)return;
  updatePigs(time,!won && !lost && runs.length<PIGS.railCapacity);
  if(!won && !lost && remainingCells()===0){
    won=true;
    celebrate();
  }
  if(level && !won && !lost && !runs.length && !activeShots() && !pigsLeft()){
    lost=true;
    fail();
  }
  const text=`${PIGS.railCapacity-runs.length}/${PIGS.railCapacity}`;
  if(text!==capacityText){
    if(capacityText)bump(capacityLabel,FX.counterPunch);
    capacityText=text;
    capacityLabel.userData.set(text);
  }
}
