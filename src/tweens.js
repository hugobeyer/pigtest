const tweens = [];
const bumps = new Map();

export function tween(duration, update, done) {
  tweens.push({ t: 0, duration, update, done });
}

export function bump(object, { amount, duration }) {
  bumps.set(object, { base: bumps.get(object)?.base ?? object.scale.clone(), amount, duration, t: 0 });
}

const easeOut = k => k * (2 - k);

export function slide(object, to, { duration }) {
  const from = object.position.clone();
  tween(duration, k => object.position.lerpVectors(from, to, easeOut(k)));
}

export function grow(object, { duration }) {
  const scale = object.scale.clone();
  object.scale.setScalar(0);
  tween(duration, k => object.scale.copy(scale).multiplyScalar(easeOut(k)));
}

export const backOut = k => 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2;

export function vanish(
  object,
  {
    inflate,
    puff,
    duration,
    distance,
    rise,
    reach,
    wobble,
    wobbles,
    spin,
    tumble,
    squash,
    inflateJiggles,
    deflate,
    shrinkAt,
    popJiggle,
    popJiggleSpeed,
    popJiggleTime
  },
  { target, pop, done, inflating, flying }
) {
  const { x, y, z } = object.position,
    scale = object.scale.clone(),
    turn = object.rotation.z;
  const angle = Math.random() * Math.PI * 2,
    dx = Math.cos(angle),
    dy = Math.sin(angle),
    side = Math.random() < 0.5 ? -1 : 1,
    wave = wobbles * Math.PI * 2;
  const [fx, fy, fz] = target
    ? [(target.x - x) * reach, (target.y - y) * reach, (target.z - z) * reach]
    : [dx * distance, dy * distance, rise];
  tween(
    inflate,
    k => {
      const g = 1 + puff * backOut(k),
        q = Math.sin(k * Math.PI * 2 * inflateJiggles) * squash * (1 - k);
      object.scale.set(scale.x * (g + q), scale.y * (g + q), scale.z * (g - q));
      inflating?.(k);
    },
    () => {
      pop();
      tween(
        duration,
        k => {
          const t = k * k,
            w = Math.sin(k * wave) * wobble * side * (0.3 + k),
            s = (1 + puff) * (1 - deflate * k) * Math.min((1 - k) / (1 - shrinkAt), 1),
            q = Math.sin(k * wave * 2) * squash + Math.sin(k * popJiggleSpeed) * squash * popJiggle * Math.max(1 - k / popJiggleTime, 0);
          object.position.set(x + fx * t - dy * w, y + fy * t + dx * w, z + fz * t);
          object.rotation.set(Math.sin(k * wave * 0.7) * tumble, Math.sin(k * wave * 0.5) * tumble, turn + side * spin * t);
          object.scale.set(scale.x * s * (1 + q), scale.y * s * (1 + q), scale.z * s * (1 - q));
          flying?.(k);
        },
        done
      );
    }
  );
}

export function clearTweens() {
  tweens.length = 0;
  for (const [object, b] of bumps) object.scale.copy(b.base);
  bumps.clear();
}

export function updateTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const t = tweens[i];
    t.t += dt;
    const k = Math.min(t.t / t.duration, 1);
    t.update?.(k);
    if (k >= 1) {
      tweens.splice(i, 1);
      t.done?.();
    }
  }
  for (const [object, b] of bumps) {
    b.t += dt;
    const k = Math.min(b.t / b.duration, 1);
    object.scale.copy(b.base).multiplyScalar(1 + Math.sin(k * Math.PI) * b.amount);
    if (k >= 1) bumps.delete(object);
  }
}
