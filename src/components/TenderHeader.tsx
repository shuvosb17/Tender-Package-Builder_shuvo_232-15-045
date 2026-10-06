import { digits, formatDate } from '../i18n';
import { useI18n } from '../i18nContext';
import { daysBetween, localToday } from '../lib/dates';
import type { Tender } from '../lib/types';
import { IconBuilding, IconCalendar, IconFile, IconUser } from './Icons';

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
  const tone = days < 0 ? 'past' : days <= 3 ? 'soon' : 'ok';

  return (
    <div className="head-row">
      <section className="card tender-card" aria-label={t.tenderId}>
        <div className="tender-card__icon" aria-hidden="true">
          <IconFile size={30} strokeWidth={1.6} />
        </div>
        <div className="tender-card__body">
          <div className="tender-card__top">
            <span className="eyebrow">{t.tenderId}</span>
            <span className="tender-card__id">{tender.tender_id}</span>
            <button type="button" className="link-btn" onClick={onChangeTender}>
              {t.changeRequirements}
            </button>
          </div>
          <h1 className="tender-card__title" title={tender.title}>{tender.title}</h1>
          <dl className="tender-facts">
            <div className="fact">
              <IconBuilding size={18} />
              <div>
                <dt>{t.procuringEntity}</dt>
                <dd>{tender.procuring_entity}</dd>
              </div>
            </div>
            <div className="fact">
              <IconUser size={18} />
              <div>
                <dt>{t.bidder}</dt>
                <dd>{tender.bidder}</dd>
              </div>
            </div>
            <div className={`fact fact--deadline fact--${tone}`}>
              <IconCalendar size={18} />
              <div>
                <dt>{t.deadline}</dt>
                <dd>
                  <time dateTime={tender.submission_deadline} title={formatDate(tender.submission_deadline, lang)}>
                    {digits(tender.submission_deadline, lang)}
                  </time>
                  <span className="fact__sub">{t.daysLeft(days)}</span>
                </dd>
              </div>
            </div>
          </dl>
        </div>
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
