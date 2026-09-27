import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { prepareEnvironment } from './environment.js';
import { vignette } from './ground.js';
import { shadeGameplay } from './shading.js';
import { GROUND, PIGS, RENDER } from './tokens.js';

function allows(object, key) {
  for (let o = object; o; o = o.parent) if (o.userData[key] !== undefined) return !!o.userData[key];
  return true;
}

function requireObject(root, name) {
  const object = root.getObjectByName(name);
  if (!object) throw new Error(`Missing Blender object: ${name}`);
  return object;
}

export function instantiate(template) {
  const wrapper = new THREE.Group(),
    body = template.clone();
  template.matrixWorld.decompose(body.position, body.quaternion, body.scale);
  body.position.set(0, 0, 0);
  body.visible = true;
  wrapper.add(body);
  return wrapper;
}

export async function loadAssets(url) {
  const root = (await new GLTFLoader().loadAsync(url)).scene;
  root.rotation.x = Math.PI * 0.5;
  root.updateMatrixWorld(true);
  const lights = [];
  root.traverse(object => {
    if (object.isMesh) {
      object.castShadow = allows(object, 'cast_shadow');
      object.receiveShadow = allows(object, 'receive_shadow');
      for (const material of [object.material].flat())
        for (const key of ['map', 'normalMap', 'roughnessMap']) if (material[key]) material[key].anisotropy = RENDER.anisotropy;
    }
    if (object.isLight) lights.push(object);
  });
  lights.forEach(light => light.parent.remove(light));
  const ground = root.getObjectByName(GROUND.name);
  if (ground) ground.userData.environment = true;
  prepareEnvironment(root, ground);
  if (ground) vignette(ground, requireObject(root, 'CameraTarget').getWorldPosition(new THREE.Vector3()));
  shadeGameplay(root);
  requireObject(root, 'CameraTarget');
  const camera = root.getObjectByProperty('isPerspectiveCamera', true);
  if (!camera) throw new Error('Missing Blender perspective camera');
  const [pigLight, pigDark, bulletLight, bulletDark, light, dark] = [
    'Pig_Light',
    'Pig_Dark',
    'Bullet_Light',
    'Bullet_Dark',
    'Grid_Block_Light',
    'Grid_Block_Dark'
  ].map(name => {
    const object = requireObject(root, name);
    object.visible = false;
    return object;
  });
  return {
    root,
    camera,
    pigs: { light: pigLight, dark: pigDark },
    bullets: { light: bulletLight, dark: bulletDark },
    blocks: { light, dark },
    gridCenter: requireObject(root, 'GridCenter'),
    anchors: { RailStart: requireObject(root, 'RailStart'), RailEnd: requireObject(root, 'RailEnd') },
    columns: Array.from({ length: PIGS.columns }, (_, i) => requireObject(root, `PigColumn_${i}`))
  };
}
