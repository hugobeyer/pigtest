import * as THREE from 'three';
import {materialOf} from '../assets.js';
import {FX} from '../tokens.js';

const materials=new Map();
const axis=new THREE.Vector3(0,1,0);
let geometry;

function ribbon(){
  const {headWidth,tailWidth}=FX.trail;
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([-tailWidth*.5,0,0, tailWidth*.5,0,0, -headWidth*.5,1,0, headWidth*.5,1,0],3));
  g.setAttribute('color',new THREE.Float32BufferAttribute([1,1,1,0, 1,1,1,0, 1,1,1,1, 1,1,1,1],4));
  g.setIndex([0,2,1, 1,2,3]);
  return g;
}

export function createTrail(template,from,to){
  geometry??=ribbon();
  const source=materialOf(template);
  if(!materials.has(source))materials.set(source,new THREE.MeshBasicMaterial({color:source.color,vertexColors:true,transparent:true,opacity:FX.trail.opacity,depthWrite:false,side:THREE.DoubleSide}));
  const trail=new THREE.Mesh(geometry,materials.get(source));
  trail.quaternion.setFromUnitVectors(axis,to.clone().sub(from).normalize());
  trail.position.copy(from);
  trail.scale.y=0;
  return trail;
}
