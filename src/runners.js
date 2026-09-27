import * as THREE from 'three';
import { instantiate } from './assets.js';
import { createLabel, disposeLabel } from './labels.js';
import { validTarget } from './grid.js';
import { fireShot } from './shots.js';
import { rampColor } from './fx/ramp.js';
import { bump, vanish } from './tweens.js';
import { emit } from './fx/particles.js';
import { popup } from './fx/popups.js';
import { sparkle } from './fx/sparkles.js';
import { play } from './sfx.js';
import { ADVENTURE, ANIM, FX, LABEL, MOTION, SHOT } from './tokens.js';

let scene,
  path,
  bullets,
  pigHeight,
  labelLift,
  eye,
  lastWord = null;
export const runs = [];
export const runStats = { shots: 0, bestCombo: 0 };
const mouthLocal = new THREE.Vector3(...SHOT.mouth);

export function initRunners(targetScene, templates, bulletTemplates, runnerPath, camera) {
  scene = targetScene;
  runs.length = 0;
  Object.assign(runStats, { shots: 0, bestCombo: 0 });
  lastWord = null;
  eye = camera.getWorldPosition(new THREE.Vector3());
  bullets = bulletTemplates;
  path = runnerPath;
  const box = new THREE.Box3().setFromObject(templates.dark, true);
  pigHeight = box.max.z - box.min.z;
  labelLift = pigHeight + LABEL.lift;
}

function spawn(template) {
  const runner = new THREE.Group(),
    pop = instantiate(template);
  runner.add(pop);
  const label = createLabel(runner);
  label.position.z = labelLift;
  runner.position.copy(path.entry);
  runner.rotation.z = path.nodes[0].travelFace;
  scene.add(runner);
  bump(pop, ANIM.enterBump);
  return { runner, pop, label };
}

export function launchRunner({ template, ammo, isLight }) {
  const parts = spawn(template);
  parts.label.userData.set(String(ammo));
  runs.push({
    ...parts,
    bullet: isLight ? bullets.light : bullets.dark,
    ammo,
    isLight,
    nodeIndex: 0,
    phase: 'move',
    from: path.entry.clone(),
    to: path.entry.clone(),
    stepT: 1,
    stepDuration: 0,
    fromRot: path.nodes[0].travelFace,
    toRot: path.nodes[0].travelFace,
    targetCell: null,
    activeNode: null,
    turnT: 0,
    engaged: false,
    t: 0,
    lastShot: -1,
    calm: 1
  });
}

function fire(run) {
  const cell = run.targetCell;
  run.targetCell = null;
  if (!cell || !cell.alive) return;
  const color = run.rainbow > 0 ? new THREE.Color().setHSL((run.t * ADVENTURE.rainbow.cycle) % 1, 1, 0.6) : rampColor(run.hits ?? 0);
  fireShot(scene, run.runner.localToWorld(mouthLocal.clone()), cell, run.bullet, color, run.hits ?? 0, run);
  play('shot');
  run.label.userData.set(String(--run.ammo));
  bump(run.pop, ANIM.shotBump);
  run.lastShot = run.t;
  run.recoil = 1;
  bump(run.label, FX.numberPunch);
  run.hits = (run.hits ?? 0) + 1;
  runStats.shots++;
  runStats.bestCombo = Math.max(runStats.bestCombo, run.hits);
  if (runStats.shots % FX.combo.every === 0) {
    const words = FX.combo.words.filter(word => word !== lastWord);
    lastWord = words[Math.floor(Math.random() * words.length)];
    popup(lastWord, run.runner.position);
  }
}

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function beginStep(run) {
  if (run.nodeIndex >= path.nodes.length) return false;
  const n = path.nodes[run.nodeIndex];
  run.activeNode = n;
  run.phase = 'move';
  run.from = run.runner.position.clone();
  run.to = new THREE.Vector3(n.x, n.y, path.entry.z);
  run.stepT = 0;
  run.stepDuration = run.from.distanceTo(run.to) / MOTION.speed;
  run.fromRot = run.runner.rotation.z;
  run.toRot = run.engaged ? n.travelFace + Math.PI * 0.5 : n.travelFace;
  return true;
}

function advance(run) {
  run.nodeIndex++;
  if (run.ammo <= 0 || run.nodeIndex >= path.nodes.length) {
    run.label.visible = false;
    vanish(run.runner, ANIM.vanish, {
      target: Math.random() < ANIM.vanish.toCamera ? eye : null,
      pop: () => {
        const center = run.runner.position.clone().setZ(run.runner.position.z + pigHeight * 0.5);
        emit(center, run.isLight, FX.death);
        sparkle(center, 'pop');
        play('pop');
        play('fly');
      },
      done: () => {
        scene.remove(run.runner);
        disposeLabel(run.label);
      }
    });
    return true;
  }
  beginStep(run);
  return false;
}

function finishNode(run) {
  const node = run.activeNode;
  if (node.canShoot) {
    const cell = validTarget(run.rainbow > 0 ? null : run.isLight, node);
    if (cell) {
      cell.reserved = true;
      run.targetCell = cell;
      if (!run.engaged) {
        run.phase = 'aimIn';
        run.turnT = 0;
        run.fromRot = run.runner.rotation.z;
        run.toRot = node.shootFace;
        return false;
      }
      fire(run);
    }
  }
  return advance(run);
}

function updateRun(run, dt) {
  if (run.phase === 'move') {
    if (run.stepT >= 1 && !beginStep(run)) return true;
    run.stepT += dt / run.stepDuration;
    const k = Math.min(run.stepT, 1);
    run.runner.position.lerpVectors(run.from, run.to, k);
    run.runner.rotation.z = angleLerp(run.fromRot, run.toRot, k);
    return k >= 1 ? finishNode(run) : false;
  }
  if (run.phase === 'aimIn') {
    run.turnT += dt / MOTION.aimTime;
    const k = Math.min(run.turnT, 1);
    run.runner.rotation.z = angleLerp(run.fromRot, run.toRot, k);
    if (k >= 1) {
      run.engaged = true;
      fire(run);
      return advance(run);
    }
  }
  return false;
}

export function updateRunners(dt) {
  const { height, speed, tilt, hold, settle, shooting } = FX.runnerBob,
    { distance, kick, decay } = FX.recoil;
  for (let i = runs.length - 1; i >= 0; i--) {
    const run = runs[i];
    if (updateRun(run, dt)) {
      runs.splice(i, 1);
      continue;
    }
    run.t += dt;
    if (run.rainbow > 0) run.rainbow -= dt;
    run.calm = Math.min(Math.max(run.calm + (run.t - run.lastShot < hold ? -dt : dt) / settle, 0), 1);
    run.recoil = (run.recoil ?? 0) * Math.exp(-decay * dt);
    const t = run.t * speed,
      a = shooting + (1 - shooting) * run.calm,
      r = run.recoil;
    run.pop.position.set(0, -distance * r, height * a * (0.5 + 0.5 * Math.sin(t)));
    run.pop.rotation.set(Math.cos(t * 0.5) * tilt * a + kick * r, Math.sin(t * 0.75) * tilt * a, 0);
  }
}
