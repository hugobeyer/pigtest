import * as THREE from 'three';
import {createGrid} from './grid.js';
import {createPath} from './path.js';
import {createPigs, materialOf, takePig, updatePigs} from './pigs.js';
import {initRunners, launchRunner, runs, updateRunners} from './runners.js';
import {updateShots} from './shots.js';
import {updateTweens} from './tweens.js';
import {createLabel} from './labels.js';
import {LABEL, PIGS} from './tokens.js';

let capacityLabel;
export const tapTargets=[];

export function initGameplay(scene,assets){
  const grid=createGrid(assets.grid);
  initRunners(scene,assets.runner,createPath(grid,assets.anchors));
  createPigs(scene,assets.pigs);
  tapTargets.push(...assets.pigs);
  const box=new THREE.Box3().setFromObject(assets.railStart);
  capacityLabel=createLabel(scene);
  capacityLabel.position.set(box.getCenter(new THREE.Vector3()).x,box.min.y-LABEL.capacityGap,box.max.z);
}

export function tap(pig){
  if(runs.length>=PIGS.railCapacity)return false;
  const data=takePig(pig);
  if(!data)return false;
  launchRunner({material:materialOf(pig),ammo:data.ammo,isLight:data.isLight});
  return true;
}

export function updateGameplay(dt){
  updateRunners(dt);
  updateShots(dt);
  updateTweens(dt);
  updatePigs();
  capacityLabel.userData.set(`${PIGS.railCapacity-runs.length}/${PIGS.railCapacity}`);
}
