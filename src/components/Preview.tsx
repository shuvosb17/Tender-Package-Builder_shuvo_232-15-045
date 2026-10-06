import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { loadPdfJs } from '../lib/pdfInfo';
import type { Requirement, UploadedFile } from '../lib/types';
import { digits, formatBytes } from '../i18n';
import { useI18n } from '../i18nContext';
import { IconChevron, IconEye, IconMinus, IconPlus, IconSpinner, IconTrash, IconX } from './Icons';

interface Props {
  file?: UploadedFile;
  usedBy?: Requirement;
  onRemove: (id: string) => void;
  onClose?: () => void;
}

const ZOOMS = [0.75, 1, 1.25, 1.5, 2];

export function Preview({ file, usedBy, onRemove, onClose }: Props) {
  const { t, lang } = useI18n();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);

  const usable = file && !file.problem && !file.inspecting;

  useEffect(() => {
    setPage(1);
    setDoc(null);
    setFailed(false);
    if (!usable) return;
    let cancelled = false;
    let task: ReturnType<Awaited<ReturnType<typeof loadPdfJs>>['getDocument']> | undefined;
    loadPdfJs()
      .then((pdfjs) => {
        task = pdfjs.getDocument({ data: new Uint8Array(file.bytes.slice(0)) });
        if (cancelled) void task.destroy();
        return task.promise;
      })
      .then((d) => !cancelled && setDoc(d))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [file?.id, usable]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !width || !canvasRef.current) return;
    let task: RenderTask | undefined;
    let cancelled = false;
    void doc.getPage(page).then((p) => {
      if (cancelled || !canvasRef.current) return;
      const base = p.getViewport({ scale: 1 });
      const scale = ((width - 24) / base.width) * zoom;
      const dpr = window.devicePixelRatio || 1;
      const vp = p.getViewport({ scale: scale * dpr });
      const canvas = canvasRef.current;
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      canvas.style.width = `${Math.floor(vp.width / dpr)}px`;
      canvas.style.height = `${Math.floor(vp.height / dpr)}px`;
      task = p.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport: vp });
      task.promise.catch(() => undefined);
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, page, zoom, width]);

  const total = doc?.numPages ?? file?.pageCount ?? 0;
  const zi = ZOOMS.indexOf(zoom);

  return (
    <section className="card col col--preview" aria-labelledby="preview-title">
      <div className="col__head">
        <h2 id="preview-title">{t.previewTitle}</h2>
        {onClose && (
          <button type="button" className="icon-btn" aria-label={t.closePreview} onClick={onClose}>
            <IconX size={18} />
          </button>
        )}
      </div>

      <div className="preview__stage" ref={stageRef}>
        {!file && (
          <div className="preview__empty">
            <IconEye size={26} />
            <p>{t.previewEmpty}</p>
          </div>
        )}
        {file && (file.problem || failed) && (
          <div className="preview__empty preview__empty--red">
            <p>{file.problem ? t.problemHelp[file.problem] : t.previewUnavailable}</p>
          </div>
        )}
        {usable && !doc && !failed && (
          <div className="preview__empty">
            <IconSpinner size={22} />
          </div>
        )}
        <canvas ref={canvasRef} className="preview__canvas" hidden={!doc} aria-label={file ? `${file.name}, ${t.previewPage(page, total)}` : undefined} />
      </div>

      {doc && (
        <div className="preview__controls">
          <div className="preview__group">
            <button type="button" className="icon-btn" aria-label={t.prevPage} disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
              <IconChevron dir="left" size={18} />
            </button>
            <span className="preview__page" aria-live="polite">
              {t.previewPage(page, total)}
            </span>
            <button type="button" className="icon-btn" aria-label={t.nextPage} disabled={page >= total} onClick={() => setPage((n) => n + 1)}>
              <IconChevron size={18} />
            </button>
          </div>
          <div className="preview__group">
            <button type="button" className="icon-btn" aria-label={t.zoomOut} disabled={zi <= 0} onClick={() => setZoom(ZOOMS[zi - 1])}>
              <IconMinus size={16} />
            </button>
            <span className="preview__page">{digits(`${Math.round(zoom * 100)}%`, lang)}</span>
            <button type="button" className="icon-btn" aria-label={t.zoomIn} disabled={zi >= ZOOMS.length - 1} onClick={() => setZoom(ZOOMS[zi + 1])}>
              <IconPlus size={16} />
            </button>
          </div>
        </div>
      )}

      {file && (
        <div className="preview__file">
          <span className={`file__icon ${file.problem ? 'file__icon--problem' : ''}`} aria-hidden="true">
            PDF
          </span>
          <div className="preview__file-body">
            <p className="file__name" title={file.name}>
              {file.name}
            </p>
            <p className="file__meta">
              {file.pageCount !== undefined && <span>{t.pages(file.pageCount)}</span>}
              <span>{formatBytes(file.size, lang)}</span>
            </p>
            {usedBy && <p className="preview__used">{t.matchedTo(usedBy.order, lang === 'bn' ? usedBy.title_bn : usedBy.title_en)}</p>}
          </div>
          <button type="button" className="icon-btn" aria-label={t.removeFile(file.name)} title={t.removeFile(file.name)} onClick={() => onRemove(file.id)}>
            <IconTrash size={17} />
          </button>
        </div>
      )}
    </section>
  );
}
