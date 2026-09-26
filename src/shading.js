import * as THREE from 'three';
import {SHADING} from './tokens.js';

const converted=new Map();
const uniforms={
  uWrap:{value:SHADING.wrap},uPower:{value:SHADING.power},
  uSssColor:{value:new THREE.Color(SHADING.sss.color)},uSssStrength:{value:SHADING.sss.strength},uSssWidth:{value:SHADING.sss.width},
  uRimColor:{value:new THREE.Color(SHADING.rim.color)},uRimStrength:{value:SHADING.rim.strength},uRimPower:{value:SHADING.rim.power},
  uOutlineColor:{value:new THREE.Color(SHADING.outline.color)},uOutlineFrom:{value:SHADING.outline.from},uOutlineStrength:{value:SHADING.outline.strength}
};
const diffuse='\treflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );';

function patch(shader){
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=`uniform float uWrap, uPower, uSssStrength, uSssWidth, uRimStrength, uRimPower, uOutlineFrom, uOutlineStrength;
uniform vec3 uSssColor, uRimColor, uOutlineColor;
`+shader.fragmentShader
    .replace('#include <lights_physical_pars_fragment>',THREE.ShaderChunk.lights_physical_pars_fragment.replace(diffuse,`\tfloat nl = dot( geometryNormal, directLight.direction );
\tfloat wrapped = pow( saturate( nl * uWrap + 1.0 - uWrap ), uPower );
\tfloat band = 1.0 - smoothstep( 0.0, uSssWidth, abs( nl ) );
\treflectedLight.directDiffuse += directLight.color * ( wrapped * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F ) + BRDF_Lambert( material.diffuseContribution ) * uSssColor * uSssStrength * band * 2.0 );`))
    .replace('#include <opaque_fragment>',`float facing = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );
#if NUM_DIR_LIGHTS > 0
outgoingLight += uRimColor * uRimStrength * saturate( 0.5 - 0.5 * dot( normal, directionalLights[ 0 ].direction ) ) * pow( facing, uRimPower );
#endif
outgoingLight = mix( outgoingLight, uOutlineColor, uOutlineStrength * sin( saturate( ( facing - uOutlineFrom ) / ( 1.0 - uOutlineFrom ) ) * PI ) );
#include <opaque_fragment>`);
}

export function gooshy(source){
  if(!converted.has(source)){
    const material=source.clone();
    material.shadowSide=THREE.DoubleSide;
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
