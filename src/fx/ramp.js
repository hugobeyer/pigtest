import * as THREE from 'three';
import {FX} from '../tokens.js';

const stops=FX.ramp.colors.map(color=>new THREE.Color(color));

export function rampColor(hits){
  const x=hits*FX.ramp.step%2, t=(x>1 ? 2-x : x)*(stops.length-1), i=Math.min(Math.floor(t),stops.length-2);
  return new THREE.Color().lerpColors(stops[i],stops[i+1],t-i);
}
