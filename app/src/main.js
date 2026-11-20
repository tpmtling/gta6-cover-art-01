// Neon Coast Cover Studio — the editor.
// State is one plain object; every change pushes a snapshot so undo and redo
// walk the whole cover (layout, grade, lettering and every panel's framing).
import { GRADES, LAYOUTS, SCENES, renderCover } from './render.js';
import { SIZES, runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const images = {}; // key -> HTMLImageElement (a file name or a sample name)
let imageSeq = 0;

const state = {
  layout: 'grid6',
  grade: 'vice',
  title: 'Neon Coast',
  subtitle: 'vice city nights',
  caption: 'Sunset Heist',
  stars: 4,
  badge: 'NC',
  grain: true,
  halftone: true,
  panels: Array.from({ length: 9 }, (_, i) => ({ scene: SCENES[i % SCENES.length], ox: 0, oy: 0, zoom: 1 })),
  selected: 0,
  showSelection: true,
};

const history = [];
let historyAt = -1;
function snapshot() {
  history.length = historyAt + 1;
  history.push(JSON.stringify(state));
  if (history.length > 80) history.shift();
  historyAt = history.length - 1;
}
function restore(json) {
  const next = JSON.parse(json);
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, next);
  syncControls();
  redraw();
}

function redraw() {
  renderCover(canvas, state, images);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSample(name) {
  if (!images[name]) images[name] = await loadImage(`samples/${name}.jpg`);
  return name;
}

function assignPhoto(key) {
  const order = [state.selected, ...state.panels.map((_, i) => i)];
  const seen = new Set();
  for (const i of order) {
    if (seen.has(i)) continue;
    seen.add(i);
    if (i === state.selected || !state.panels[i].img) {
      state.panels[i] = { img: key, ox: 0, oy: 0, zoom: 1 };
      state.selected = i;
      return;
    }
  }
}

// --- Controls -------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const layoutSel = $('layout'), gradeSel = $('grade');
for (const [key, v] of Object.entries(LAYOUTS)) layoutSel.add(new Option(v.label, key));
for (const [key, v] of Object.entries(GRADES)) gradeSel.add(new Option(v.label, key));

function syncControls() {
  layoutSel.value = state.layout;
  gradeSel.value = state.grade;
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('caption').value = state.caption;
  $('stars').value = state.stars;
  $('badge').value = state.badge;
  $('grain').checked = state.grain;
  $('halftone').checked = state.halftone;
  const p = state.panels[state.selected];
  $('zoom').value = p ? (p.zoom || 1) : 1;
}

function bind(id, event, fn) { $(id).addEventListener(event, () => { fn(); snapshot(); redraw(); }); }
bind('layout', 'change', () => { state.layout = layoutSel.value; });
bind('grade', 'change', () => { state.grade = gradeSel.value; });
bind('title', 'input', () => { state.title = $('title').value; });
bind('subtitle', 'input', () => { state.subtitle = $('subtitle').value; });
bind('caption', 'input', () => { state.caption = $('caption').value; });
bind('badge', 'input', () => { state.badge = $('badge').value; });
bind('stars', 'input', () => { state.stars = Number($('stars').value); });
bind('grain', 'change', () => { state.grain = $('grain').checked; });
bind('halftone', 'change', () => { state.halftone = $('halftone').checked; });
$('zoom').addEventListener('input', () => {
  const p = state.panels[state.selected];
  if (p) { p.zoom = Number($('zoom').value); redraw(); }
});
$('zoom').addEventListener('change', snapshot);

$('photos').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const key = `file${++imageSeq}`;
    images[key] = await loadImage(URL.createObjectURL(file));
    assignPhoto(key);
  }
  snapshot(); redraw();
  status.textContent = 'Photos placed — drag a panel to reframe it.';
});
document.querySelectorAll('[data-sample]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    assignPhoto(await loadSample(btn.dataset.sample));
    snapshot(); redraw();
  });
});
$('fillScenes').addEventListener('click', () => {
  state.panels = state.panels.map((p, i) => (p.img ? p : { scene: SCENES[i % SCENES.length], ox: 0, oy: 0, zoom: 1 }));
  snapshot(); redraw();
});
$('shuffleScenes').addEventListener('click', () => {
  const order = [...SCENES].sort(() => 0.5 - (imageSeq = (imageSeq * 9301 + 49297) % 233280) / 233280);
  state.panels = state.panels.map((p, i) => (p.img ? p : { scene: order[i % order.length], ox: 0, oy: 0, zoom: 1 }));
  snapshot(); redraw();
});
$('undo').addEventListener('click', () => { if (historyAt > 0) restore(history[--historyAt]); });
$('redo').addEventListener('click', () => { if (historyAt < history.length - 1) restore(history[++historyAt]); });

// --- Dragging on the cover: pick a panel, drag to reframe ------------------
function panelAt(cx, cy) {
  const rect = canvas.getBoundingClientRect();
  const nx = (cx - rect.left) / rect.width, ny = (cy - rect.top) / rect.height;
  const layout = LAYOUTS[state.layout];
  const artFrac = 1 - layout.titleH;
  const panels = layout.panels();
  for (let i = panels.length - 1; i >= 0; i--) {
    const r = Array.isArray(panels[i]) ? panels[i] : panels[i].rect;
    if (nx >= r[0] && nx <= r[0] + r[2] && ny / artFrac >= r[1] && ny / artFrac <= r[1] + r[3]) return i;
  }
  return -1;
}
let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  state.selected = i;
  syncControls();
  drag = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = state.panels[state.selected];
  if (!p) return;
  const rect = canvas.getBoundingClientRect();
  p.ox = Math.max(-0.6, Math.min(0.6, (p.ox || 0) + (e.clientX - drag.x) / rect.width));
  p.oy = Math.max(-0.6, Math.min(0.6, (p.oy || 0) + (e.clientY - drag.y) / rect.height));
  drag = { x: e.clientX, y: e.clientY };
  redraw();
});
canvas.addEventListener('pointerup', () => { if (drag) { drag = null; snapshot(); } });

// --- Export ---------------------------------------------------------------
function exportSize(name) {
  const [w, h] = SIZES[name];
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const keep = { ...state, showSelection: false };
  renderCover(off, keep, images);
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${w}x${h}.png`;
    a.click();
    status.textContent = `Saved neon-coast-cover-${w}x${h}.png`;
  }, 'image/png');
}
$('size').addEventListener('change', () => {
  const [w, h] = SIZES[$('size').value];
  canvas.width = w; canvas.height = h;
  redraw();
});
$('exportOne').addEventListener('click', () => exportSize($('size').value));
$('exportAll').addEventListener('click', () => {
  Object.keys(SIZES).forEach((name, i) => setTimeout(() => exportSize(name), i * 350));
});

// --- Screenshot scenes, or the plain editor -------------------------------
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, {
    loadSample,
    apply(next, w, h) {
      Object.assign(state, next);
      canvas.width = w; canvas.height = h;
      redraw();
    },
  });
} else {
  loadSample('pier').then((key) => {
    state.panels[0] = { img: key, ox: 0, oy: 0, zoom: 1 };
    return loadSample('boulevard');
  }).then((key) => {
    state.panels[5] = { img: key, ox: 0, oy: 0, zoom: 1 };
    snapshot();
    redraw();
  }).catch(() => { snapshot(); redraw(); });
  snapshot();
  redraw();
}
