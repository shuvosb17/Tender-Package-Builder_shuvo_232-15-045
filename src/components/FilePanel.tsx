import { useRef, useState } from 'react';
import type { DuplicateGroup } from '../lib/duplicates';
import type { Requirement, UploadedFile } from '../lib/types';
import { MAX_FILES, MAX_TOTAL_BYTES } from '../lib/pdfInfo';
import { digits, formatBytes } from '../i18n';
import { useI18n } from '../i18nContext';
import { FileCard } from './FileCard';
import { IconPlus, IconSparkle, IconUpload } from './Icons';

interface Props {
  files: UploadedFile[];
  groups: Map<string, DuplicateGroup>;
  usedBy: Map<string, Requirement>;
  suggestionCount: number;
  showSampleFiles: boolean;
  selectedId?: string;
  onSelect: (id: string) => void;
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
  const [sort, setSort] = useState<'upload' | 'name'>('upload');
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const full = files.length >= MAX_FILES;
  const sorted = sort === 'name' ? [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })) : files;

  return (
    <section className="card col col--files" id="files-panel" aria-labelledby="files-title">
      <div className="col__head">
        <h2 id="files-title">
          {t.uploadedFiles}{' '}
          <span className="col__count">{digits(`${files.length} / ${MAX_FILES}`, lang)}</span>
        </h2>
        <button type="button" className="btn btn--primary btn--small" disabled={full} onClick={() => inputRef.current?.click()}>
          <IconPlus size={16} strokeWidth={2.4} />
          {t.addShort}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        id="file-input"
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (list.length) onAddFiles(list);
        }}
      />

      <div className="col__scroll">
        <div
          className={`dropzone ${over ? 'dropzone--over' : ''} ${files.length ? 'dropzone--compact' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={() => setOver(false)}
        >
          <span className="dropzone__icon">
            <IconUpload size={files.length ? 18 : 24} />
          </span>
          <div className="dropzone__text">
            <p className="dropzone__title">{over ? t.dropActive : files.length ? t.dropMore : t.dropTitle}</p>
            <p className="dropzone__body">{t.filesSummary(files.length, formatBytes(totalSize, lang))}</p>
          </div>
          {!files.length && (
            <>
              <p className="dropzone__body">{t.dropBody}</p>
              <button type="button" className="btn btn--secondary btn--small" onClick={() => inputRef.current?.click()}>
                {t.chooseFiles}
              </button>
              {props.showSampleFiles && (
                <button type="button" className="link-btn" onClick={props.onLoadSampleFiles}>
                  {t.loadSampleFiles}
                </button>
              )}
            </>
          )}
        </div>
        <div className="meter" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (totalSize / MAX_TOTAL_BYTES) * 100)}%` }} />
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

        {files.length > 1 && (
          <label className="sort">
            <span>{t.sortBy}:</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as 'upload' | 'name')}>
              <option value="upload">{t.sortUpload}</option>
              <option value="name">{t.sortName}</option>
            </select>
          </label>
        )}

        {files.length > 0 && (
          <ul className="file-list">
            {sorted.map((f) => (
              <FileCard
                key={f.id}
                file={f}
                group={groups.get(f.id)}
                others={files}
                usedBy={usedBy.get(f.id)}
                selected={props.selectedId === f.id}
                onSelect={() => props.onSelect(f.id)}
                onRemove={() => props.onRemove(f.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
