import { useId } from 'react';
import type { Requirement, RequirementStatus, UploadedFile } from '../lib/types';
import { digits } from '../i18n';
import { useI18n } from '../i18nContext';
import { StatusChip } from './StatusChip';
import { DateField } from './DateField';
import { IconCheck, IconSparkle, IconX } from './Icons';

export interface FileOption {
  id: string;
  name: string;
  disabledReason?: string;
}

interface Props {
  req: Requirement;
  status: RequirementStatus;
  deadline: string;
  file?: UploadedFile;
  expiry?: string;
  options: FileOption[];
  suggestion?: UploadedFile;
  flash: boolean;
  onMatch: (fileId: string | undefined) => void;
  onExpiry: (date: string) => void;
  onPreview: (fileId: string) => void;
}

export function RequirementRow({ req, status, deadline, file, expiry, options, suggestion, flash, onMatch, onExpiry, onPreview }: Props) {
  const { t, lang } = useI18n();
  const id = useId();
  const title = lang === 'bn' ? req.title_bn : req.title_en;
  const altTitle = lang === 'bn' ? req.title_en : req.title_bn;
  const reasonId = `${id}-reason`;
  const sameDay = status.code === 'ok' && req.has_expiry && expiry === deadline;

  return (
    <li id={`req-${req.id}`} className={`req req--${status.code} ${flash ? 'req--flash' : ''}`} aria-labelledby={`${id}-title`}>
      <div className="req__num" aria-hidden="true">
        {digits(req.order, lang)}
      </div>

      <div className="req__doc">
        <h3 id={`${id}-title`} className="req__title">
          <span className="visually-hidden">#{req.order} </span>
          {title}
        </h3>
        {altTitle && altTitle !== title && (
          <p className="req__alt" lang={lang === 'bn' ? 'en' : 'bn'}>
            {altTitle}
          </p>
        )}
        <div className="req__tags">
          <span className={`tag ${req.mandatory ? 'tag--required' : 'tag--optional'}`}>{req.mandatory ? t.required : t.optional}</span>
          {req.has_expiry && <span className="tag tag--expiry">{t.needsExpiry}</span>}
        </div>
      </div>

      <div className="req__file">
        <label htmlFor={`${id}-file`} className="cell-label">
          {t.fileLabel}
        </label>
        <div className="file-slot">
          <select
            id={`${id}-file`}
            className={`select ${file ? 'select--filled' : ''}`}
            value={file?.id ?? ''}
            onChange={(e) => onMatch(e.target.value || undefined)}
            disabled={options.length === 0}
          >
            <option value="">{options.length === 0 ? t.noFilesYet : t.chooseFile}</option>
            {options.map((o) => (
              <option key={o.id} value={o.id} disabled={Boolean(o.disabledReason)} title={o.disabledReason}>
                {o.disabledReason ? `${o.name} (${o.disabledReason})` : o.name}
              </option>
            ))}
          </select>
          {file && (
            <button type="button" className="icon-btn file-slot__remove" aria-label={`${t.removeMatch}: ${title}`} title={t.removeMatch} onClick={() => onMatch(undefined)}>
              <IconX size={16} />
            </button>
          )}
        </div>
        {file && file.pageCount !== undefined && (
          <button type="button" className="file-slot__meta" onClick={() => onPreview(file.id)}>
            {t.pages(file.pageCount)} · {t.previewTitle}
          </button>
        )}
        {!file && suggestion && (
          <div className="suggestion">
            <IconSparkle size={14} />
            <span className="suggestion__name" title={suggestion.name}>
              {t.suggested}: {suggestion.name}
            </span>
            <button type="button" className="btn btn--tiny btn--secondary" onClick={() => onMatch(suggestion.id)}>
              <IconCheck size={13} strokeWidth={2.6} />
              {t.useSuggestion}
            </button>
          </div>
        )}
      </div>

      <div className="req__expiry">
        <label htmlFor={`${id}-date`} className="cell-label">
          {t.expiryLabel}
        </label>
        {req.has_expiry && file ? (
          <>
            <DateField
              id={`${id}-date`}
              className={`input ${status.code === 'expiry_needed' ? 'input--attention' : ''} ${status.code === 'expired' ? 'input--error' : ''}`}
              value={expiry ?? ''}
              onChange={onExpiry}
              describedBy={status.code === 'expired' ? reasonId : `${id}-hint`}
              invalid={status.code === 'expired'}
            />
            <p id={`${id}-hint`} className={expiry ? 'visually-hidden' : 'cell-note'}>
              {t.expiryHint}
            </p>
          </>
        ) : (
          <span className="cell-empty" title={req.has_expiry ? t.noFilesYet : t.notNeeded}>
            {req.has_expiry ? '—' : t.notNeeded}
          </span>
        )}
      </div>

      <div className="req__status" aria-live="polite">
        <StatusChip code={status.code} />
        {status.code === 'expired' && status.expiry && (
          <p id={reasonId} className="status-reason status-reason--error">
            {t.expiredReason(digits(status.expiry, lang), digits(deadline, lang))}
          </p>
        )}
        {sameDay && <p className="status-reason status-reason--ok">{t.sameDayOk}</p>}
      </div>
    </li>
  );
}
