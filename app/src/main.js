// Wires the Vice Cover Studio editor: photos, layouts, caption, grade, sizes, export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, LAYOUTS, SIZES, panelRects } from './cover.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const libraryEl = document.getElementById('library');
const panelLabel = document.getElementById('panelLabel');
const zoomInput = document.getElementById('zoom');
const exportedBox = document.getElementById('exportedBox');
const exportedImg = document.getElementById('exportedImg');
const downloadLink = document.getElementById('downloadLink');

const SAMPLES = [
  { id: 'boulevard', name: 'Boulevard sunset', url: 'samples/boulevard.jpg' },
  { id: 'pier', name: 'Pier day', url: 'samples/pier.jpg' },
];

const state = {
  layout: 'poster',
  size: '1920x1080',
  grade: 'sunset',
  caption: 'Sunset Heist',
  captionPos: 'bottom',
  captionSize: 1,
  captionColor: '#ffffff',
  photos: [],
  panels: [],
  selectedPanel: 0,
};

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds a photo to the library and fills empty panels with it. Returns the photo. */
async function addPhoto(id, name, url) {
  const existing = state.photos.find((p) => p.id === id);
  if (existing) return existing;
  const img = await loadImage(url);
  const photo = { id, name, img, url };
  state.photos.push(photo);
  ensurePanels();
  renderLibrary();
  return photo;
}

/** Makes sure there is one panel entry per layout panel, filled from the library. */
function ensurePanels() {
  const count = LAYOUTS[state.layout].panels.length;
  while (state.panels.length < count) {
    const img = state.photos.length ? state.photos[(state.panels.length) % state.photos.length].img : null;
    state.panels.push({ img, zoom: 1, ox: 0, oy: 0 });
  }
  state.panels.length = count;
  if (state.selectedPanel >= count) state.selectedPanel = 0;
}

/** Redraws the live preview at the chosen export size. */
function redraw() {
  const [w, h] = SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  drawCover(canvas, state);
  const count = LAYOUTS[state.layout].panels.length;
  panelLabel.textContent = `Panel ${state.selectedPanel + 1} of ${count} — click a panel in the preview, drag it to move the photo.`;
  const panel = state.panels[state.selectedPanel];
  if (panel) zoomInput.value = String(panel.zoom);
}

/** Renders the photo library strip; a click fills the selected panel with that photo. */
function renderLibrary() {
  libraryEl.innerHTML = '';
  state.photos.forEach((photo) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb';
    button.title = photo.name;
    const inSelected = state.panels[state.selectedPanel] && state.panels[state.selectedPanel].img === photo.img;
    if (inSelected) button.classList.add('in-panel');
    const img = document.createElement('img');
    img.src = photo.url;
    img.alt = photo.name;
    button.appendChild(img);
    button.addEventListener('click', () => {
      state.panels[state.selectedPanel].img = photo.img;
      redraw();
      renderLibrary();
    });
    libraryEl.appendChild(button);
  });
}

/** Renders the cover at full export size and shows the exported PNG. */
async function exportPNG() {
  const [w, h] = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  exportedImg.src = url;
  downloadLink.href = url;
  downloadLink.download = `cover-${state.size}.png`;
  exportedBox.hidden = false;
  status.textContent = `Exported cover-${state.size}.png (${Math.round(blob.size / 1024)} KB) — right-click the cover to save, or use Download PNG.`;
  return { blob, url };
}

function markActive(container, attr, value) {
  container.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset[attr] === value);
  });
}

function wireChoice(containerId, attr, apply) {
  const container = document.getElementById(containerId);
  container.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button || !button.dataset[attr]) return;
    apply(button.dataset[attr]);
    markActive(container, attr, button.dataset[attr]);
    redraw();
  });
}

wireChoice('layoutChoices', 'layout', (v) => { state.layout = v; ensurePanels(); renderLibrary(); });
wireChoice('sizeChoices', 'size', (v) => { state.size = v; });
wireChoice('gradeChoices', 'grade', (v) => { state.grade = v; });
wireChoice('captionColors', 'color', (v) => { state.captionColor = v; });

document.getElementById('caption').addEventListener('input', (e) => {
  state.caption = e.target.value;
  redraw();
});
document.getElementById('captionPos').addEventListener('change', (e) => {
  state.captionPos = e.target.value;
  redraw();
});
document.getElementById('captionSize').addEventListener('input', (e) => {
  state.captionSize = Number(e.target.value);
  redraw();
});
document.getElementById('photoFiles').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const url = URL.createObjectURL(file);
    await addPhoto(`upload-${Date.now()}-${file.name}`, file.name, url);
  }
  redraw();
});
document.getElementById('samples').addEventListener('click', async (e) => {
  const button = e.target.closest('button[data-sample]');
  if (!button) return;
  const sample = SAMPLES.find((s) => s.id === button.dataset.sample);
  const photo = await addPhoto(sample.id, sample.name, sample.url);
  state.panels[state.selectedPanel].img = photo.img;
  redraw();
  renderLibrary();
});
zoomInput.addEventListener('input', () => {
  const panel = state.panels[state.selectedPanel];
  if (panel) {
    panel.zoom = Number(zoomInput.value);
    redraw();
  }
});
document.getElementById('resetCrop').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  if (panel) {
    panel.zoom = 1;
    panel.ox = 0;
    panel.oy = 0;
    redraw();
  }
});
document.getElementById('export').addEventListener('click', () => { exportPNG(); });

/** Click a panel to select it; drag to pan its photo. */
let drag = null;
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const i = rects.findIndex((r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h);
  if (i === -1) return;
  state.selectedPanel = i;
  drag = { x: p.x, y: p.y, rect: rects[i] };
  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = 'grabbing';
  redraw();
  renderLibrary();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[state.selectedPanel];
  panel.ox = Math.max(-0.45, Math.min(0.45, panel.ox + (p.x - drag.x) / drag.rect.w));
  panel.oy = Math.max(-0.45, Math.min(0.45, panel.oy + (p.y - drag.y) / drag.rect.h));
  drag = { x: p.x, y: p.y, rect: drag.rect };
  redraw();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
  canvas.style.cursor = 'grab';
});

const studio = {
  state,
  redraw,
  renderLibrary,
  ensurePanels,
  exportPNG,
  addSamplePhoto: (name) => {
    const sample = SAMPLES.find((s) => s.id === name);
    return sample ? addPhoto(sample.id, sample.name, sample.url) : Promise.reject(new Error(`no sample ${name}`));
  },
};

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  const { runShot } = await import('./shots.js');
  await runShot(shot, params, studio);
} else {
  document.fonts.load('100px Anton').then(redraw).catch(() => redraw());
  await studio.addSamplePhoto('boulevard');
  await studio.addSamplePhoto('pier');
  ensurePanels();
  state.panels[0].img = state.photos[0].img;
  state.panels[1].img = state.photos[1].img;
  state.panels[2].img = state.photos[0].img;
  state.panels[2].zoom = 1.6;
  state.panels[2].ox = 0.08;
  redraw();
  renderLibrary();
}
