// Fixed scenes for screenshots and for the finalist review's own photo test.
// ?shot=cover renders one cover full-window; ?shot=editor shows the editor
// with a sample loaded. Query: layout, grade, photo (sample name) or scene,
// title, subtitle, caption, stars, size (square|portrait|wide|story).
import { SCENES } from './render.js';

export const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
  story: [1080, 1920],
};

export async function runShot(shot, query, api) {
  const sizeName = query.get('size') || 'square';
  const [w, h] = SIZES[sizeName] || SIZES.square;
  const layout = query.get('layout') || 'grid6';
  const photo = query.get('photo');
  const photo2 = query.get('photo2');
  const scene = query.get('scene');
  const panels = [];
  const count = 9;
  for (let i = 0; i < count; i++) {
    if (photo && i % 3 === 0) panels.push({ img: photo, ox: 0, oy: 0, zoom: 1 });
    else if (photo2 && i % 3 === 1) panels.push({ img: photo2, ox: 0, oy: 0, zoom: 1 });
    else if (scene) panels.push({ scene, ox: 0, oy: 0, zoom: 1 });
    else panels.push({ scene: SCENES[i % SCENES.length], ox: 0, oy: 0, zoom: 1 });
  }
  if (photo) await api.loadSample(photo);
  if (photo2) await api.loadSample(photo2);
  api.apply({
    layout,
    grade: query.get('grade') || 'vice',
    title: query.get('title') || 'Neon Coast',
    subtitle: query.get('subtitle') || 'vice city nights',
    caption: query.get('caption') || 'Sunset Heist',
    stars: Number(query.get('stars') || 4),
    badge: query.get('badge') || 'NC',
    panels,
    selected: -1,
    showSelection: false,
  }, w, h);
  if (shot === 'cover') document.body.classList.add('shot-cover');
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
