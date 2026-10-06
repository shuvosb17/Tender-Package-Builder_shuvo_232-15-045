import { useId } from 'react';
import type { Requirement, RequirementStatus, UploadedFile } from '../lib/types';
import { digits, formatBytes } from '../i18n';
import { useI18n } from '../i18nContext';
import { StatusChip } from './StatusChip';
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
}

export function RequirementRow({ req, status, deadline, file, expiry, options, suggestion, flash, onMatch, onExpiry }: Props) {
  const { t, lang } = useI18n();
  const id = useId();
  const title = lang === 'bn' ? req.title_bn : req.title_en;
  const altTitle = lang === 'bn' ? req.title_en : req.title_bn;
  const showExpiry = req.has_expiry && Boolean(file);
  const reasonId = `${id}-reason`;

  return (
    <li
      id={`req-${req.id}`}
      className={`req req--${status.code} ${flash ? 'req--flash' : ''}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="req__num" aria-hidden="true">
        {digits(String(req.order).padStart(2, '0'), lang)}
      </div>

      <div className="req__content">
        <div className="req__head">
          <div className="req__titles">
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
              <span className={`tag ${req.mandatory ? 'tag--required' : 'tag--optional'}`}>
                {req.mandatory ? t.required : t.optional}
              </span>
              {req.has_expiry && <span className="tag tag--plain">{t.needsExpiry}</span>}
            </div>
          </div>
          <div aria-live="polite" className="req__status">
            <StatusChip code={status.code} />
          </div>
        </div>

        <div className="req__controls">
          <div className="field field--file">
            <label htmlFor={`${id}-file`}>{t.fileLabel}</label>
            <div className="field__row">
              <select
                id={`${id}-file`}
                className={`select ${file ? 'select--filled' : ''}`}
                value={file?.id ?? ''}
                onChange={(e) => onMatch(e.target.value || undefined)}
                disabled={options.length === 0}
                aria-describedby={status.code === 'expired' ? reasonId : undefined}
              >
                <option value="">{options.length === 0 ? t.noFilesYet : t.chooseFile}</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id} disabled={Boolean(o.disabledReason)} title={o.disabledReason}>
                    {o.disabledReason ? `${o.name} (${o.disabledReason})` : o.name}
                  </option>
                ))}
              </select>
              {file && (
                <button type="button" className="btn btn--ghost" onClick={() => onMatch(undefined)}>
                  <IconX size={16} />
                  {t.removeMatch}
                </button>
              )}
            </div>
            {file && file.pageCount !== undefined && (
              <p className="field__note">
                {t.pages(file.pageCount)} · {formatBytes(file.size, lang)}
              </p>
            )}
            {!file && suggestion && (
              <div className="suggestion">
                <span className="suggestion__label">
                  <IconSparkle size={14} />
                  {t.suggested}:
                </span>
                <span className="suggestion__name" title={suggestion.name}>
                  {suggestion.name}
                </span>
                <button type="button" className="btn btn--small btn--secondary" onClick={() => onMatch(suggestion.id)}>
                  <IconCheck size={14} />
                  {t.useSuggestion}
                </button>
              </div>
            )}
          </div>

          {showExpiry && (
            <div className="field field--date">
              <label htmlFor={`${id}-date`}>{t.expiryLabel}</label>
              <input
                id={`${id}-date`}
                type="date"
                className={`input ${status.code === 'expiry_needed' ? 'input--attention' : ''} ${status.code === 'expired' ? 'input--error' : ''}`}
                value={expiry ?? ''}
                onChange={(e) => onExpiry(e.target.value)}
                aria-describedby={status.code === 'expired' ? reasonId : `${id}-hint`}
                aria-invalid={status.code === 'expired'}
              />
              <p id={`${id}-hint`} className="field__note">
                {t.expiryHint}
              </p>
            </div>
          )}
        </div>

        {status.code === 'expired' && status.expiry && (
          <p id={reasonId} className="req__reason req__reason--error">
            {t.expiredReason(digits(status.expiry, lang), digits(deadline, lang))}
          </p>
        )}
        {status.code === 'ok' && req.has_expiry && expiry === deadline && (
          <p className="req__reason req__reason--ok">{t.sameDayOk}</p>
        )}
      </div>
    </li>
  );
}
