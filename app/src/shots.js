// Fixed scenes for screenshots: ?shot=editor shows the editor with a sample photo loaded;
// ?shot=export renders the cover at full size and shows the exported PNG itself;
// ?shot=cover shows the live canvas alone. window.__shotReady is set once painted.
// Query params: layout, size, grade, caption, captionPos, captionColor (hex, no #),
// photos (comma-separated sample names, one per panel), zoom (comma-separated per panel).
export async function runShot(shot, query, studio) {
  const { state } = studio;
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('size')) state.size = query.get('size');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('caption')) state.caption = query.get('caption');
  const captionInput = document.getElementById('caption');
  if (captionInput) captionInput.value = state.caption;
  if (query.get('captionPos')) state.captionPos = query.get('captionPos');
  if (query.get('captionColor')) state.captionColor = `#${query.get('captionColor')}`;
  if (query.get('captionSize')) state.captionSize = Number(query.get('captionSize'));

  const photoNames = (query.get('photos') ?? 'boulevard,pier,boulevard').split(',').map((s) => s.trim());
  for (const name of photoNames) {
    await studio.addSamplePhoto(name);
  }
  studio.ensurePanels();
  const zooms = (query.get('zoom') ?? '').split(',').map((s) => Number(s));
  photoNames.forEach((name, i) => {
    const photo = state.photos.find((p) => p.id === name);
    if (photo && state.panels[i]) {
      state.panels[i].img = photo.img;
      if (zooms[i]) state.panels[i].zoom = zooms[i];
    }
  });
  const pans = (query.get('pan') ?? '').split(',').map((s) => Number(s));
  pans.forEach((pan, i) => {
    if (pan && state.panels[i]) state.panels[i].ox = pan;
  });

  await document.fonts.load('100px Anton').catch(() => {});
  await document.fonts.ready;
  studio.redraw();
  studio.renderLibrary();

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
  }
  if (shot === 'export') {
    const { url } = await studio.exportPNG();
    const view = document.getElementById('shotView');
    const img = document.getElementById('shotImgEl');
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    view.hidden = false;
    document.body.classList.add('shot-export');
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
