import { digits, formatDate } from '../i18n';
import { useI18n } from '../i18nContext';
import { daysBetween, localToday } from '../lib/dates';
import type { Tender } from '../lib/types';
import { IconBriefcase, IconBuilding, IconCalendar, IconUser } from './Icons';

interface Counts {
  ok: number;
  attention: number;
  missing: number;
  optional: number;
  total: number;
}

export function TenderHeader({ tender, counts, onChangeTender }: { tender: Tender; counts: Counts; onChangeTender: () => void }) {
  const { t, lang } = useI18n();
  const days = daysBetween(localToday(), tender.submission_deadline);
  const pct = counts.total ? Math.round((counts.ok / counts.total) * 100) : 0;
  const tone = days < 0 || days <= 2 ? 'urgent' : days <= 7 ? 'soon' : 'ok';

  return (
    <div className="head-row">
      <section className="card tender-card" aria-label={t.tenderId}>
        <div className="tender-card__icon" aria-hidden="true">
          <IconBriefcase size={24} strokeWidth={1.7} />
        </div>
        <div className="tender-card__body">
          <div className="tender-card__top">
            <span className="eyebrow">{t.tenderId}</span>
            <span className="tender-card__id">{tender.tender_id}</span>
            <button type="button" className="link-btn tender-card__change" onClick={onChangeTender}>
              {t.changeRequirements}
            </button>
          </div>
          <h1 className="tender-card__title" title={tender.title}>
            {tender.title}
          </h1>
          <dl className="tender-facts">
            <div className="fact">
              <dt>
                <IconBuilding size={15} />
                {t.procuringEntity}
              </dt>
              <dd>{tender.procuring_entity}</dd>
            </div>
            <div className="fact">
              <dt>
                <IconUser size={15} />
                {t.bidder}
              </dt>
              <dd>{tender.bidder}</dd>
            </div>
          </dl>
        </div>
        <dl className={`deadline deadline--${tone}`}>
          <dt className="deadline__label">
            <IconCalendar size={15} />
            {t.deadline}
          </dt>
          <dd className="deadline__value">
            <time dateTime={tender.submission_deadline} title={formatDate(tender.submission_deadline, lang)}>
              {digits(tender.submission_deadline, lang)}
            </time>
            <span className="deadline__left">{t.daysLeft(days)}</span>
          </dd>
        </dl>
      </section>

      <section className="card progress-card" aria-labelledby="progress-title">
        <h2 id="progress-title" className="progress-card__title">
          {t.progress}
        </h2>
        <div className="progress-card__body">
          <div className="ring ring--lg" style={{ ['--pct' as string]: `${pct}` }} role="img" aria-label={`${pct}%`}>
            <span>{digits(`${pct}%`, lang)}</span>
          </div>
          <ul className="legend">
            <li className="legend--ok">{t.legendOk(counts.ok)}</li>
            <li className="legend--attention">{t.legendAttention(counts.attention)}</li>
            <li className="legend--missing">{t.legendMissing(counts.missing)}</li>
            {counts.optional > 0 && <li className="legend--optional">{t.legendOptional(counts.optional)}</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
