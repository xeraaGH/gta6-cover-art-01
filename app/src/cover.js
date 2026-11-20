// Renders a GTA-style multi-panel cover onto a canvas: photos in comic-style panels,
// a sunset or neon colour grade, and bold Anton caption lettering. All drawing is local;
// the font is Anton under app/fonts/ (SIL Open Font License).

export const LAYOUTS = {
  poster: {
    name: 'Poster',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  grid: {
    name: 'Grid',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  hero: {
    name: 'Hero',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 0.5 },
      { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
    ],
  },
};

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export const GRADES = ['sunset', 'neon', 'none'];

/** Panel rects in canvas pixels for a layout. */
export function panelRects(layout, width, height) {
  return LAYOUTS[layout].panels.map((p) => ({
    x: p.x * width,
    y: p.y * height,
    w: p.w * width,
    h: p.h * height,
  }));
}

/** Draws one photo cover-fit into a rect, with zoom and pan offsets (fractions of the rect). */
function drawPanelPhoto(ctx, img, rect, zoom, ox, oy) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + ox * rect.w;
  const cy = rect.y + rect.h / 2 + oy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** A warm sunset wash, a cyan/magenta neon wash, or just a vignette. */
function drawGrade(ctx, grade, width, height) {
  if (grade === 'sunset') {
    const top = ctx.createLinearGradient(0, 0, 0, height * 0.55);
    top.addColorStop(0, 'rgba(255, 170, 60, 0.20)');
    top.addColorStop(1, 'rgba(255, 170, 60, 0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, width, height);
    const bottom = ctx.createLinearGradient(0, height * 0.4, 0, height);
    bottom.addColorStop(0, 'rgba(255, 90, 40, 0)');
    bottom.addColorStop(0.6, 'rgba(255, 90, 40, 0.26)');
    bottom.addColorStop(1, 'rgba(190, 20, 110, 0.48)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 0, width, height);
  } else if (grade === 'neon') {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const neon = ctx.createLinearGradient(0, 0, width, height);
    neon.addColorStop(0, 'rgba(255, 45, 149, 0.42)');
    neon.addColorStop(0.5, 'rgba(120, 60, 255, 0.30)');
    neon.addColorStop(1, 'rgba(0, 229, 255, 0.42)');
    ctx.fillStyle = neon;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const glow = ctx.createLinearGradient(0, height * 0.5, 0, height);
    glow.addColorStop(0, 'rgba(0, 229, 255, 0)');
    glow.addColorStop(1, 'rgba(0, 229, 255, 0.35)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.42,
    width / 2, height / 2, Math.max(width, height) * 0.72,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.30)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

/** Splits a caption into at most two lines that fit maxWidth at the current font. */
function wrapCaption(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
    if (lines.length === 2) break;
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

/** Draws the bold caption over a dark band, with an outline, a slight slant and a shadow. */
function drawCaption(ctx, caption, width, height, opts) {
  const text = caption.trim().toUpperCase();
  if (!text) return;
  const { position, sizeScale, color } = opts;
  const bandH = height * 0.30;
  const bandY = position === 'top' ? 0 : height - bandH;
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  if (position === 'top') {
    band.addColorStop(0, 'rgba(8, 4, 18, 0.82)');
    band.addColorStop(1, 'rgba(8, 4, 18, 0)');
  } else {
    band.addColorStop(0, 'rgba(8, 4, 18, 0)');
    band.addColorStop(1, 'rgba(8, 4, 18, 0.82)');
  }
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, width, bandH);

  const maxWidth = width * 0.92;
  let size = Math.round(width * 0.105 * sizeScale);
  const setFont = (s) => { ctx.font = `400 ${s}px Anton, 'Arial Narrow', sans-serif`; };
  setFont(size);
  while (ctx.measureText(text).width > maxWidth && size > 24) {
    size -= 2;
    setFont(size);
  }
  let lines = [text];
  if (ctx.measureText(text).width > maxWidth) {
    lines = wrapCaption(ctx, text, maxWidth);
  }
  const lineH = size * 1.04;
  const cy = position === 'top' ? bandY + bandH * 0.44 : height - bandH * 0.44;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10, 4, 20, 0.92)';
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.03;
  lines.forEach((line, i) => {
    const y = cy + (i - (lines.length - 1) / 2) * lineH;
    ctx.save();
    ctx.translate(width / 2, y);
    ctx.transform(1, 0, -0.05, 1, 0, 0);
    ctx.strokeText(line, 0, 0);
    ctx.fillText(line, 0, 0);
    ctx.restore();
  });
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Draws the whole cover: panels of photos with gutters, the colour grade, and the caption.
 * state: { layout, grade, caption, captionPos, captionSize, captionColor,
 *   panels: [{ img, zoom, ox, oy }] }.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.fillStyle = '#0d0d12';
  ctx.fillRect(0, 0, width, height);
  const rects = panelRects(state.layout, width, height);
  const gutter = Math.max(3, Math.round(width * 0.006));
  rects.forEach((rect, i) => {
    const p = state.panels[i];
    const r = { x: rect.x + gutter / 2, y: rect.y + gutter / 2, w: rect.w - gutter, h: rect.h - gutter };
    if (p && p.img) {
      drawPanelPhoto(ctx, p.img, r, p.zoom ?? 1, p.ox ?? 0, p.oy ?? 0);
    } else {
      ctx.fillStyle = '#241a33';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = `400 ${Math.round(Math.min(r.w, r.h) * 0.07)}px Anton, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', r.x + r.w / 2, r.y + r.h / 2);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(2, Math.round(width * 0.002));
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  });
  drawGrade(ctx, state.grade, width, height);
  drawCaption(ctx, state.caption, width, height, {
    position: state.captionPos,
    sizeScale: state.captionSize,
    color: state.captionColor,
  });
}
