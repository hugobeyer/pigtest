import * as THREE from 'three';
import tileUrl from '../assets/ground/ground_tile.webp';
import { blendFog } from './fog.js';
import { GROUND, RENDER } from './tokens.js';

const tile = new THREE.TextureLoader().load(tileUrl);
tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
tile.colorSpace = THREE.SRGBColorSpace;
tile.anisotropy = RENDER.anisotropy;

export const uniforms = {
  uCenter: { value: new THREE.Vector2() },
  uOffset: { value: new THREE.Vector2(...GROUND.offset) },
  uRadius: { value: new THREE.Vector2(...GROUND.radius) },
  uInner: { value: GROUND.inner },
  uOuter: { value: GROUND.outer },
  uMiddle: { value: new THREE.Color(GROUND.middle) },
  uEdge: { value: new THREE.Color(GROUND.edge) },
  uSceneryVignette: { value: GROUND.scenery },
  uCharacterVignette: { value: GROUND.characters },
  uDetail: { value: tile },
  uDetailTile: { value: GROUND.detailTile },
  uDetailCenter: { value: GROUND.detailCenter },
  uDetailEdge: { value: GROUND.detailEdge }
};

export function vignette(ground, center) {
  uniforms.uCenter.value.set(center.x, center.y);
  ground.traverse(o => {
    if (!o.isMesh || o.material.isShadowMaterial) return;
    o.castShadow = false;
    const material = o.material.clone();
    material.color.set(0xffffff);
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader =
        'varying vec2 vGround;\n' +
        shader.vertexShader.replace(
          '#include <project_vertex>',
          '#include <project_vertex>\nvGround = ( modelMatrix * vec4( transformed, 1.0 ) ).xy;'
        );
      shader.fragmentShader =
        `varying vec2 vGround;
uniform vec2 uCenter, uOffset, uRadius;
uniform float uInner, uOuter, uDetailTile, uDetailCenter, uDetailEdge;
uniform vec3 uMiddle, uEdge;
uniform sampler2D uDetail;
` +
        shader.fragmentShader.replace(
          '#include <opaque_fragment>',
          `float ramp = smoothstep( min( uInner, uOuter ), max( uInner, uOuter ) + 1e-3, length( ( vGround - uCenter - uOffset ) / uRadius ) );
vec3 detail = texture2D( uDetail, vGround / uDetailTile ).rgb / max( textureLod( uDetail, vec2( 0.5 ), 16.0 ).rgb, vec3( 1e-3 ) );
outgoingLight *= mix( uMiddle, uEdge, ramp ) * max( mix( vec3( 1.0 ), detail, mix( uDetailCenter, uDetailEdge, ramp ) ), vec3( 0.0 ) );
#include <opaque_fragment>`
        );
      blendFog(shader);
    };
    material.customProgramCacheKey = () => 'ground';
    o.material = material;
  });
}
