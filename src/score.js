import { writeText } from './labels.js';
import { FX } from './tokens.js';

let element, score = 0;

function ensure() {
  if (element) return;
  element = document.createElement('div');
  element.id = 'score';
  element.innerHTML = '<canvas></canvas>';
  document.body.appendChild(element);
}

export function resetScore() {
  score = 0;
  element?.classList.remove('pop');
}

export function addPoints(blocks) {
  if (blocks <= 0) return;
  ensure();
  score += blocks * FX.score.perBlock;
  writeText(element.firstChild, String(score), FX.score.size);
  element.style.setProperty('--score-time', `${FX.score.duration}s`);
  element.classList.remove('pop');
  void element.offsetWidth;
  element.classList.add('pop');
}
