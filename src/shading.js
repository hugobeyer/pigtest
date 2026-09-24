import * as THREE from 'three';
import {SHADING} from './tokens.js';

const converted=new Map();
const uniforms={
  uWrap:{value:SHADING.wrap},uPower:{value:SHADING.power},uShadowTint:{value:new THREE.Color(SHADING.shadowTint)},
  uRimColor:{value:new THREE.Color(SHADING.rim.color)},uRimStrength:{value:SHADING.rim.strength},uRimPower:{value:SHADING.rim.power}
};
const keys=['map','color','normalMap','normalMapType','normalScale','aoMap','aoMapIntensity','lightMap','lightMapIntensity','emissive','emissiveMap','emissiveIntensity','alphaMap','transparent','opacity','alphaTest','side','vertexColors'];

function patch(shader){
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=`uniform float uWrap, uPower, uRimStrength, uRimPower;
uniform vec3 uShadowTint, uRimColor;
`+shader.fragmentShader
    .replace('#include <lights_lambert_pars_fragment>',THREE.ShaderChunk.lights_lambert_pars_fragment.replace(
      '\tfloat dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n\tvec3 irradiance = dotNL * directLight.color;',
      '\tfloat wrapped = pow( saturate( dot( geometryNormal, directLight.direction ) * uWrap + 1.0 - uWrap ), uPower );\n\tvec3 irradiance = mix( uShadowTint, vec3( 1.0 ), wrapped ) * wrapped * directLight.color;'))
    .replace('#include <opaque_fragment>','outgoingLight += uRimColor * uRimStrength * pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), uRimPower );\n#include <opaque_fragment>');
}

export function gooshy(source){
  if(!converted.has(source)){
    const material=new THREE.MeshLambertMaterial(Object.fromEntries(keys.filter(key=>source[key]!==undefined).map(key=>[key,source[key]])));
    material.name=source.name;
    material.onBeforeCompile=patch;
    material.customProgramCacheKey=()=>'gooshy';
    converted.set(source,material);
  }
  return converted.get(source);
}

export function shadeGameplay(root){
  root.traverse(o=>{
    if(!o.isMesh || o.material.isMeshBasicMaterial || o.material.isShadowMaterial)return;
    o.material=Array.isArray(o.material) ? o.material.map(gooshy) : gooshy(o.material);
  });
}
