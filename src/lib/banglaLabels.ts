import type { LabelImage } from './buildPackage';
import type { Requirement } from './types';

const FONT_PT = 10;
const SCALE = 4;
const FAMILY = '"Noto Sans Bengali", "Nirmala UI", "Vrinda", sans-serif';

/** Renders Bangla titles with the browser's text shaping, as PNGs for the PDF index page. */
export async function renderBanglaLabels(reqs: Requirement[]): Promise<Record<string, LabelImage>> {
  const wanted = reqs.filter((r) => r.title_bn && r.title_bn !== r.title_en && /[\u0980-\u09FF]/.test(r.title_bn));
  if (!wanted.length) return {};
  const px = FONT_PT * SCALE;
  const font = `400 ${px}px ${FAMILY}`;
  try {
    await document.fonts.load(font, 'অআক');
  } catch {
    /* fall back to whatever Bengali font the system has */
  }

  const out: Record<string, LabelImage> = {};
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) return out;
  measure.font = font;

  for (const req of wanted) {
    const metrics = measure.measureText(req.title_bn);
    const ascent = Math.ceil(Math.max(metrics.actualBoundingBoxAscent, px * 0.95)) + 4;
    const descent = Math.ceil(Math.max(metrics.actualBoundingBoxDescent, px * 0.35)) + 4;
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(metrics.width) + 8;
    canvas.height = ascent + descent;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.font = font;
    ctx.fillStyle = '#4f5957';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(req.title_bn, 2, ascent);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) continue;
    out[req.id] = {
      png: new Uint8Array(await blob.arrayBuffer()),
      width: canvas.width / SCALE,
      height: canvas.height / SCALE,
      fontSize: FONT_PT,
      baseline: descent / SCALE,
    };
  }
  return out;
}
