import * as THREE from 'three';
import { FOG } from './tokens.js';

export const FOG_MODES = ['normal', 'overlay', 'soft light', 'screen', 'multiply'];
export const uniforms = {
  uFogMode: { value: FOG_MODES.indexOf(FOG.mode) },
  uFogBottom: { value: FOG.height.bottom },
  uFogTop: { value: FOG.height.top },
  uFogCurve: { value: FOG.height.curve },
  uFogHeightMix: { value: FOG.height.mix }
};
const line = '\tgl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );';

export function blendFog(shader) {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader =
    'varying float vFogHeight;\n' +
    shader.vertexShader.replace(
      '#include <fog_vertex>',
      `#include <fog_vertex>
#ifdef USE_INSTANCING
vFogHeight = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).z;
#else
vFogHeight = ( modelMatrix * vec4( transformed, 1.0 ) ).z;
#endif`
    );
  shader.fragmentShader =
    'uniform float uFogMode, uFogBottom, uFogTop, uFogCurve, uFogHeightMix;\nvarying float vFogHeight;\n' +
    shader.fragmentShader.replace(
      '#include <fog_fragment>',
      THREE.ShaderChunk.fog_fragment.replace(
        line,
        `\tfogFactor *= mix( 1.0, pow( 1.0 - smoothstep( min( uFogBottom, uFogTop ), max( uFogBottom, uFogTop ) + 1e-3, vFogHeight ), uFogCurve ), uFogHeightMix );
\t#ifndef FOG_MODE
\t\t#define FOG_MODE uFogMode
\t#endif
\tvec3 fogBase = gl_FragColor.rgb;
\tvec3 fogTone = sRGBTransferOETF( vec4( fogColor, 1.0 ) ).rgb;
\tvec3 fogBlend = fogColor;
\tif ( FOG_MODE > 3.5 ) fogBlend = fogBase * fogTone;
\telse if ( FOG_MODE > 2.5 ) fogBlend = 1.0 - ( 1.0 - fogBase ) * ( 1.0 - fogTone );
\telse if ( FOG_MODE > 1.5 ) fogBlend = ( 1.0 - 2.0 * fogTone ) * fogBase * fogBase + 2.0 * fogTone * fogBase;
\telse if ( FOG_MODE > 0.5 ) fogBlend = mix( 2.0 * fogBase * fogTone, 1.0 - 2.0 * ( 1.0 - fogBase ) * ( 1.0 - fogTone ), step( 0.5, fogBase ) );
\tgl_FragColor.rgb = mix( fogBase, fogBlend, fogFactor );`
      )
    );
}
