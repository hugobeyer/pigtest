import * as THREE from 'three';
import { PATH } from './tokens.js';

export const PIG_COLUMNS=4;

const COLORS={
  pigLight:0xf2f1e9,
  pigDark:0x45485a,

  bulletLight:0xffffff,
  bulletDark:0x303344,
  blockLight:0xe8e5dc,
  blockDark:0x44475a,
  rail:0x33384a,
  backdrop:0x505471
};

function makeMesh(geometry, material, position) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makePig(color) {
  const group = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color, roughness: 0.82 });
  group.add(makeMesh(new THREE.BoxGeometry(0.86, 0.7, 0.64), body, [0, 0, 0.42]));
  return group;
}

function makeBlock(color) {
  return makeMesh(
    new THREE.BoxGeometry(0.3, 0.3, 0.84),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
    [0, 0, 0.432]
  );
}

function makeAnchor(root, name, x, y, z = 0) {
  const object = new THREE.Object3D();
  object.name = name;
  object.position.set(x, y, z);
  root.add(object);
  return object;
}

function makeRail(root, left, right, bottom, top, radius) {
  const points = [];
  const corners = [
    [right - radius, bottom + radius, -Math.PI / 2],
    [right - radius, top - radius, 0],
    [left + radius, top - radius, Math.PI / 2],
    [left + radius, bottom + radius, Math.PI]
  ];
  for (const [x, y, start] of corners) {
    for (let i = 0; i <= 8; i++) {
      const angle = start + (Math.PI / 2) * (i / 8);
      points.push(new THREE.Vector3(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, -0.22));
    }
  }
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  const rail = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 192, 0.12, 8, true),
    new THREE.MeshStandardMaterial({ color: COLORS.rail, roughness: 0.85 })
  );
  rail.name = 'Primitive_Rail';
  rail.receiveShadow = true;
  root.add(rail);
}

export function materialOf(object) {
  let material = null;
  object.traverse(o => {
    if (!material && o.isMesh) material = o.material;
  });
  return material;
}

export function instantiate(template) {
  const wrapper = new THREE.Group();
  const body = template.clone(true);
  body.position.set(0, 0, 0);
  body.visible = true;
  body.traverse(object => {
    if (object.isMesh) object.material = object.material.clone();
  });
  wrapper.add(body);
  return wrapper;
}

export async function loadAssets() {
  const root = new THREE.Group();
  root.name = 'PrimitiveScene';

  const rows = 26;
  const columns = 26;
  const step = 0.322;
  const gridCenter = makeAnchor(root, 'GridCenter', 0, 3.675);
  Object.assign(gridCenter.userData, { rows, columns, step, checker: 2 });

  const gridLeft = -((columns - 1) * step) / 2;
  const gridRight = -gridLeft;
  const gridBottom = 0.25 - ((rows - 1) * step) / 2;
  const gridTop = 0.25 + ((rows - 1) * step) / 2;
  const left = gridLeft - PATH.sideOffset;
  const right = gridRight + PATH.sideOffset;
  const bottom = -2.73;
  const top = gridTop + PATH.verticalOffset;
  makeRail(root, left, right, bottom, top, PATH.cornerRadius);

  const floor = makeMesh(
    new THREE.PlaneGeometry(13, 19),
    new THREE.MeshStandardMaterial({ color: COLORS.backdrop, roughness: 1 }),
    [0, -0.2, -1.2]
  );
  floor.name = 'Primitive_Backdrop';
  root.add(floor);

  const camera = new THREE.PerspectiveCamera(47, 9 / 16, 0.1, 100);
  camera.position.set(0, 0, 21);
  camera.lookAt(0, 0, 0);

  const pigLight = makePig(COLORS.pigLight);
  const pigDark = makePig(COLORS.pigDark);
  const bulletLight = makeMesh(
    new THREE.SphereGeometry(0.12, 10, 8),
    new THREE.MeshStandardMaterial({ color: COLORS.bulletLight, roughness: 0.5 }), [0, 0, 0]
  );
  const bulletDark = makeMesh(
    new THREE.SphereGeometry(0.12, 10, 8),
    new THREE.MeshStandardMaterial({ color: COLORS.bulletDark, roughness: 0.5 }), [0, 0, 0]
  );
  const blocks = { light: makeBlock(COLORS.blockLight), dark: makeBlock(COLORS.blockDark) };

  const queues = ['LDLLDL', 'DLDLDL', 'LDLDLL', 'DLDLLD'];
  const columnX = [-3.25, -1.1, 1.05, 3.2];
  const queueY = -10.2;
  const columnsObjects = columnX.map((x, i) => {
    const column = makeAnchor(root, `PigColumn_${i}`, x, queueY);
    Object.assign(column.userData, { queue: queues[i], row_step: 1.62 });
    return column;
  });
  const railStart = makeAnchor(root, 'Rail_Start', 0, bottom);
  const anchors = {
    RailStart: makeAnchor(root, 'RailStart', -4.125, bottom),
    RailEnd: makeAnchor(root, 'RailEnd', left, -0.45)
  };

  root.updateMatrixWorld(true);
  return {
    root, camera,
    pigs: { light: pigLight, dark: pigDark },
    bullets: { light: bulletLight, dark: bulletDark },
    blocks,
    gridCenter,
    railStart,
    anchors,
    columns: columnsObjects
  };
}
