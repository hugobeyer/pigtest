import * as THREE from 'three';
import {createGrid} from './grid.js';
import {createPath} from './path.js';
import {createPigs, takePig, tapTargets} from './pigs.js';
import {initRunners, launchRunner, runs, updateRunners} from './runners.js';
import {updateShots} from './shots.js';
import {updateTweens} from './tweens.js';
import {createLabel} from './labels.js';
import {LABEL, PIGS} from './tokens.js';

let capacityLabel, pigTemplates;
export {tapTargets};

export function initGameplay(scene,assets){
  pigTemplates=assets.pigs;
  const grid=createGrid(scene,assets.gridCenter,assets.blocks);
  initRunners(scene,pigTemplates,createPath(grid,assets.anchors));
  createPigs(scene,assets.columns,pigTemplates);
  const box=new THREE.Box3().setFromObject(assets.railStart);
  capacityLabel=createLabel(scene);
  capacityLabel.position.set(box.getCenter(new THREE.Vector3()).x,box.min.y-LABEL.capacityGap,box.max.z);
}

export function tap(object){
  if(runs.length>=PIGS.railCapacity)return false;
  const pig=takePig(object);
  if(!pig)return false;
  launchRunner({template:pig.isLight ? pigTemplates.light : pigTemplates.dark,ammo:pig.ammo,isLight:pig.isLight});
  return true;
}

export function updateGameplay(dt){
  updateRunners(dt);
  updateShots(dt);
  updateTweens(dt);
  capacityLabel.userData.set(`${PIGS.railCapacity-runs.length}/${PIGS.railCapacity}`);
}
