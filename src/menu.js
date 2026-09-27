import { writeText } from './labels.js';
import { MENU } from './tokens.js';

export function showMenu(modes) {
  const menu = document.createElement('div');
  menu.id = 'menu';
  menu.innerHTML = `<div class="sign"><div class="logo"></div></div>${Object.keys(modes)
    .map(
      (mode, i) =>
        `<div class="plank" data-mode="${mode}" style="animation-delay:${0.25 + i * 0.12}s"><div class="fit"><canvas></canvas></div></div>`
    )
    .join('')}`;
  menu.addEventListener('pointerdown', event => {
    const button = event.target.closest('[data-mode]');
    if (!button) return;
    menu.remove();
    modes[button.dataset.mode]();
  });
  document.body.appendChild(menu);
  const buttons = menu.querySelectorAll('.fit');
  buttons.forEach(fit => writeText(fit.firstChild, MENU[fit.parentNode.dataset.mode], fit.offsetHeight * MENU.size));
}
