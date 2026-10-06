import { useRef, useState, type DragEvent } from 'react';
import type { DuplicateGroup } from '../lib/duplicates';
import type { Requirement, UploadedFile } from '../lib/types';
import { MAX_FILES, MAX_TOTAL_BYTES } from '../lib/pdfInfo';
import { digits, formatBytes } from '../i18n';
import { useI18n } from '../i18nContext';
import { FileCard } from './FileCard';
import { IconSparkle, IconUpload } from './Icons';

interface Props {
  files: UploadedFile[];
  groups: Map<string, DuplicateGroup>;
  usedBy: Map<string, Requirement>;
  suggestionCount: number;
  showSampleFiles: boolean;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onAcceptAllSuggestions: () => void;
  onLoadSampleFiles: () => void;
}

export function FilePanel(props: Props) {
  const { files, groups, usedBy, suggestionCount, onAddFiles } = props;
  const { t, lang } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const full = files.length >= MAX_FILES;

  // The window-level handler in App adds dropped files; this zone only gives visual feedback.
  const onDrop = () => setOver(false);

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept="application/pdf,.pdf"
      multiple
      hidden
      onChange={(e) => {
        const list = Array.from(e.target.files ?? []);
        e.target.value = '';
        if (list.length) onAddFiles(list);
      }}
    />
  );

  return (
    <section className="panel files" aria-labelledby="files-title">
      <div className="panel__head">
        <h2 id="files-title">{t.yourFiles}</h2>
        <span className="panel__count">
          {t.filesSummary(files.length, formatBytes(totalSize, lang))}
        </span>
      </div>
      <div className="meter" aria-hidden="true">
        <span style={{ width: `${Math.min(100, (totalSize / MAX_TOTAL_BYTES) * 100)}%` }} />
      </div>

      {picker}
      <div
        className={`dropzone ${over ? 'dropzone--over' : ''} ${files.length ? 'dropzone--compact' : ''}`}
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        {files.length === 0 ? (
          <>
            <span className="dropzone__icon">
              <IconUpload size={26} />
            </span>
            <p className="dropzone__title">{over ? t.dropActive : t.dropTitle}</p>
            <p className="dropzone__body">{t.dropBody}</p>
            <button type="button" className="btn btn--primary" onClick={() => inputRef.current?.click()}>
              {t.chooseFiles}
            </button>
            {props.showSampleFiles && (
              <button type="button" className="link-btn" onClick={props.onLoadSampleFiles}>
                {t.loadSampleFiles}
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className="dropzone__compact-btn"
            disabled={full}
            onClick={() => inputRef.current?.click()}
          >
            <IconUpload size={18} />
            <span>{over ? t.dropActive : t.addMore}</span>
            <span className="dropzone__limit">{digits(`${files.length}/${MAX_FILES}`, lang)}</span>
          </button>
        )}
      </div>

      {suggestionCount > 0 && (
        <div className="suggest-banner">
          <IconSparkle size={16} />
          <span>{t.suggestionsAvailable(suggestionCount)}</span>
          <button type="button" className="btn btn--small btn--secondary" onClick={props.onAcceptAllSuggestions}>
            {t.acceptAll}
          </button>
        </div>
      )}

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f) => (
            <FileCard
              key={f.id}
              file={f}
              group={groups.get(f.id)}
              others={files}
              usedBy={usedBy.get(f.id)}
              onRemove={() => props.onRemove(f.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
