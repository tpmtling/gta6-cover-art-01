// Neon Coast Cover Studio — the cover renderer.
// Everything is drawn on a 2D canvas: photos or hand-drawn scenes fill a panel
// layout, a colour grade is mapped over each panel, and the title block is
// lettered on top. No image, font or logo comes from any game: the scenes,
// lettering and badges below are this app's own drawings.

/** Colour grades: a shadow colour, a mid colour and a highlight colour that a
 *  panel's brightness is mapped through, plus plain filter settings. */
export const GRADES = {
  vice:   { label: 'Vice Sunset',  shadow: [38, 10, 66],  mid: [232, 62, 128], high: [255, 196, 110], sat: 1.25, con: 1.08, map: 0.55 },
  neon:   { label: 'Neon Night',  shadow: [8, 12, 44],   mid: [24, 178, 205], high: [255, 92, 196],  sat: 1.3,  con: 1.12, map: 0.45 },
  golden: { label: 'Golden Hour', shadow: [52, 24, 10],  mid: [226, 122, 44], high: [255, 232, 168], sat: 1.15, con: 1.05, map: 0.5 },
  pastel: { label: 'Miami Pastel',shadow: [70, 60, 110], mid: [240, 160, 190],high: [210, 245, 235], sat: 1.05, con: 0.98, map: 0.42 },
  ink:    { label: 'Ink Poster',  shadow: [16, 14, 26],  mid: [120, 110, 150],high: [245, 240, 225], sat: 0.55, con: 1.3,  map: 0.6, poster: 5 },
  retro:  { label: 'VHS Retro',   shadow: [10, 40, 48],  mid: [64, 178, 168], high: [255, 170, 120], sat: 1.35, con: 1.06, map: 0.48 },
  raw:    { label: 'Raw Photo',   shadow: [0, 0, 0],     mid: [128, 128, 128],high: [255, 255, 255], sat: 1.0,  con: 1.0,  map: 0 },
};

/** Panel layouts. Each returns a list of rectangles in 0..1 space plus the
 *  title block's height as a fraction of the cover. `tilt` tilts a panel. */
export const LAYOUTS = {
  grid6: { label: 'Cover Grid · 6', titleH: 0.21, panels: () => [
    [0, 0, 0.52, 0.42], [0.52, 0, 0.48, 0.42],
    [0, 0.42, 0.34, 0.30], [0.34, 0.42, 0.33, 0.30], [0.67, 0.42, 0.33, 0.30],
    [0, 0.72, 1, 0.28],
  ] },
  duet: { label: 'Hero Duet · 2', titleH: 0.19, panels: () => [
    [0, 0, 0.5, 1], [0.5, 0, 0.5, 1],
  ] },
  nine: { label: 'Mosaic · 9', titleH: 0.16, panels: () => {
    const out = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push([c / 3, r / 3, 1 / 3, 1 / 3]);
    return out;
  } },
  bleed: { label: 'Full Bleed · 1', titleH: 0.23, panels: () => [[0, 0, 1, 1]] },
  stack: { label: 'Snapshot Stack', titleH: 0.18, panels: () => [
    { rect: [0.06, 0.05, 0.55, 0.52], tilt: -0.045 },
    { rect: [0.42, 0.30, 0.55, 0.52], tilt: 0.05 },
    { rect: [0.16, 0.58, 0.55, 0.40], tilt: -0.02 },
  ] },
  trio: { label: 'Banner Trio · 3', titleH: 0.20, panels: () => [
    [0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1],
  ] },
  poster: { label: 'Poster · 3', titleH: 0.30, panels: () => [
    [0, 0, 1, 0.55], [0, 0.55, 0.5, 0.45], [0.5, 0.55, 0.5, 0.45],
  ] },
};

const SCENE_KINDS = ['sunset', 'neon', 'skyline', 'yacht', 'boulevard', 'palms'];
export const SCENES = SCENE_KINDS;

/** A small deterministic random source, so a cover renders the same twice. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Draws a palm tree silhouette: a curved trunk and a crown of fronds. */
function palm(ctx, x, y, h, lean, colour) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = Math.max(2, h * 0.035);
  ctx.lineCap = 'round';
  const topX = x + lean * h;
  const topY = y - h;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * h * 0.3, y - h * 0.55, topX, topY);
  ctx.stroke();
  for (let i = 0; i < 9; i++) {
    const spread = (i / 8 - 0.5) * Math.PI * 1.25; // fan from left-down to right-down
    const len = h * (0.30 + 0.10 * Math.cos(spread * 1.6));
    const dx = Math.sin(spread) * len;
    const dy = len * (0.42 - 0.30 * Math.cos(spread)); // tips droop at the edges
    ctx.lineWidth = Math.max(1.5, h * 0.022);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + dx * 0.5, topY - len * 0.34, topX + dx, topY + dy);
    ctx.stroke();
  }
}

/** Paints one of the app's own backdrop scenes into a rectangle. These stand
 *  in for a photo in any panel and are drawn fresh at the panel's size. */
export function drawScene(ctx, kind, x, y, w, h, seed = 7) {
  const rand = rng(seed * 131 + kind.length * 17);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (kind === 'sunset' || kind === 'palms') {
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, '#3b1d5e'); sky.addColorStop(0.45, '#c73e7d');
    sky.addColorStop(0.75, '#ff7e47'); sky.addColorStop(1, '#ffc46b');
    ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
    const sunY = y + h * 0.62, sunR = Math.min(w, h) * 0.20;
    const sun = ctx.createRadialGradient(x + w * 0.5, sunY, 4, x + w * 0.5, sunY, sunR * 1.9);
    sun.addColorStop(0, 'rgba(255,236,170,0.95)'); sun.addColorStop(0.35, 'rgba(255,180,90,0.75)');
    sun.addColorStop(1, 'rgba(255,140,80,0)');
    ctx.fillStyle = sun; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(x + w * 0.5, sunY, sunR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7e2a5e';
    for (let i = 0; i < 5; i++) ctx.fillRect(x, sunY + sunR * (0.15 + i * 0.17), w, Math.max(2, h * 0.012));
    ctx.fillStyle = '#2a1240';
    ctx.fillRect(x, y + h * 0.78, w, h * 0.22);
    ctx.fillStyle = 'rgba(255,170,90,0.5)';
    for (let i = 0; i < 26; i++) ctx.fillRect(x + rand() * w, y + h * (0.8 + rand() * 0.16), w * (0.02 + rand() * 0.06), Math.max(1.5, h * 0.006));
    palm(ctx, x + w * 0.16, y + h * 0.86, h * 0.52, 0.16, '#1d0a30');
    palm(ctx, x + w * 0.86, y + h * 0.88, h * 0.62, -0.13, '#1d0a30');
    palm(ctx, x + w * 0.68, y + h * 0.84, h * 0.36, -0.2, '#24103c');
  } else if (kind === 'neon') {
    const bg = ctx.createLinearGradient(0, y, 0, y + h);
    bg.addColorStop(0, '#070b26'); bg.addColorStop(0.7, '#131a44'); bg.addColorStop(1, '#2a1050');
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.6})`; ctx.fillRect(x + rand() * w, y + rand() * h * 0.4, 2, 2); }
    const cols = ['#ff5cc4', '#22d3ee', '#ffd166', '#7CFC98'];
    for (let b = 0; b < 6; b++) {
      const bw = w * (0.1 + rand() * 0.09), bx = x + (b / 6) * w + rand() * w * 0.03, bh = h * (0.35 + rand() * 0.3);
      ctx.fillStyle = '#0b0f2c'; ctx.fillRect(bx, y + h - bh, bw, bh);
      ctx.fillStyle = cols[b % 4]; ctx.globalAlpha = 0.85;
      ctx.fillRect(bx + bw * 0.14, y + h - bh + bh * 0.12, bw * 0.72, 3);
      ctx.globalAlpha = 1;
      for (let wy = 0; wy < 5; wy++) for (let wx = 0; wx < 3; wx++)
        if (rand() > 0.45) { ctx.fillStyle = 'rgba(255,220,150,0.85)'; ctx.fillRect(bx + bw * (0.16 + wx * 0.26), y + h - bh + bh * (0.25 + wy * 0.14), bw * 0.15, bh * 0.07); }
    }
    ctx.fillStyle = '#0a0a18'; ctx.fillRect(x, y + h * 0.88, w, h * 0.12);
    ctx.fillStyle = 'rgba(255,92,196,0.35)'; ctx.fillRect(x, y + h * 0.88, w, 3);
    ctx.fillStyle = 'rgba(34,211,238,0.28)';
    for (let i = 0; i < 18; i++) ctx.fillRect(x + rand() * w, y + h * (0.9 + rand() * 0.08), w * 0.05, 2);
  } else if (kind === 'skyline') {
    const sky = ctx.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, '#2c1a56'); sky.addColorStop(0.6, '#8a3a72'); sky.addColorStop(1, '#e86a5e');
    ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,214,150,0.9)';
    ctx.beginPath(); ctx.arc(x + w * 0.78, y + h * 0.2, Math.min(w, h) * 0.055, 0, Math.PI * 2); ctx.fill();
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer ? '#160b2e' : '#3a2060';
      let bx = x - w * 0.03;
      while (bx < x + w) {
        const bw = w * (0.07 + rand() * 0.1), bh = h * (0.3 + rand() * 0.38) * (layer ? 1.12 : 0.8);
        ctx.fillRect(bx, y + h - bh, bw, bh);
        if (layer) for (let wy = 0; wy < 7; wy++) for (let wx = 0; wx < 3; wx++)
          if (rand() > 0.5) { ctx.fillStyle = 'rgba(255,214,140,0.9)'; ctx.fillRect(bx + bw * (0.15 + wx * 0.3), y + h - bh + bh * (0.1 + wy * 0.12), bw * 0.16, bh * 0.06); ctx.fillStyle = '#160b2e'; }
        bx += bw + w * 0.012;
      }
    }
    palm(ctx, x + w * 0.08, y + h * 0.99, h * 0.4, 0.14, '#0f0620');
    palm(ctx, x + w * 0.95, y + h * 0.99, h * 0.46, -0.12, '#0f0620');
  } else if (kind === 'yacht') {
    const sky = ctx.createLinearGradient(0, y, 0, y + h * 0.55);
    sky.addColorStop(0, '#7ed6e8'); sky.addColorStop(1, '#ffe3ae');
    ctx.fillStyle = sky; ctx.fillRect(x, y, w, h * 0.55);
    const sea = ctx.createLinearGradient(0, y + h * 0.5, 0, y + h);
    sea.addColorStop(0, '#1b9aaa'); sea.addColorStop(1, '#0b5e74');
    ctx.fillStyle = sea; ctx.fillRect(x, y + h * 0.5, w, h * 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 30; i++) ctx.fillRect(x + rand() * w, y + h * (0.54 + rand() * 0.4), w * (0.015 + rand() * 0.05), 2);
    ctx.fillStyle = '#10303e';
    const bx = x + w * 0.3, by = y + h * 0.52, bw = w * 0.42;
    ctx.beginPath();
    ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw * 0.86, by + h * 0.055); ctx.lineTo(bx + bw * 0.1, by + h * 0.055); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f7f7'; ctx.fillRect(bx + bw * 0.2, by - h * 0.055, bw * 0.5, h * 0.055);
    ctx.fillStyle = '#10303e'; ctx.fillRect(bx + bw * 0.44, by - h * 0.13, bw * 0.05, h * 0.13);
    ctx.beginPath(); ctx.moveTo(bx + bw * 0.465, by - h * 0.13); ctx.lineTo(bx + bw * 0.465, by - h * 0.02); ctx.lineTo(bx + bw * 0.72, by - h * 0.02); ctx.closePath();
    ctx.fillStyle = 'rgba(244,247,247,0.92)'; ctx.fill();
    palm(ctx, x + w * 0.05, y + h * 0.55, h * 0.3, 0.18, '#0d2c26');
  } else { // boulevard
    const sky = ctx.createLinearGradient(0, y, 0, y + h * 0.6);
    sky.addColorStop(0, '#58306e'); sky.addColorStop(0.65, '#d6577b'); sky.addColorStop(1, '#ffb36b');
    ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#5b2144';
    ctx.fillRect(x, y + h * 0.42, w * 0.2, h * 0.2); ctx.fillRect(x + w * 0.82, y + h * 0.4, w * 0.18, h * 0.22);
    ctx.fillStyle = '#33272e';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.38, y + h); ctx.lineTo(x + w * 0.485, y + h * 0.58); ctx.lineTo(x + w * 0.515, y + h * 0.58); ctx.lineTo(x + w * 0.62, y + h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = Math.max(2, h * 0.008);
    ctx.beginPath(); ctx.moveTo(x + w * 0.5, y + h * 0.6); ctx.lineTo(x + w * 0.5, y + h); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const t = i / 5, px = x + w * (0.3 - t * 0.24), py = y + h * (0.6 + t * 0.38);
      palm(ctx, px, py, h * (0.16 + t * 0.3), 0.15, '#200d33');
      palm(ctx, x + w - (px - x), py, h * (0.16 + t * 0.3), -0.15, '#200d33');
    }
    ctx.fillStyle = '#14081f';
    ctx.beginPath(); ctx.ellipse(x + w * 0.5, y + h * 0.9, w * 0.13, h * 0.035, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e6395e';
    ctx.beginPath(); ctx.ellipse(x + w * 0.5, y + h * 0.875, w * 0.115, h * 0.026, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(x + w * 0.44, y + h * 0.885, h * 0.012, 0, Math.PI * 2); ctx.arc(x + w * 0.56, y + h * 0.885, h * 0.012, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Builds a lookup table for one grade: brightness 0..255 -> [r, g, b]. */
function gradeLUT(grade) {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    for (let c = 0; c < 3; c++) {
      const lo = grade.shadow[c], mid = grade.mid[c], hi = grade.high[c];
      lut[i * 3 + c] = t < 0.5 ? lo + (mid - lo) * (t * 2) : mid + (hi - mid) * (t * 2 - 1);
    }
  }
  return lut;
}

/** Grades one panel's pixels in place on its own offscreen canvas. */
function gradePanel(source, w, h, grade) {
  const off = document.createElement('canvas');
  off.width = Math.max(2, Math.round(w));
  off.height = Math.max(2, Math.round(h));
  const octx = off.getContext('2d', { willReadFrequently: true });
  octx.drawImage(source, 0, 0, off.width, off.height);
  if (grade.map > 0 || grade.poster) {
    const img = octx.getImageData(0, 0, off.width, off.height);
    const d = img.data, lut = gradeLUT(grade), m = grade.map;
    const levels = grade.poster ? grade.poster - 1 : 0;
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i + 1], b = d[i + 2];
      if (levels) {
        r = Math.round(r / 255 * levels) * 255 / levels;
        g = Math.round(g / 255 * levels) * 255 / levels;
        b = Math.round(b / 255 * levels) * 255 / levels;
      }
      const lum = Math.max(0, Math.min(255, Math.round(0.299 * r + 0.587 * g + 0.114 * b)));
      d[i]     = r + (lut[lum * 3] - r) * m;
      d[i + 1] = g + (lut[lum * 3 + 1] - g) * m;
      d[i + 2] = b + (lut[lum * 3 + 2] - b) * m;
    }
    octx.putImageData(img, 0, 0);
  }
  return off;
}

/** Draws a photo into a rectangle with cover-crop, pan and zoom. */
function drawPhotoCover(ctx, img, x, y, w, h, pan) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * (pan.zoom || 1);
  const pw = img.naturalWidth * scale, ph = img.naturalHeight * scale;
  const px = x + (w - pw) / 2 + (pan.ox || 0) * w;
  const py = y + (h - ph) / 2 + (pan.oy || 0) * h;
  ctx.drawImage(img, px, py, pw, ph);
}

/** The sunset gradient used for title lettering. */
function titleGradient(ctx, x, y, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#ff5cc4'); g.addColorStop(0.45, '#ff7e47'); g.addColorStop(1, '#ffd166');
  return g;
}

/** Letters the title block: a halftone-dotted band, the big title, a neon
 *  script subtitle, the star heat meter and a corner badge. */
function drawTitleBlock(ctx, W, H, st, blockH) {
  const pad = W * 0.045;
  ctx.save();
  ctx.fillStyle = '#fdfbf7';
  ctx.fillRect(0, H - blockH, W, blockH);
  if (st.halftone) {
    ctx.fillStyle = 'rgba(199,62,125,0.20)';
    const step = Math.max(9, W * 0.016);
    for (let yy = H - blockH + step * 0.5; yy < H; yy += step)
      for (let xx = step * 0.5; xx < W; xx += step) {
        ctx.beginPath(); ctx.arc(xx, yy, step * 0.16, 0, Math.PI * 2); ctx.fill();
      }
  }
  ctx.fillStyle = '#160b26';
  ctx.fillRect(0, H - blockH, W, Math.max(3, H * 0.006));

  // Title, fitted to the block.
  const title = (st.title || '').trim().toUpperCase() || 'NEON COAST';
  let size = blockH * 0.52;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const setFont = () => { ctx.font = `900 ${size}px "Arial Narrow", "Helvetica Neue", Arial, sans-serif`; };
  setFont();
  while (ctx.measureText(title).width > W - pad * 2 && size > 14) { size *= 0.94; setFont(); }
  const titleY = H - blockH * 0.38;
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = '#160b26';
  ctx.lineJoin = 'round';
  ctx.strokeText(title, pad, titleY);
  ctx.fillStyle = titleGradient(ctx, 0, titleY - size, size);
  ctx.fillText(title, pad, titleY);

  // Subtitle in a neon script hand.
  if (st.subtitle && st.subtitle.trim()) {
    ctx.font = `italic 700 ${blockH * 0.21}px "Segoe Script", "Brush Script MT", cursive`;
    ctx.shadowColor = '#ff5cc4';
    ctx.shadowBlur = blockH * 0.07;
    ctx.fillStyle = '#d81b74';
    ctx.fillText(st.subtitle.trim(), pad + size * 0.06, H - blockH * 0.10);
    ctx.shadowBlur = 0;
  }

  // Heat stars, bottom right of the block, clear of the title and subtitle.
  const stars = Math.max(0, Math.min(5, st.stars | 0));
  if (stars > 0) {
    const r = blockH * 0.10, cy = H - blockH + blockH * 0.84;
    for (let i = 0; i < 5; i++) {
      const cx = W - pad - r - i * r * 2.35;
      ctx.beginPath();
      for (let p = 0; p < 10; p++) {
        const ang = -Math.PI / 2 + p * Math.PI / 5, rad = p % 2 ? r * 0.45 : r;
        const vx = cx + Math.cos(ang) * rad, vy = cy + Math.sin(ang) * rad;
        p ? ctx.lineTo(vx, vy) : ctx.moveTo(vx, vy);
      }
      ctx.closePath();
      ctx.fillStyle = (4 - i) < stars ? '#ffb703' : 'rgba(22,11,38,0.16)';
      ctx.fill();
      ctx.strokeStyle = '#160b26'; ctx.lineWidth = 1.4; ctx.stroke();
    }
  }

  // Badge: an original round seal, top-left over the art.
  if (st.badge && st.badge.trim()) {
    const br = Math.min(W, H) * 0.052, bx = pad + br, by = H - blockH - br * 1.25;
    ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = '#160b26'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffd166'; ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, br * 0.78, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,209,102,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.font = `900 ${br * 0.52}px "Arial Narrow", Arial, sans-serif`;
    ctx.fillText(st.badge.trim().toUpperCase().slice(0, 4), bx, by + br * 0.19);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

/** Caption ribbon across the foot of the art, above the title block. */
function drawCaption(ctx, W, artH, st) {
  const text = (st.caption || '').trim().toUpperCase();
  if (!text) return;
  let size = Math.min(W, artH) * 0.045;
  ctx.font = `800 ${size}px "Arial Narrow", Arial, sans-serif`;
  while (ctx.measureText(text).width > W * 0.8 && size > 10) { size *= 0.94; ctx.font = `800 ${size}px "Arial Narrow", Arial, sans-serif`; }
  const tw = ctx.measureText(text).width;
  const bw = tw + size * 1.6, bh = size * 1.9, bx = (W - bw) / 2, by = artH - bh - W * 0.02;
  ctx.save();
  ctx.fillStyle = 'rgba(10,6,24,0.82)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, bh * 0.3); ctx.fill();
  ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = size * 0.35;
  ctx.fillText(text, W / 2, by + bh * 0.66);
  ctx.restore();
}

/** Film grain and a vignette, drawn with the cover's own seed. */
function drawFinish(ctx, W, H, st) {
  if (st.grain) {
    const rand = rng(1234);
    ctx.save();
    for (let i = 0; i < W * H / 900; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(rand() * W, rand() * H, 1.6, 1.6);
    }
    ctx.restore();
  }
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(8,2,20,0.38)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/**
 * Renders the whole cover described by `st` onto `canvas`.
 * st.panels[i] is { img } for a photo, { scene } for a drawn scene, or null.
 * `images` maps a panel's img key to a loaded image element.
 */
export function renderCover(canvas, st, images) {
  const W = canvas.width, H = canvas.height;
  const ctx = canvas.getContext('2d');
  const layout = LAYOUTS[st.layout] || LAYOUTS.grid6;
  const grade = GRADES[st.grade] || GRADES.vice;
  const blockH = Math.round(H * layout.titleH);
  const artH = H - blockH;

  ctx.fillStyle = '#fdfbf7';
  ctx.fillRect(0, 0, W, H);

  const panels = layout.panels();
  const gap = Math.max(3, W * 0.006);
  panels.forEach((panel, i) => {
    const rect = Array.isArray(panel) ? panel : panel.rect;
    const tilt = Array.isArray(panel) ? 0 : (panel.tilt || 0);
    const [rx, ry, rw, rh] = rect;
    const x = rx * W, y = ry * artH, w = rw * W, h = rh * artH;
    const data = st.panels[i] || null;

    // Render the panel's content once, graded, on its own canvas.
    const content = document.createElement('canvas');
    content.width = Math.max(2, Math.round(w));
    content.height = Math.max(2, Math.round(h));
    const cctx = content.getContext('2d');
    if (st.layout === 'stack') { cctx.fillStyle = '#ffffff'; cctx.fillRect(0, 0, w, h); }
    const innerPad = st.layout === 'stack' ? Math.max(6, W * 0.012) : 0;
    cctx.save();
    cctx.beginPath(); cctx.rect(innerPad, innerPad, w - innerPad * 2, h - innerPad * 2); cctx.clip();
    if (data && data.img && images[data.img]) {
      drawPhotoCover(cctx, images[data.img], 0, 0, w, h, data);
    } else {
      drawScene(cctx, (data && data.scene) || SCENE_KINDS[i % SCENE_KINDS.length], 0, 0, w, h, 11 + i * 7);
    }
    cctx.restore();
    const graded = gradePanel(content, w, h, grade);

    ctx.save();
    if (tilt) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(tilt);
      ctx.translate(-w / 2, -h / 2);
      ctx.shadowColor = 'rgba(10,4,26,0.45)';
      ctx.shadowBlur = W * 0.02;
      ctx.shadowOffsetY = W * 0.008;
      ctx.drawImage(graded, 0, 0);
    } else {
      ctx.drawImage(graded, x + gap / 2, y + gap / 2, w - gap, h - gap);
    }
    ctx.restore();

    if (st.selected === i && st.showSelection) {
      ctx.save();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = Math.max(3, W * 0.005);
      ctx.setLineDash([W * 0.02, W * 0.012]);
      ctx.strokeRect(x + gap, y + gap, w - gap * 2, h - gap * 2);
      ctx.restore();
    }
  });

  drawCaption(ctx, W, artH, st);
  drawTitleBlock(ctx, W, H, st, blockH);
  drawFinish(ctx, W, H, st);

  // Outer frame line.
  ctx.strokeStyle = '#160b26';
  ctx.lineWidth = Math.max(3, W * 0.006);
  ctx.strokeRect(0, 0, W, H);
}
