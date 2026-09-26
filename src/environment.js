import * as THREE from 'three';
import {ENVIRONMENT} from './tokens.js';

const unlit=new Map();
const {specular}=ENVIRONMENT;
export const sunDirection={value:new THREE.Vector3(0,0,1)};
const uniforms={
  uSunDirection:sunDirection,uSpecColor:{value:new THREE.Color(specular.color)},
  uSpecStrength:{value:specular.strength},uSpecSize:{value:specular.size},uSpecSoftness:{value:specular.softness}
};

function isEnvironment(object){
  for(let o=object;o;o=o.parent)if(o.userData.environment)return true;
  return false;
}

function patch(shader){
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 vWorldNormal, vWorldPosition;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvWorldNormal = normalize( mat3( modelMatrix ) * normal );\nvWorldPosition = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
  shader.fragmentShader=`varying vec3 vWorldNormal, vWorldPosition;
uniform vec3 uSunDirection, uSpecColor;
uniform float uSpecStrength, uSpecSize, uSpecSoftness;
`+shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight += uSpecColor * uSpecStrength * smoothstep( uSpecSize - uSpecSoftness, uSpecSize + uSpecSoftness, dot( normalize( vWorldNormal ), normalize( uSunDirection + normalize( cameraPosition - vWorldPosition ) ) ) );\n#include <opaque_fragment>');
}

function unlitMaterial(source){
  if(!unlit.has(source)){
    const material=new THREE.MeshBasicMaterial({
      map:source.map,color:source.color,vertexColors:source.vertexColors,
      transparent:source.transparent,opacity:source.opacity,alphaTest:source.alphaTest,side:source.side,shadowSide:THREE.DoubleSide
    });
    material.onBeforeCompile=patch;
    material.customProgramCacheKey=()=>'environment';
    unlit.set(source,material);
  }
  return unlit.get(source);
}

export function prepareEnvironment(root){
  const meshes=[];
  root.traverse(o=>{if(o.isMesh && isEnvironment(o))meshes.push(o);});
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
