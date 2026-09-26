import * as THREE from 'three';
import {createGrid, remainingCells, updateGrid} from './grid.js';
import {createPath} from './path.js';
import {createPigs, takePig, tapTargets, updatePigs} from './pigs.js';
import {initRunners, launchRunner, runStats, runs, updateRunners} from './runners.js';
import {updateShots} from './shots.js';
import {bump, tween, updateTweens} from './tweens.js';
import {emit, initParticles, updateParticles} from './fx/particles.js';
import {initPopups} from './fx/popups.js';
import {initShake, shake, updateShake} from './fx/shake.js';
import {initRing} from './fx/ring.js';
import {initSparkles, sparkle, updateSparkles} from './fx/sparkles.js';
import {showWin} from './win.js';
import {play} from './sfx.js';
import {createLabel} from './labels.js';
import {FX, LABEL, PIGS, WIN} from './tokens.js';

let capacityLabel, capacityText, pigTemplates, center, totalBlocks, won=false, time=0, pigsUsed=0;
export {tapTargets};

export function initGameplay(scene,assets){
  pigTemplates=assets.pigs;
  center=assets.gridCenter.getWorldPosition(new THREE.Vector3());
  initParticles(scene,assets.blocks);
  initShake(assets.camera);
  initPopups(assets.camera);
  initRing();
  initSparkles(scene);
  const grid=createGrid(scene,assets.gridCenter,assets.blocks);
  totalBlocks=remainingCells();
  initRunners(scene,pigTemplates,assets.bullets,createPath(grid,assets.anchors),assets.camera);
  createPigs(scene,assets.columns,pigTemplates);
  capacityLabel=createLabel(scene);
  capacityLabel.position.copy(assets.anchors.RailStart.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(...LABEL.capacityOffset));
}

export function tap(object){
  if(won)return false;
  if(runs.length>=PIGS.railCapacity){play('full'); return true;}
  const pig=takePig(object);
  if(!pig)return false;
  pigsUsed++;
  launchRunner({template:pig.isLight ? pigTemplates.light : pigTemplates.dark,ammo:pig.ammo,isLight:pig.isLight});
  return true;
}

function celebrate(){
  emit(center,true,FX.confetti);
  emit(center,false,FX.confetti);
  sparkle(center,'levelClear');
  play('clear');
  shake();
  tween(WIN.delay,null,()=>showWin({blocks:totalBlocks,time:Math.round(time),pigs:pigsUsed,...runStats}));
}

export function updateGameplay(dt){
  time+=dt;
  updateRunners(dt);
  updateShots(dt);
  updateGrid(dt);
  updateTweens(dt);
  updateParticles(dt);
  updateSparkles(dt);
  updateShake(dt);
  updatePigs(time,!won && runs.length<PIGS.railCapacity);
  if(!won && remainingCells()===0){
    won=true;
    celebrate();
  }
  const text=`${PIGS.railCapacity-runs.length}/${PIGS.railCapacity}`;
  if(text!==capacityText){
    if(capacityText)bump(capacityLabel,FX.counterPunch);
    capacityText=text;
    capacityLabel.userData.set(text);
  }
}
