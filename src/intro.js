import { writeText } from './labels.js';
import { INTRO } from './tokens.js';

export function showIntro(text = INTRO.text) {
  const banner = document.createElement('div');
  banner.id = 'intro';
  banner.style.top = INTRO.top;
  banner.innerHTML = '<div class="fit"><canvas></canvas></div>';
  document.body.appendChild(banner);
  const fit = banner.firstChild;
  writeText(fit.firstChild, text, fit.offsetHeight * INTRO.size);
  addEventListener(
    'pointerdown',
    () => {
      banner.classList.add('out');
      banner.addEventListener('animationend', event => {
        if (event.animationName === 'intro-out') banner.remove();
      });
    },
    { capture: true, once: true }
  );
}
