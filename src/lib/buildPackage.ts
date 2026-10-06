import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, degrees, rgb } from 'pdf-lib';
import type { Requirement, Tender } from './types';

export const FOOTER_MARGIN = 36;
const A4: [number, number] = [595.28, 841.89];
const INK = rgb(0.11, 0.13, 0.13);
const MUTED = rgb(0.38, 0.42, 0.42);
const RULE = rgb(0.85, 0.87, 0.86);
const ACCENT = rgb(0.059, 0.361, 0.361);
const ZEBRA = rgb(0.965, 0.97, 0.965);
const FOOTER_INK = rgb(0.2, 0.2, 0.2);

export interface PackageItem {
  req: Requirement;
  fileName: string;
  bytes: ArrayBuffer | Uint8Array;
}

export interface BuildOptions {
  tender: Tender;
  /** Included documents; they are sorted by requirement order here as well. */
  items: PackageItem[];
  generatedOn: string;
  includeIndex: boolean;
  /**
   * Bangla titles for the index page, pre-rendered by the browser (which shapes Bengali
   * conjuncts correctly, unlike pdf-lib's text layout). Keyed by requirement id.
   */
  bengaliLabels?: Record<string, LabelImage>;
  onProgress?: (done: number, total: number) => void | Promise<void>;
}

export interface LabelImage {
  png: Uint8Array;
  /** Size in points when the text is drawn at `fontSize`. */
  width: number;
  height: number;
  fontSize: number;
  /** Distance from the image bottom to the text baseline, in points at `fontSize`. */
  baseline: number;
}

export interface BuildResult {
  bytes: Uint8Array;
  totalPages: number;
  /** 1-based page number where each item starts, in output order. */
  starts: { reqId: string; start: number; pages: number }[];
}

export class PackageBuildError extends Error {
  constructor(public readonly failedFiles: string[]) {
    super(`Could not read: ${failedFiles.join(', ')}`);
    this.name = 'PackageBuildError';
  }
}

export function footerText(tenderId: string, page: number, total: number): string {
  return `${tenderId} | Page ${page} of ${total}`;
}

export function packageFileName(tenderId: string): string {
  const safe = tenderId.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'Tender';
  return `${safe}_Package.pdf`;
}

export async function buildPackage(opts: BuildOptions): Promise<BuildResult> {
  const items = [...opts.items].sort((a, b) => a.req.order - b.req.order);

  const sources: PDFDocument[] = [];
  const failed: string[] = [];
  for (const item of items) {
    try {
      sources.push(await PDFDocument.load(item.bytes, { updateMetadata: false }));
    } catch {
      failed.push(item.fileName);
    }
  }
  if (failed.length) throw new PackageBuildError(failed);

  const out = await PDFDocument.create();
  out.setTitle(`${opts.tender.tender_id} - Tender submission package`);
  out.setSubject(opts.tender.title);
  out.setAuthor(opts.tender.bidder);
  out.setCreator('Tender Package Builder');
  out.setProducer('Tender Package Builder (pdf-lib)');

  const regular = await out.embedFont(StandardFonts.Helvetica);
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const labels = new Map<string, { image: PDFImage; meta: LabelImage }>();
  if (opts.includeIndex && opts.bengaliLabels) {
    for (const item of items) {
      const meta = opts.bengaliLabels[item.req.id];
      if (!meta) continue;
      try {
        labels.set(item.req.id, { image: await out.embedPng(meta.png), meta });
      } catch {
        /* the English title is still shown */
      }
    }
  }

  const frontPages = opts.includeIndex ? 2 : 1;
  const counts = sources.map((d) => d.getPageCount());
  const totalPages = frontPages + counts.reduce((a, b) => a + b, 0);
  const starts: BuildResult['starts'] = [];
  let cursor = frontPages + 1;
  items.forEach((item, i) => {
    starts.push({ reqId: item.req.id, start: cursor, pages: counts[i] });
    cursor += counts[i];
  });

  const fonts = { regular, bold };
  drawCover(out.addPage(A4), opts, items, counts, fonts);
  if (opts.includeIndex) drawIndex(out.addPage(A4), items, starts, fonts, labels);

  const totalSourcePages = counts.reduce((a, b) => a + b, 0);
  let done = 0;
  for (const src of sources) {
    for (const page of src.getPages()) {
      await appendWithMargin(out, page);
      await opts.onProgress?.(++done, totalSourcePages);
    }
  }

  const pages = out.getPages();
  pages.forEach((page, i) => drawFooter(page, regular, footerText(opts.tender.tender_id, i + 1, pages.length)));

  return { bytes: await out.save(), totalPages, starts };
}

/** Copies a page onto a new page that is FOOTER_MARGIN taller, so the footer never overlaps content. */
async function appendWithMargin(out: PDFDocument, page: PDFPage) {
  const box = page.getCropBox();
  const w = box.width;
  const h = box.height;
  const angle = (((page.getRotation().angle % 360) + 360) % 360) as number;
  const quarter = Math.round(angle / 90) % 4;
  const [vw, vh] = quarter % 2 === 1 ? [h, w] : [w, h];
  const target = out.addPage([vw, vh + FOOTER_MARGIN]);

  let embedded;
  try {
    embedded = await out.embedPage(page, {
      left: box.x,
      bottom: box.y,
      right: box.x + w,
      top: box.y + h,
    });
  } catch {
    return; // Page without a content stream: keep it as a blank page of the same size.
  }

  const m = FOOTER_MARGIN;
  // /Rotate is clockwise; pdf-lib rotates counter-clockwise around (x, y).
  const placement = [
    { x: 0, y: m, rotate: 0 },
    { x: 0, y: m + w, rotate: -90 },
    { x: w, y: m + h, rotate: 180 },
    { x: h, y: m, rotate: 90 },
  ][quarter];
  target.drawPage(embedded, {
    x: placement.x,
    y: placement.y,
    width: w,
    height: h,
    rotate: degrees(placement.rotate),
  });
}

function drawFooter(page: PDFPage, font: PDFFont, text: string) {
  const safe = winAnsi(text, font);
  const { width: pw } = page.getSize();
  const size = Math.min(9.5, (pw - 16) / font.widthOfTextAtSize(safe, 1));
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: (pw - width) / 2, y: 13, size, font, color: FOOTER_INK });
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

function drawCover(page: PDFPage, opts: BuildOptions, items: PackageItem[], counts: number[], f: Fonts) {
  const { tender } = opts;
  const [W, H] = A4;
  const L = 56;
  const R = W - 56;
  const bottomLimit = FOOTER_MARGIN + 40;

  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: ACCENT });

  let y = H - 72;
  text(page, 'TENDER SUBMISSION PACKAGE', L, y, f.bold, 9.5, ACCENT);
  y -= 30;
  for (const line of wrap(tender.title, f.bold, 22, R - L)) {
    text(page, line, L, y, f.bold, 22, INK);
    y -= 28;
  }
  text(page, tender.tender_id, L, y + 4, f.regular, 12, MUTED);
  y -= 26;
  hr(page, L, R, y);
  y -= 26;

  const rows: [string, string][] = [
    ['Tender ID', tender.tender_id],
    ['Tender title', tender.title],
    ['Procuring entity', tender.procuring_entity],
    ['Bidder', tender.bidder],
    ['Submission deadline', tender.submission_deadline],
    ['Package generated', opts.generatedOn],
  ];
  const valueX = L + 140;
  for (const [label, value] of rows) {
    text(page, label, L, y, f.regular, 10, MUTED);
    const lines = wrap(value, f.bold, 11, R - valueX);
    lines.forEach((line, i) => text(page, line, valueX, y - i * 15, f.bold, 11, INK));
    y -= Math.max(1, lines.length) * 15 + 9;
  }
  y -= 6;
  hr(page, L, R, y);
  y -= 28;

  text(page, 'Included documents', L, y, f.bold, 13, INK);
  const total = counts.reduce((a, b) => a + b, 0);
  const summary = `${items.length} document${items.length === 1 ? '' : 's'}, ${total} page${total === 1 ? '' : 's'}`;
  text(page, summary, R - f.regular.widthOfTextAtSize(summary, 10), y, f.regular, 10, MUTED);
  y -= 24;

  const available = y - bottomLimit;
  const lineH = Math.max(10, Math.min(19, available / Math.max(1, items.length)));
  const size = Math.min(11, lineH * 0.62);
  items.forEach((item, i) => {
    const num = `${i + 1}.`;
    text(page, num, L + 18 - f.regular.widthOfTextAtSize(num, size), y, f.regular, size, MUTED);
    const pages = `${counts[i]} page${counts[i] === 1 ? '' : 's'}`;
    const pagesW = f.regular.widthOfTextAtSize(pages, size);
    const title = truncate(item.req.title_en, f.regular, size, R - pagesW - 16 - (L + 26));
    text(page, title, L + 26, y, f.regular, size, INK);
    text(page, pages, R - pagesW, y, f.regular, size, MUTED);
    y -= lineH;
  });
}

function drawIndex(
  page: PDFPage,
  items: PackageItem[],
  starts: BuildResult['starts'],
  f: Fonts,
  labels: Map<string, { image: PDFImage; meta: LabelImage }>,
) {
  const [W, H] = A4;
  const L = 56;
  const R = W - 56;
  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: ACCENT });
  let y = H - 72;
  text(page, 'INDEX', L, y, f.bold, 9.5, ACCENT);
  y -= 30;
  text(page, 'Contents of this package', L, y, f.bold, 20, INK);
  y -= 34;

  const colPages = R - 120;
  const colStart = R;
  const header = (label: string, x: number, alignRight = false) =>
    text(page, label, alignRight ? x - f.bold.widthOfTextAtSize(label, 9) : x, y, f.bold, 9, MUTED);
  header('NO.', L);
  header('DOCUMENT', L + 36);
  header('PAGES', colPages, true);
  header('STARTS ON PAGE', colStart, true);
  y -= 10;
  hr(page, L, R, y);

  const withBn = labels.size > 0;
  const available = y - (FOOTER_MARGIN + 40);
  const rowH = Math.max(14, Math.min(withBn ? 36 : 24, available / Math.max(1, items.length)));
  const size = Math.min(11, rowH * (withBn ? 0.32 : 0.46));

  items.forEach((item, i) => {
    const top = y;
    if (i % 2 === 0) page.drawRectangle({ x: L - 6, y: top - rowH, width: R - L + 12, height: rowH, color: ZEBRA });
    const base = withBn ? top - rowH * 0.42 : top - rowH * 0.66;
    text(page, String(i + 1), L, base, f.regular, size, MUTED);
    const titleW = colPages - 60 - (L + 36);
    text(page, truncate(item.req.title_en, f.regular, size, titleW), L + 36, base, f.regular, size, INK);
    const label = labels.get(item.req.id);
    if (label) {
      const { meta, image } = label;
      const k = Math.min((size * 0.95) / meta.fontSize, titleW / meta.width);
      const baselineY = top - rowH * 0.84;
      page.drawImage(image, { x: L + 36, y: baselineY - meta.baseline * k, width: meta.width * k, height: meta.height * k });
    }
    const s = starts[i];
    const pages = String(s.pages);
    const start = String(s.start);
    text(page, pages, colPages - f.regular.widthOfTextAtSize(pages, size), base, f.regular, size, INK);
    text(page, start, colStart - f.bold.widthOfTextAtSize(start, size), base, f.bold, size, INK);
    y -= rowH;
  });
}

function text(page: PDFPage, value: string, x: number, y: number, font: PDFFont, size: number, color = INK) {
  page.drawText(winAnsi(value, font), { x, y, size, font, color });
}

function hr(page: PDFPage, x1: number, x2: number, y: number) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.75, color: RULE });
}

const encodable = new Map<string, boolean>();

/** Standard fonts only support WinAnsi; replace anything else so drawing never throws. */
export function winAnsi(value: string, font: PDFFont): string {
  let out = '';
  for (const ch of value.replace(/[\r\n\t]+/g, ' ')) {
    let ok = encodable.get(ch);
    if (ok === undefined) {
      try {
        font.encodeText(ch);
        ok = true;
      } catch {
        ok = false;
      }
      encodable.set(ch, ok);
    }
    out += ok ? ch : '?';
  }
  return out;
}

function wrap(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = winAnsi(value, font).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines.map((l) => truncate(l, font, size, maxWidth)) : [''];
}

function truncate(value: string, font: PDFFont, size: number, maxWidth: number): string {
  const safe = winAnsi(value, font);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  let s = safe;
  while (s.length > 1 && font.widthOfTextAtSize(`${s}...`, size) > maxWidth) s = s.slice(0, -1);
  return `${s.trimEnd()}...`;
}
