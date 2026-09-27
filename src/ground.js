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
  uHeightContrast: { value: GROUND.heightContrast },
  uHeightWidth: { value: GROUND.heightWidth },
  uBreakTile: { value: GROUND.breakTile },
  uBreakAmount: { value: GROUND.breakAmount }
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
uniform float uInner, uOuter, uDetailTile, uHeightContrast, uHeightWidth, uBreakTile, uBreakAmount;
uniform vec3 uMiddle, uEdge;
uniform sampler2D uDetail;
` +
        shader.fragmentShader.replace(
          '#include <opaque_fragment>',
          `float ramp = smoothstep( min( uInner, uOuter ), max( uInner, uOuter ) + 1e-3, length( ( vGround - uCenter - uOffset ) / uRadius ) );
vec3 lumaWeights = vec3( 0.2126, 0.7152, 0.0722 );
vec3 detailMean = max( textureLod( uDetail, vec2( 0.5 ), 16.0 ).rgb, vec3( 1e-3 ) );
float lumaMean = max( dot( detailMean, lumaWeights ), 1e-3 );
vec3 detailRaw = texture2D( uDetail, vGround / uDetailTile ).rgb;
float breakLuma = dot( texture2D( uDetail, mat2( 0.8, -0.6, 0.6, 0.8 ) * vGround / uBreakTile ).rgb, lumaWeights ) / lumaMean - 1.0;
float height = clamp( 0.5 + ( dot( detailRaw, lumaWeights ) / lumaMean - 1.0 + breakLuma * uBreakAmount ) * uHeightContrast, 0.0, 1.0 );
float w = max( uHeightWidth, 1e-3 );
float reveal = smoothstep( height - w, height + w, mix( -w, 1.0 + w, ramp ) );
outgoingLight *= mix( uMiddle, uEdge, ramp ) * mix( vec3( 1.0 ), detailRaw / detailMean, reveal );
#include <opaque_fragment>`
        );
      blendFog(shader);
    };
    material.customProgramCacheKey = () => 'ground';
    o.material = material;
  });
}
