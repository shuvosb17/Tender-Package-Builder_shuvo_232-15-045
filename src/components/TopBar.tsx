import type { Lang } from '../i18n';
import { digits, formatDate } from '../i18n';
import { useI18n } from '../i18nContext';
import { daysBetween, localToday } from '../lib/dates';
import type { Tender } from '../lib/types';
import { IconCalendar, IconLock } from './Icons';

interface Props {
  tender?: Tender;
  onLangChange: (lang: Lang) => void;
  onChangeTender: () => void;
}

export function TopBar({ tender, onLangChange, onChangeTender }: Props) {
  const { t, lang } = useI18n();
  const daysLeft = tender ? daysBetween(localToday(), tender.submission_deadline) : 0;
  return (
    <header className="topbar">
      <div className="topbar__row">
        <div className="brand">
          <img src="./favicon.svg" alt="" width={28} height={28} />
          <span className="brand__name">{t.appName}</span>
        </div>
        <div className="topbar__right">
          <span className="privacy">
            <IconLock size={14} />
            {t.privacyNote}
          </span>
          <div className="lang-toggle" role="group" aria-label={t.langLabel}>
            <button type="button" lang="bn" aria-pressed={lang === 'bn'} onClick={() => onLangChange('bn')}>
              বাংলা
            </button>
            <button type="button" lang="en" aria-pressed={lang === 'en'} onClick={() => onLangChange('en')}>
              English
            </button>
          </div>
        </div>
      </div>

      {tender && (
        <div className="tender">
          <div className="tender__main">
            <div className="tender__eyebrow">
              <span className="tender__id">{tender.tender_id}</span>
              <button type="button" className="link-btn" onClick={onChangeTender}>
                {t.changeRequirements}
              </button>
            </div>
            <h1 className="tender__title">{tender.title}</h1>
            <dl className="tender__meta">
              <div>
                <dt>{t.procuringEntity}</dt>
                <dd>{tender.procuring_entity}</dd>
              </div>
              <div>
                <dt>{t.bidder}</dt>
                <dd>{tender.bidder}</dd>
              </div>
            </dl>
          </div>
          <div className={`deadline ${daysLeft < 0 ? 'deadline--past' : daysLeft <= 3 ? 'deadline--soon' : ''}`}>
            <span className="deadline__label">
              <IconCalendar size={14} />
              {t.deadline}
            </span>
            <time className="deadline__date" dateTime={tender.submission_deadline}>
              {formatDate(tender.submission_deadline, lang)}
            </time>
            <span className="deadline__iso">{digits(tender.submission_deadline, lang)}</span>
            <span className="deadline__left">{t.daysLeft(daysLeft)}</span>
          </div>
        </div>
      )}
    </header>
  );
}
