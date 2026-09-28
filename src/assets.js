import * as THREE from 'three';
import { PATH, PIGS } from './tokens.js';

export const PIG_COLUMNS=4;

const PIG_BOX={x:1.5,y:1.5,z:1};
const PIG_SLOT={x:1.65,y:1.65,z:.25};
const boxGeometry=new THREE.BoxGeometry(1,1,1);

const COLORS={
  pigLight:0xf2f1e9,
  pigDark:0x45485a,

  bulletLight:0xffffff,
  bulletDark:0x303344,
  blockLight:0xe8e5dc,
  blockDark:0x44475a,
  rail:0x33384a,
  slot:0x41455f,
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
  const mesh=makeMesh(boxGeometry,body,[0,0,PIG_BOX.z*.5+.012]);
  mesh.scale.set(PIG_BOX.x,PIG_BOX.y,PIG_BOX.z);
  group.add(mesh);
  return group;
}

function makeBlock(color) {
  const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.84);
  geometry.translate(0, 0, 0.432);
  return makeMesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }), [0, 0, 0]);
}

function makeAnchor(root, name, x, y, z = 0) {
  const object = new THREE.Object3D();
  object.name = name;
  object.position.set(x, y, z);
  root.add(object);
  return object;
}

function makeRail(root, left, right, bottom, top, radius, startX, endY) {
  const points = [new THREE.Vector3(startX, bottom, 0.2), new THREE.Vector3(right - radius, bottom, 0.2)];
  const corners = [
    [right - radius, bottom + radius, -Math.PI / 2],
    [right - radius, top - radius, 0],
    [left + radius, top - radius, Math.PI / 2]
  ];
  for (const [x, y, start] of corners) {
    for (let i = 1; i <= 12; i++) {
      const angle = start + (Math.PI / 2) * (i / 12);
      points.push(new THREE.Vector3(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 0.2));
    }
    if (x === right - radius && y === bottom + radius) points.push(new THREE.Vector3(right, top - radius, 0.2));
    if (x === right - radius && y === top - radius) points.push(new THREE.Vector3(left + radius, top, 0.2));
  }
  points.push(new THREE.Vector3(left, endY, 0.2));
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const profile = new THREE.Shape();
  profile.moveTo(-0.17, -0.54);
  profile.lineTo(0.17, -0.54);
  profile.lineTo(0.17, 0.54);
  profile.lineTo(-0.17, 0.54);
  profile.closePath();
  const geometry = new THREE.ExtrudeGeometry(profile, { steps: 320, bevelEnabled: false, extrudePath: curve });
  geometry.computeBoundingBox();
  const height = geometry.boundingBox.max.z - geometry.boundingBox.min.z;
  geometry.translate(0, 0, -geometry.boundingBox.min.z);
  geometry.scale(1, 1, 0.38 / height);
  const rail = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: COLORS.rail, roughness: 0.23, metalness: 0.15 }));
  rail.position.z = 0.012;
  rail.name = 'Primitive_Rail';
  rail.castShadow = rail.receiveShadow = true;
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
  const gridBottom = gridCenter.position.y - ((rows - 1) * step) / 2;
  const gridTop = gridCenter.position.y + ((rows - 1) * step) / 2;
  const left = gridLeft - PATH.sideOffset;
  const right = gridRight + PATH.sideOffset;
  const bottom = gridBottom - PATH.verticalOffset;
  const top = gridTop + PATH.verticalOffset;
  const startX = gridLeft - 0.1;
  const endY = gridBottom - 0.1;
  makeRail(root, left, right, bottom, top, PATH.cornerRadius, startX, endY);

  const floor = makeMesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: COLORS.backdrop, roughness: 1 }),
    [0, 0, 0]
  );
  floor.name = 'Primitive_Backdrop';
  floor.castShadow = false;
  root.add(floor);

  const halfHeight = 23.4 / 2;
  const camera = new THREE.OrthographicCamera(-halfHeight * 9 / 16, halfHeight * 9 / 16, halfHeight, -halfHeight, 0.1, 100);
  camera.position.set(0, -10.017, 14.591);
  camera.lookAt(0, 0.4, 0);

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
  const slotMaterial = new THREE.MeshStandardMaterial({ color: COLORS.slot, roughness: 0.8 });
  const slots = new THREE.InstancedMesh(boxGeometry,slotMaterial,PIGS.railCapacity);
  slots.name = 'Slots';
  slots.castShadow=slots.receiveShadow=true;
  const slotY = (bottom + queueY) / 2;
  const slotStep = (gridRight - gridLeft) / (PIGS.railCapacity - 1);
  const matrix=new THREE.Matrix4().makeScale(PIG_SLOT.x,PIG_SLOT.y,PIG_SLOT.z);
  for (let i = 0; i < PIGS.railCapacity; i++) {
    matrix.setPosition(gridLeft+i*slotStep,slotY,0);
    slots.setMatrixAt(i,matrix);
  }
  slots.computeBoundingSphere();
  root.add(slots);
  const anchors = {
    RailStart: makeAnchor(root, 'RailStart', startX, bottom),
    RailEnd: makeAnchor(root, 'RailEnd', left, endY)
  };

  root.updateMatrixWorld(true);
  return {
    root, camera,
    pigs: { light: pigLight, dark: pigDark },
    bullets: { light: bulletLight, dark: bulletDark },
    blocks,
    gridCenter,
    anchors,
    columns: columnsObjects
  };
}
