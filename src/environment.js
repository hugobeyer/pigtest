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
    transparent:source.transparent,opacity:source.opacity,alphaTest:source.alphaTest,side:source.side,shadowSide:THREE.DoubleSide
  }));
  return unlit.get(source);
}

function isUnder(object,parent){
  for(let o=object;o;o=o.parent)if(o===parent)return true;
  return false;
}

export function prepareEnvironment(root,ground){
  const meshes=[];
  root.traverse(o=>{if(o.isMesh && isEnvironment(o) && !(ENVIRONMENT.lit && !isUnder(o,ground)))meshes.push(o);});
  const catcher=new THREE.ShadowMaterial({color:ENVIRONMENT.shadowColor,opacity:ENVIRONMENT.shadowOpacity,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  for(const mesh of meshes){
    mesh.material=Array.isArray(mesh.material) ? mesh.material.map(unlitMaterial) : unlitMaterial(mesh.material);
    if(!mesh.receiveShadow)continue;
    mesh.receiveShadow=false;
    const shadow=new THREE.Mesh(mesh.geometry,catcher);
    shadow.receiveShadow=true;
    mesh.add(shadow);
  }
}
