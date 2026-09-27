import * as THREE from 'three';
import { tween } from '../tweens.js';
import { FX } from '../tokens.js';

const vertexShader = `varying vec3 vNormal;
varying vec3 vView;
void main(){
  vec4 view=modelViewMatrix*vec4(position,1.);
  vNormal=normalize(normalMatrix*normal);
  vView=-view.xyz;
  gl_Position=projectionMatrix*view;
}`;

const fragmentShader = `uniform vec3 uColor;
uniform float uStrength, uPower;
varying vec3 vNormal;
varying vec3 vView;
void main(){
  float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),uPower);
  gl_FragColor=vec4(uColor*rim*uStrength,1.);
  #include <colorspace_fragment>
}`;

export function rimFlash(object) {
  const { color, strength, power, duration, grow } = FX.tapGlow;
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength }, uPower: { value: power } },
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const shells = [];
  object.traverse(o => {
    if (o.isMesh && o.visible) shells.push(o);
  });
  const added = shells.map(mesh => {
    const shell = new THREE.Mesh(mesh.geometry, material);
    shell.scale.setScalar(grow);
    mesh.add(shell);
    return shell;
  });
  tween(
    duration,
    k => (material.uniforms.uStrength.value = strength * (1 - k) ** 2),
    () => {
      added.forEach(shell => shell.removeFromParent());
      material.dispose();
    }
  );
}
