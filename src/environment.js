import * as THREE from 'three';
import {ENVIRONMENT} from './tokens.js';

const unlit=new Map();

function isEnvironment(object){
  for(let o=object;o;o=o.parent)if(o.userData.environment)return true;
  return false;
}

function unlitMaterial(source){
  if(!unlit.has(source))unlit.set(source,new THREE.MeshBasicMaterial({
    map:source.map,color:source.color,vertexColors:source.vertexColors,
    transparent:source.transparent,opacity:source.opacity,alphaTest:source.alphaTest,side:source.side
  }));
  return unlit.get(source);
}

export function prepareEnvironment(root){
  const meshes=[];
  root.traverse(o=>{if(o.isMesh && isEnvironment(o))meshes.push(o);});
  const catcher=new THREE.ShadowMaterial({opacity:ENVIRONMENT.shadowOpacity,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  for(const mesh of meshes){
    mesh.material=Array.isArray(mesh.material) ? mesh.material.map(unlitMaterial) : unlitMaterial(mesh.material);
    mesh.castShadow=true;
    mesh.receiveShadow=false;
    const shadow=new THREE.Mesh(mesh.geometry,catcher);
    shadow.receiveShadow=true;
    mesh.add(shadow);
  }
}
