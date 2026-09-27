import { sparkle } from './sparkles.js';
import { play } from '../sfx.js';
import { FX } from '../tokens.js';

const images = import.meta.glob('../../assets/words/*.webp', { eager: true, import: 'default' });
let camera;

export const wordImage = name => images[`../../assets/words/${name}.webp`];

export function initPopups(targetCamera) {
  camera = targetCamera;
}

export function popup(name, position) {
  const { width, lift, duration, sweep } = FX.combo;
  const point = position.clone();
  point.z += lift;
  sparkle(point, 'combo');
  play('combo');
  point.project(camera);
  const rect = document.querySelector('#app canvas').getBoundingClientRect();
  const word = document.createElement('div');
  word.className = 'word popup';
  word.style.cssText = `left:${rect.left + (point.x * 0.5 + 0.5) * rect.width}px;top:${rect.top + (0.5 - point.y * 0.5) * rect.height}px;width:${width * rect.width}px;--word:url(${wordImage(name)});--life:${duration}s;--sweep:${sweep}s;--side:${Math.random() < 0.5 ? -1 : 1}`;
  word.addEventListener('animationend', event => {
    if (event.animationName === 'word-life') word.remove();
  });
  document.body.appendChild(word);
}
