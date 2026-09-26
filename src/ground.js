import * as THREE from 'three';
import {GROUND} from './tokens.js';

export function vignette(ground,center){
  const uniforms={
    uCenter:{value:new THREE.Vector2(center.x,center.y)},uRadius:{value:new THREE.Vector2(...GROUND.radius)},
    uInner:{value:GROUND.inner},uOuter:{value:GROUND.outer},uMiddle:{value:GROUND.middle},uEdge:{value:GROUND.edge}
  };
  ground.traverse(o=>{
    if(!o.isMesh || o.material.isShadowMaterial)return;
    o.castShadow=false;
    const material=o.material.clone();
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,uniforms);
      shader.vertexShader='varying vec2 vGround;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvGround = ( modelMatrix * vec4( transformed, 1.0 ) ).xy;');
      shader.fragmentShader='varying vec2 vGround;\nuniform vec2 uCenter, uRadius;\nuniform float uInner, uOuter, uMiddle, uEdge;\n'+shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight *= mix( uMiddle, uEdge, smoothstep( uInner, uOuter, length( ( vGround - uCenter ) / uRadius ) ) );\n#include <opaque_fragment>');
    };
    material.customProgramCacheKey=()=>'ground';
    o.material=material;
  });
}
