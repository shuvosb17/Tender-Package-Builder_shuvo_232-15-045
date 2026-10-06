import { PDFDocument, EncryptedPDFError } from 'pdf-lib';
import type { FileProblem } from './types';

export const MAX_FILES = 30;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

export type RejectReason = 'not_pdf' | 'too_many' | 'too_large' | 'empty';

/** Checks extension, MIME type and the `%PDF` signature in the first 1 KB. */
export function looksLikePdf(name: string, mime: string, head: Uint8Array): boolean {
  if (!/\.pdf$/i.test(name.trim())) return false;
  if (mime && mime !== 'application/pdf' && mime !== 'application/x-pdf') return false;
  const limit = Math.min(head.length - 4, 1024);
  for (let i = 0; i < limit; i++) {
    if (head[i] === 0x25 && head[i + 1] === 0x50 && head[i + 2] === 0x44 && head[i + 3] === 0x46) {
      return true;
    }
  }
  return false;
}

export interface Inspection {
  pageCount?: number;
  problem?: FileProblem;
  thumbnail?: string;
}

type PdfJs = typeof import('pdfjs-dist');
let pdfjsPromise: Promise<PdfJs> | undefined;

export function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]).then(([lib, worker]) => {
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  });
  return pdfjsPromise;
}

/**
 * A file is only usable if both pdf-lib (used to build the package) and pdf.js can open it.
 * Password-protected files are rejected even when they open without a password, because
 * pdf-lib cannot copy their encrypted content streams.
 */
export async function inspectPdf(bytes: ArrayBuffer): Promise<Inspection> {
  let libPages: number | undefined;
  try {
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    libPages = doc.getPageCount();
    if (libPages === 0) return { problem: 'corrupt' };
  } catch (err) {
    return { problem: err instanceof EncryptedPDFError || hasEncryptDict(bytes) ? 'encrypted' : 'corrupt' };
  }

  let thumbnail: string | undefined;
  let pageCount = libPages;
  try {
    const pdfjs = await loadPdfJs();
    const task = pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) });
    const doc = await task.promise;
    pageCount = doc.numPages;
    thumbnail = await renderThumbnail(doc).catch(() => undefined);
    await task.destroy();
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === 'PasswordException') return { problem: 'encrypted' };
    return { problem: 'corrupt' };
  }
  return { pageCount, thumbnail };
}

/** Fallback for protected files whose structure pdf-lib cannot even parse. */
function hasEncryptDict(bytes: ArrayBuffer): boolean {
  const view = new Uint8Array(bytes);
  const tail = view.subarray(Math.max(0, view.length - 64 * 1024));
  return /\/Encrypt\s/.test(new TextDecoder('latin1').decode(tail));
}

async function renderThumbnail(doc: import('pdfjs-dist').PDFDocumentProxy): Promise<string> {
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: 96 / base.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.7);
}
