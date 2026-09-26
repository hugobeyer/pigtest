import * as THREE from 'three';
import {blendFog} from './fog.js';
import {GROUND} from './tokens.js';

export const uniforms={
  uCenter:{value:new THREE.Vector2()},uOffset:{value:new THREE.Vector2(...GROUND.offset)},uRadius:{value:new THREE.Vector2(...GROUND.radius)},
  uInner:{value:GROUND.inner},uOuter:{value:GROUND.outer},uMiddle:{value:new THREE.Color(GROUND.middle)},uEdge:{value:new THREE.Color(GROUND.edge)},
  uSceneryVignette:{value:GROUND.scenery},uCharacterVignette:{value:GROUND.characters}
};

export function vignette(ground,center){
  uniforms.uCenter.value.set(center.x,center.y);
  ground.traverse(o=>{
    if(!o.isMesh || o.material.isShadowMaterial)return;
    o.castShadow=false;
    const material=o.material.clone();
    material.color.set(0xffffff);
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='varying vec2 vGround;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvGround = ( modelMatrix * vec4( transformed, 1.0 ) ).xy;');
      shader.fragmentShader='varying vec2 vGround;\nuniform vec2 uCenter, uOffset, uRadius;\nuniform float uInner, uOuter;\nuniform vec3 uMiddle, uEdge;\n'+shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight *= mix( uMiddle, uEdge, smoothstep( min( uInner, uOuter ), max( uInner, uOuter ) + 1e-3, length( ( vGround - uCenter - uOffset ) / uRadius ) ) );\n#include <opaque_fragment>');
      blendFog(shader);
    };
    material.customProgramCacheKey=()=>'ground';
    o.material=material;
  });
}
