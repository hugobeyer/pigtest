import * as THREE from 'three';
import {isEnvironment} from './environment.js';
import {SHADING} from './tokens.js';

const converted={character:new Map(),scenery:new Map()};
const uniforms={
  uWrap:{value:SHADING.wrap},uPower:{value:SHADING.power},
  uSssStrength:{value:SHADING.sss.strength},uSssWidth:{value:SHADING.sss.width},
  uRimColor:{value:new THREE.Color(SHADING.rim.color)},uRimStrength:{value:SHADING.rim.strength},uRimPower:{value:SHADING.rim.power},
  uOutlineColor:{value:new THREE.Color(SHADING.outline.color)},uOutlineFrom:{value:SHADING.outline.from},uOutlineStrength:{value:SHADING.outline.strength}
};
const diffuse='\treflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );';

function patch(shader){
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=`uniform float uWrap, uPower, uSssStrength, uSssWidth, uRimStrength, uRimPower, uOutlineFrom, uOutlineStrength;
uniform vec3 uRimColor, uOutlineColor;
`+shader.fragmentShader
    .replace('#include <lights_physical_pars_fragment>',THREE.ShaderChunk.lights_physical_pars_fragment.replace(diffuse,`\tfloat nl = dot( geometryNormal, directLight.direction );
\tfloat wrapped = pow( saturate( nl * uWrap + 1.0 - uWrap ), uPower );
\tfloat band = 1.0 - smoothstep( 0.0, uSssWidth, abs( nl ) );
\t#if NUM_HEMI_LIGHTS > 0
\t\tvec3 sky = hemisphereLights[ 0 ].skyColor;
\t#else
\t\tvec3 sky = vec3( 1.0 );
\t#endif
\treflectedLight.directDiffuse += directLight.color * wrapped * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
\t#ifdef GOOSHY_CHARACTER
\t\treflectedLight.directDiffuse += directLight.color * BRDF_Lambert( material.diffuseContribution ) * sky * uSssStrength * band;
\t#endif`))
    .replace('#include <opaque_fragment>',`#ifdef GOOSHY_CHARACTER
float facing = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );
#if NUM_DIR_LIGHTS > 0
outgoingLight += uRimColor * uRimStrength * saturate( 0.5 - 0.5 * dot( normal, directionalLights[ 0 ].direction ) ) * pow( facing, uRimPower );
#endif
outgoingLight = mix( outgoingLight, uOutlineColor, uOutlineStrength * sin( saturate( ( facing - uOutlineFrom ) / ( 1.0 - uOutlineFrom ) ) * PI ) );
#endif
#include <opaque_fragment>`);
}

function gooshy(source,character){
  const cache=character ? converted.character : converted.scenery;
  if(!cache.has(source)){
    const material=source.clone();
    material.shadowSide=THREE.DoubleSide;
    if(character)material.defines={...material.defines,GOOSHY_CHARACTER:''};
    material.onBeforeCompile=patch;
    material.customProgramCacheKey=()=>character ? 'gooshy-character' : 'gooshy-scenery';
    cache.set(source,material);
  }
  return cache.get(source);
}

export function shadeGameplay(root){
  root.traverse(o=>{
    if(!o.isMesh || o.material.isMeshBasicMaterial || o.material.isShadowMaterial)return;
    const character=!isEnvironment(o);
    o.material=Array.isArray(o.material) ? o.material.map(m=>gooshy(m,character)) : gooshy(o.material,character);
  });
}
