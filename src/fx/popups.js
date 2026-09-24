import {createLabel} from '../labels.js';
import {tween} from '../tweens.js';
import {FX} from '../tokens.js';

export function popup(scene,text,position){
  const {height,aspect,lift,rise,duration}=FX.combo;
  const label=createLabel(scene,height,aspect);
  label.userData.set(text);
  label.position.copy(position);
  label.position.z+=lift;
  const z=label.position.z;
  tween(duration,k=>{
    label.position.z=z+rise*k;
    label.material.opacity=1-k*k;
  },()=>scene.remove(label));
}
