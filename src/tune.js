import { restartLevel } from './gameplay.js';
import { ADVENTURE, ANIM, FX, MOTION, PIGS, SHOT } from './tokens.js';

const roots = { MOTION, SHOT, PIGS, ANIM, FX, ADVENTURE };

const sections = [
  [
    'Pace',
    [
      ['MOTION.speed', 1, 25, 0.1, 'runner speed'],
      ['MOTION.aimTime', 0, 0.3, 0.005, 'turn to shoot (s)'],
      ['SHOT.speed', 2, 40, 0.5, 'bullet speed'],
      ['PIGS.railCapacity', 1, 8, 1, 'rail capacity'],
      ['PIGS.ammo', 1, 60, 1, 'Classic ammo per pig (restart)']
    ]
  ],
  [
    'Tap & queue',
    [
      ['ANIM.tapOut.amount', 0, 1, 0.01, 'tap bump size'],
      ['ANIM.tapOut.bump', 0.005, 0.3, 0.005, 'tap bump time'],
      ['ANIM.tapOut.shrink', 0.01, 0.5, 0.01, 'tap shrink time'],
      ['ANIM.queueSlide.duration', 0.02, 0.6, 0.01, 'queue slide time'],
      ['ANIM.queueGrow.duration', 0.02, 0.6, 0.01, 'new pig grow time'],
      ['PIGS.rowGap', 0.5, 2, 0.01, 'row spacing (restart)'],
      ['PIGS.hitScale', 1, 3, 0.05, 'tap area width (restart)'],
      ['ANIM.refuse.angle', 0, 1, 0.01, 'refuse shake']
    ]
  ],
  [
    'Runner',
    [
      ['ANIM.enterBump.amount', 0, 1, 0.01, 'enter bump'],
      ['ANIM.shotBump.amount', 0, 0.6, 0.01, 'shot bump'],
      ['FX.runnerBob.height', 0, 0.5, 0.01, 'bob height'],
      ['FX.runnerBob.speed', 0, 30, 0.1, 'bob speed'],
      ['FX.runnerBob.shooting', 0, 1, 0.01, 'bob while shooting'],
      ['FX.recoil.distance', 0, 0.6, 0.01, 'recoil push'],
      ['FX.recoil.kick', 0, 1, 0.01, 'recoil tilt'],
      ['FX.recoil.decay', 1, 40, 0.5, 'recoil recover'],
      ['FX.heat.max', 0, 1, 0.01, 'heat redness'],
      ['FX.heat.emissive', 0, 1, 0.01, 'heat glow'],
      ['FX.burn.emissive', 0, 4, 0.05, 'burn glow'],
      ['FX.burn.tint', 0, 1, 0.01, 'burn yellow'],
      ['FX.burn.cool', 0.05, 1, 0.01, 'burn cool-down'],
      ['FX.numberPunch.amount', 0, 1, 0.01, 'ammo number punch']
    ]
  ],
  [
    'Idle',
    [
      ['FX.idleBob.height', 0, 0.5, 0.01, 'front hop'],
      ['FX.queueSway.tilt', 0, 0.3, 0.005, 'queue sway'],
      ['FX.idleHint.after', 0, 20, 0.5, 'hint after (s)'],
      ['FX.idleHint.every', 0.5, 10, 0.1, 'hint every (s)'],
      ['FX.idleHint.huh.hold', 0, 2, 0.05, 'huh freeze (s)']
    ]
  ],
  [
    'Hits',
    [
      ['FX.blockPop.amount', 0, 1, 0.01, 'block bump'],
      ['FX.blockPop.time', 0.01, 0.3, 0.005, 'block bump time'],
      ['FX.blockFlash.strength', 0, 5, 0.05, 'flash'],
      ['FX.ghost.tall', 1, 10, 0.1, 'flare height'],
      ['FX.ghost.tallMax', 1, 20, 0.1, 'flare height at streak'],
      ['FX.ghost.tallAt', 1, 60, 1, 'streak hits for max'],
      ['FX.ghost.life', 0.05, 1.5, 0.01, 'flare life (s)'],
      ['FX.ghost.glow', 0, 10, 0.1, 'flare glow'],
      ['FX.ramp.step', 0, 0.5, 0.01, 'colour step per hit'],
      ['FX.trail.length', 0, 5, 0.05, 'trail length'],
      ['FX.shake.amplitude', 0, 0.3, 0.005, 'line clear shake']
    ]
  ],
  [
    'Pig exit',
    [
      ['ANIM.vanish.inflate', 0.02, 0.6, 0.01, 'inflate time'],
      ['ANIM.vanish.puff', 0, 1, 0.01, 'inflate size'],
      ['ANIM.vanish.duration', 0.2, 3, 0.05, 'fly time'],
      ['ANIM.vanish.distance', 0, 30, 0.5, 'fly distance'],
      ['ANIM.vanish.toCamera', 0, 1, 0.05, 'to camera chance']
    ]
  ],
  [
    'Combo & chains',
    [
      ['FX.combo.every', 5, 100, 1, 'word every N hits'],
      ['ADVENTURE.chain.delay', 0.02, 0.5, 0.01, 'chain step delay'],
      ['ADVENTURE.chain.pitch', 0, 0.3, 0.01, 'chain pitch rise'],
      ['ADVENTURE.rainbow.duration', 0.5, 10, 0.1, 'rainbow time (s)'],
      ['ADVENTURE.wipe.sweep', 0, 0.2, 0.005, 'wipe sweep']
    ]
  ]
];

function resolve(path) {
  const keys = path.split('.'),
    key = keys.pop();
  return [keys.reduce((object, name) => object[name], roots), key];
}

function values() {
  const out = {};
  for (const [, rows] of sections)
    for (const [path] of rows) {
      const keys = path.split('.'),
        [object, key] = resolve(path);
      let target = out;
      for (const name of keys.slice(0, -1)) target = target[name] ??= {};
      target[key] = object[key];
    }
  return out;
}

export function tunePanel(folder) {
  for (const [title, rows] of sections) {
    const section = folder.addFolder(title).close();
    for (const [path, min, max, step, label] of rows) {
      const [object, key] = resolve(path);
      section.add(object, key, min, max, step).name(label);
    }
  }
  folder.add({ restart: restartLevel }, 'restart').name('↻ restart level');
  folder.add({ save: () => fetch('/__feel', { method: 'POST', body: JSON.stringify(values()) }) }, 'save').name('Save to feel.json');
  folder.add({ copy: () => navigator.clipboard.writeText(JSON.stringify(values(), null, 2)) }, 'copy').name('Copy JSON');
}
