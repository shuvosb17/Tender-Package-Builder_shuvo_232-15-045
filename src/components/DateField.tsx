import { useEffect, useRef, useState } from 'react';
import { isIsoDate } from '../lib/dates';
import { useI18n } from '../i18nContext';
import { IconCalendar } from './Icons';

interface Props {
  id: string;
  value: string;
  className: string;
  describedBy?: string;
  invalid?: boolean;
  onChange: (date: string) => void;
}

function autoDash(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

export function DateField({ id, value, className, describedBy, invalid, onChange }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(value);
  const [left, setLeft] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const sent = useRef(value);

  useEffect(() => {
    if (value !== sent.current) {
      sent.current = value;
      setDraft(value);
    }
  }, [value]);

  const len = draft.length;
  const valid = isIsoDate(draft);
  const bad = len > 0 && !valid && (len === 10 || left);
  const errorId = `${id}-format`;

  const update = (next: string) => {
    setDraft(next);
    setLeft(false);
    const commit = isIsoDate(next) ? next : '';
    if (commit !== sent.current) {
      sent.current = commit;
      onChange(commit);
    }
  };

  return (
    <>
      <div className="date-field">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={t.datePlaceholder}
          maxLength={10}
          className={`${className} date-field__input ${bad ? 'input--error' : ''}`}
          value={draft}
          onChange={(e) => update(autoDash(e.target.value))}
          onBlur={() => setLeft(true)}
          aria-describedby={[bad ? errorId : '', describedBy ?? ''].filter(Boolean).join(' ') || undefined}
          aria-invalid={invalid || bad}
        />
        <button
          type="button"
          className="date-field__btn"
          aria-label={t.openCalendar}
          title={t.openCalendar}
          onClick={() => {
            const el = picker.current;
            if (!el) return;
            try {
              el.showPicker();
            } catch {
              el.focus();
            }
          }}
        >
          <IconCalendar size={16} />
        </button>
        <input
          ref={picker}
          type="date"
          className="date-field__native"
          tabIndex={-1}
          aria-hidden="true"
          value={valid ? draft : ''}
          onChange={(e) => update(e.target.value)}
        />
      </div>
      {bad && (
        <p id={errorId} className="status-reason status-reason--error">
          {t.dateFormatError}
        </p>
      )}
    </>
  );
}
