import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { FOOTER_MARGIN, buildPackage, packageFileName } from './buildPackage';
import type { Requirement, Tender } from './types';

const tender: Tender = {
  tender_id: 'T-2026-0417',
  title: 'Supply of IT Equipment',
  procuring_entity: 'Example Directorate',
  bidder: 'Example Company Ltd.',
  submission_deadline: '2026-10-20',
};

const req = (id: string, order: number, title: string): Requirement => ({
  id,
  order,
  title_en: title,
  title_bn: title,
  mandatory: true,
  has_expiry: false,
});

async function makePdf(pages: { size: [number, number]; label: string; rotate?: number }[]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const p of pages) {
    const page = doc.addPage(p.size);
    page.drawText(p.label, { x: 5, y: 5, size: 10, font });
    if (p.rotate) page.setRotation(degrees(p.rotate));
  }
  return doc.save();
}

async function readText(bytes: Uint8Array) {
  const doc = await getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
  const pages: { width: number; height: number; items: { str: string; x: number; y: number }[] }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const [x0, y0, x1, y1] = page.view;
    const content = await page.getTextContent();
    pages.push({
      width: x1 - x0,
      height: y1 - y0,
      items: content.items
        .filter((it): it is Extract<typeof it, { str: string }> => 'str' in it)
        .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5] })),
    });
  }
  return pages;
}

describe('buildPackage', () => {
  it('builds cover, index and documents in order with Page X of Y footers outside content', async () => {
    const a = await makePdf([{ size: [595, 842], label: 'A1' }, { size: [595, 842], label: 'A2' }]);
    const b = await makePdf([{ size: [842, 595], label: 'B1' }]);
    const c = await makePdf([{ size: [500, 300], label: 'C1', rotate: 90 }]);

    const result = await buildPackage({
      tender,
      generatedOn: '2026-10-06',
      includeIndex: true,
      items: [
        { req: req('R3', 7, 'Rotated Doc'), fileName: 'c.pdf', bytes: c },
        { req: req('R1', 1, 'Trade License'), fileName: 'a.pdf', bytes: a },
        { req: req('R2', 3, 'Landscape Doc'), fileName: 'b.pdf', bytes: b },
      ],
    });

    expect(result.totalPages).toBe(6);
    expect(result.starts).toEqual([
      { reqId: 'R1', start: 3, pages: 2 },
      { reqId: 'R2', start: 5, pages: 1 },
      { reqId: 'R3', start: 6, pages: 1 },
    ]);

    const pages = await readText(result.bytes);
    expect(pages).toHaveLength(6);
    pages.forEach((p, i) => {
      const footer = p.items.find((it) => it.str === `T-2026-0417 | Page ${i + 1} of 6`);
      expect(footer, `footer on page ${i + 1}`).toBeDefined();
      expect(footer!.y).toBeLessThan(FOOTER_MARGIN);
    });

    const cover = pages[0].items.map((i) => i.str).join('\n');
    for (const s of ['Supply of IT Equipment', 'Example Directorate', 'Example Company Ltd.', '2026-10-20', '2026-10-06', 'Trade License']) {
      expect(cover).toContain(s);
    }
    expect(cover.indexOf('Trade License')).toBeLessThan(cover.indexOf('Landscape Doc'));
    expect(cover.indexOf('Landscape Doc')).toBeLessThan(cover.indexOf('Rotated Doc'));

    const labels = pages.slice(2).map((p) => p.items.find((it) => /^[ABC]\d$/.test(it.str)));
    expect(labels.map((l) => l?.str)).toEqual(['A1', 'A2', 'B1', 'C1']);
    for (const l of labels.slice(0, 3)) expect(l!.y).toBeGreaterThanOrEqual(FOOTER_MARGIN + 4);

    expect(pages[2]).toMatchObject({ width: 595, height: 842 + FOOTER_MARGIN });
    expect(pages[4]).toMatchObject({ width: 842, height: 595 + FOOTER_MARGIN });
    expect(pages[5]).toMatchObject({ width: 300, height: 500 + FOOTER_MARGIN });
    // Clockwise /Rotate 90 puts the original bottom-left corner at the top-left.
    expect(labels[3]!.x).toBeLessThan(20);
    expect(labels[3]!.y).toBeGreaterThan(500);
  });

  it('names the download after the tender ID', () => {
    expect(packageFileName('T-2026-0417')).toBe('T-2026-0417_Package.pdf');
  });
});
