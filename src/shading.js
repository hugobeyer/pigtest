import * as THREE from 'three';
import { blendFog } from './fog.js';
import { uniforms as vignette } from './ground.js';
import { ENVIRONMENT, SHADING } from './tokens.js';

export const sheenColor = ({ hue, saturation }, color = new THREE.Color()) => color.setHSL(hue / 360, 1, 1 - saturation / 2);

const CHARACTERS = new Set(['Pig_Light', 'Pig_Dark', 'Bullet_Light', 'Bullet_Dark', 'Grid_Block_Light', 'Grid_Block_Dark']);

function isCharacter(object) {
  for (let o = object; o; o = o.parent) if (CHARACTERS.has(o.name)) return true;
  return false;
}

const converted = { character: new Map(), scenery: new Map() };
export const uniforms = {
  uTerminator: { value: SHADING.terminator },
  uSoftness: { value: SHADING.softness },
  uDarkColor: { value: new THREE.Color(SHADING.darkColor) },
  uSceneryTerminator: { value: ENVIRONMENT.terminator },
  uScenerySoftness: { value: ENVIRONMENT.softness },
  uSceneryDarkColor: { value: new THREE.Color(ENVIRONMENT.darkColor) },
  uSceneryDetail: { value: ENVIRONMENT.detail },
  uSssStrength: { value: SHADING.sss.strength },
  uSssWidth: { value: SHADING.sss.width },
  uRimColor: { value: new THREE.Color(SHADING.rim.color) },
  uRimStrength: { value: SHADING.rim.strength },
  uRimPower: { value: SHADING.rim.power },
  uOutlineColor: { value: new THREE.Color(SHADING.outline.color) },
  uOutlineFrom: { value: SHADING.outline.from },
  uOutlineStrength: { value: SHADING.outline.strength },
  uSheenStrength: { value: ENVIRONMENT.sheen.strength },
  uSheenPower: { value: ENVIRONMENT.sheen.power },
  uSheenColor: { value: sheenColor(ENVIRONMENT.sheen) },
  uSheenAlbedo: { value: ENVIRONMENT.sheen.albedo }
};
const diffuse = '\treflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );';
const specular = '\treflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;';

function patch(shader) {
  Object.assign(shader.uniforms, uniforms, vignette);
  shader.vertexShader =
    `varying vec2 vVignette;
#ifdef BLOCK_FLASH
attribute vec3 aFlash;
varying vec3 vFlash;
#endif
` +
    shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
#ifdef BLOCK_FLASH
vFlash = aFlash;
#endif
#ifdef USE_INSTANCING
vVignette = ( modelMatrix * instanceMatrix * vec4( transformed, 1.0 ) ).xy;
#else
vVignette = ( modelMatrix * vec4( transformed, 1.0 ) ).xy;
#endif`
    );
  shader.fragmentShader =
    `#ifdef TOON_CHARACTER
#define FOG_MODE 0.0
#endif
varying vec2 vVignette;
#ifdef BLOCK_FLASH
varying vec3 vFlash;
#endif
vec3 baseNormal;
uniform vec2 uCenter, uOffset, uRadius;
uniform float uInner, uOuter, uSceneryVignette, uCharacterVignette;
uniform vec3 uMiddle, uEdge;
uniform float uTerminator, uSoftness, uSceneryTerminator, uScenerySoftness, uSceneryDetail, uSssStrength, uSssWidth, uSheenStrength, uSheenPower, uSheenAlbedo, uRimStrength, uRimPower, uOutlineFrom, uOutlineStrength;
uniform vec3 uDarkColor, uSceneryDarkColor, uRimColor, uOutlineColor, uSheenColor;
` +
    shader.fragmentShader
      .replace(
        '#include <lights_physical_pars_fragment>',
        THREE.ShaderChunk.lights_physical_pars_fragment
          .replace(
            specular,
            `\t#ifdef TOON_CHARACTER
${specular}
\t#else
\t\tvec3 hue = material.diffuseContribution / max( max3( material.diffuseContribution ), 1e-3 );
\t\tfloat sheen = pow( saturate( dot( geometryNormal, normalize( directLight.direction + geometryViewDir ) ) ), uSheenPower ) * dotNL;
\t\treflectedLight.directSpecular += directLight.color * uSheenColor * mix( vec3( 1.0 ), hue, uSheenAlbedo ) * uSheenStrength * sheen;
\t#endif`
          )
          .replace(
            diffuse,
            `\tfloat nl = dot( geometryNormal, directLight.direction );
\t#ifdef TOON_CHARACTER
\t\tfloat lit = smoothstep( uTerminator - uSoftness, uTerminator + uSoftness, nl );
\t\tvec3 dark = uDarkColor;
\t\tfloat band = 1.0 - smoothstep( 0.0, uSssWidth, abs( nl - uTerminator ) );
\t#else
\t\tfloat lit = smoothstep( uSceneryTerminator - uScenerySoftness, uSceneryTerminator + uScenerySoftness, nl );
\t\tvec3 dark = uSceneryDarkColor;
\t\tfloat band = 0.0;
\t\tlit *= clamp( 1.0 + uSceneryDetail * ( nl - dot( baseNormal, directLight.direction ) ), 0.0, 2.0 );
\t#endif
\t#if NUM_DIR_LIGHTS > 0
\t\tvec3 lightColor = directionalLights[ 0 ].color;
\t#else
\t\tvec3 lightColor = directLight.color;
\t#endif
\tvec3 unshadowed = directLight.color / max( lightColor, vec3( 1e-4 ) );
\t#if NUM_HEMI_LIGHTS > 0
\t\tvec3 sky = hemisphereLights[ 0 ].skyColor;
\t#else
\t\tvec3 sky = vec3( 1.0 );
\t#endif
\treflectedLight.directDiffuse += lightColor * mix( dark, vec3( 1.0 ), lit * unshadowed ) * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - F );
\t#ifdef TOON_CHARACTER
\t\treflectedLight.directDiffuse += directLight.color * BRDF_Lambert( material.diffuseContribution ) * sky * uSssStrength * band;
\t#endif`
          )
      )
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nbaseNormal = normal;')
      .replace(
        '#include <opaque_fragment>',
        `#ifdef TOON_CHARACTER
float facing = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );
#if NUM_DIR_LIGHTS > 0
outgoingLight += uRimColor * uRimStrength * saturate( 0.5 - 0.5 * dot( normal, directionalLights[ 0 ].direction ) ) * pow( facing, uRimPower );
#endif
outgoingLight = mix( outgoingLight, uOutlineColor, uOutlineStrength * sin( saturate( ( facing - uOutlineFrom ) / ( 1.0 - uOutlineFrom ) ) * PI ) );
#endif
float vignetted = smoothstep( min( uInner, uOuter ), max( uInner, uOuter ) + 1e-3, length( ( vVignette - uCenter - uOffset ) / uRadius ) );
#ifdef TOON_CHARACTER
vignetted *= uCharacterVignette;
#else
vignetted *= uSceneryVignette;
#endif
outgoingLight *= mix( vec3( 1.0 ), clamp( uEdge / max( uMiddle, vec3( 0.05 ) ), 0.0, 1.5 ), vignetted );
#ifdef BLOCK_FLASH
outgoingLight += vFlash;
#endif
#include <opaque_fragment>`
      );
  blendFog(shader);
}

function toon(source, character) {
  const cache = character ? converted.character : converted.scenery;
  if (!cache.has(source)) {
    const material = source.clone();
    material.shadowSide = THREE.DoubleSide;
    if (character) material.defines = { ...material.defines, TOON_CHARACTER: '' };
    material.onBeforeCompile = patch;
    material.customProgramCacheKey = () => (character ? 'toon-character' : 'toon-scenery');
    cache.set(source, material);
  }
  return cache.get(source);
}

export function ownMaterial(source) {
  const material = source.clone();
  material.defines = { ...source.defines };
  material.onBeforeCompile = source.onBeforeCompile;
  material.customProgramCacheKey = source.customProgramCacheKey;
  material.userData.baseColor = source.color.clone();
  material.userData.baseEmissive = source.emissive?.clone();
  return material;
}

export function shadeGameplay(root) {
  root.traverse(o => {
    if (!o.isMesh || o.material.isMeshBasicMaterial || o.material.isShadowMaterial) return;
    const character = isCharacter(o);
    o.material = Array.isArray(o.material) ? o.material.map(m => toon(m, character)) : toon(o.material, character);
  });
}
