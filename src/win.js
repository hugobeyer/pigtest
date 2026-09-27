import { writeText } from './labels.js';
import { MENU, WIN } from './tokens.js';

const format = { time: value => `${value}s` };

export function showWin(stats, { title = WIN.title, heading = WIN.heading, hint = WIN.hint, rows = WIN.stats, onTap, onMenu } = {}) {
  const panel = document.createElement('div');
  panel.id = 'win';
  panel.style.setProperty('--bump-in', `${WIN.bumpIn}s`);
  panel.style.setProperty('--swing', `${WIN.swing}s`);
  panel.style.setProperty('--swing-angle', `${WIN.swingAngle}deg`);
  panel.innerHTML = `<div class="sign"><div class="fit"><canvas></canvas></div></div><div class="card"><div class="fit top"><canvas></canvas></div><ul>${rows
    .map(
      ([key, label], i) =>
        `<li style="animation-delay:${WIN.bumpIn * 1.4 + i * WIN.rowStagger}s"><canvas data-label="${label}"></canvas><canvas class="value" data-key="${key}"></canvas></li>`
    )
    .join(
      ''
    )}</ul><div class="fit bottom"><canvas></canvas></div></div>${onMenu ? '<div class="plank small" data-menu><div class="fit"><canvas></canvas></div></div>' : ''}`;
  panel.addEventListener('pointerdown', event => {
    panel.remove();
    event.target.closest('[data-menu]') ? onMenu() : onTap?.();
  });
  document.body.appendChild(panel);
  const [sign, top, bottom, menu] = panel.querySelectorAll('.fit'),
    row = panel.querySelector('ul').offsetHeight / rows.length;
  writeText(sign.firstChild, title, sign.offsetHeight * WIN.text.sign, WIN.ink);
  writeText(top.firstChild, heading, top.offsetHeight * WIN.text.plank);
  writeText(bottom.firstChild, hint, bottom.offsetHeight * WIN.text.plank);
  if (menu) writeText(menu.firstChild, MENU.back, menu.offsetHeight * MENU.size);
  panel.querySelectorAll('[data-label]').forEach(canvas => writeText(canvas, canvas.dataset.label, row * WIN.text.label, WIN.ink));
  const values = [...panel.querySelectorAll('.value')];
  const start = performance.now() + WIN.bumpIn * 1.4 * 1000;
  const count = now => {
    const k = Math.min(Math.max((now - start) / (WIN.countDuration * 1000), 0), 1),
      eased = 1 - (1 - k) ** 3;
    for (const b of values) {
      const value = Math.round(stats[b.dataset.key] * eased);
      writeText(b, String(format[b.dataset.key]?.(value) ?? value), row * WIN.text.value, WIN.ink);
    }
    if (k < 1 && panel.isConnected) requestAnimationFrame(count);
  };
  requestAnimationFrame(count);
}
