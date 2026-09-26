import * as THREE from 'three';
import {FOG} from './tokens.js';

export const FOG_MODES=['normal','overlay','soft light','screen','multiply'];
export const uniforms={uFogMode:{value:FOG_MODES.indexOf(FOG.mode)}};
const line='\tgl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );';

export function blendFog(shader){
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader='uniform float uFogMode;\n'+shader.fragmentShader.replace('#include <fog_fragment>',THREE.ShaderChunk.fog_fragment.replace(line,`\t#ifndef FOG_MODE
\t\t#define FOG_MODE uFogMode
\t#endif
\tvec3 fogBase = gl_FragColor.rgb;
\tvec3 fogTone = sRGBTransferOETF( vec4( fogColor, 1.0 ) ).rgb;
\tvec3 fogBlend = fogColor;
\tif ( FOG_MODE > 3.5 ) fogBlend = fogBase * fogTone;
\telse if ( FOG_MODE > 2.5 ) fogBlend = 1.0 - ( 1.0 - fogBase ) * ( 1.0 - fogTone );
\telse if ( FOG_MODE > 1.5 ) fogBlend = ( 1.0 - 2.0 * fogTone ) * fogBase * fogBase + 2.0 * fogTone * fogBase;
\telse if ( FOG_MODE > 0.5 ) fogBlend = mix( 2.0 * fogBase * fogTone, 1.0 - 2.0 * ( 1.0 - fogBase ) * ( 1.0 - fogTone ), step( 0.5, fogBase ) );
\tgl_FragColor.rgb = mix( fogBase, fogBlend, fogFactor );`));
}
