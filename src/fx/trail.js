import * as THREE from 'three';
import { FX } from '../tokens.js';

const eye = new THREE.Vector3(),
  tangent = new THREE.Vector3(),
  side = new THREE.Vector3(),
  view = new THREE.Vector3();

export const initTrails = camera => camera.getWorldPosition(eye);

let material;

export function createTrail(from, color) {
  const { segments } = FX.trail,
    count = segments + 1,
    colors = new Float32Array(count * 8),
    index = [];
  for (let i = 0; i < count; i++) {
    const a = 1 - i / segments;
    colors.set([color.r, color.g, color.b, a, color.r, color.g, color.b, a], i * 8);
  }
  for (let i = 0; i < segments; i++) index.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  geometry.setIndex(index);
  material ??= new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: FX.trail.opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const trail = new THREE.Mesh(geometry, material);
  trail.frustumCulled = false;
  trail.userData.ownsGeometry = true;
  trail.userData.points = Array.from({ length: count }, () => from.clone());
  return trail;
}

export function updateTrail(trail, head, length) {
  const { points } = trail.userData,
    { headWidth, tailWidth } = FX.trail,
    positions = trail.geometry.attributes.position,
    last = points.length - 1,
    step = length / last;
  points[0].copy(head);
  for (let i = 1; i <= last; i++) {
    const d = points[i].distanceTo(points[i - 1]);
    if (d > step) points[i].lerp(points[i - 1], 1 - step / d);
  }
  for (let i = 0; i <= last; i++) {
    const p = points[i],
      half = (headWidth + ((tailWidth - headWidth) * i) / last) * 0.5;
    tangent.subVectors(points[Math.max(i - 1, 0)], points[Math.min(i + 1, last)]);
    side.crossVectors(tangent, view.subVectors(eye, p)).normalize().multiplyScalar(half);
    positions.setXYZ(i * 2, p.x + side.x, p.y + side.y, p.z + side.z);
    positions.setXYZ(i * 2 + 1, p.x - side.x, p.y - side.y, p.z - side.z);
  }
  positions.needsUpdate = true;
}
