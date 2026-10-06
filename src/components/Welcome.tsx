import type { RequirementsIssue } from '../lib/requirements';
import { useI18n } from '../i18nContext';
import { digits } from '../i18n';
import { IconAlert, IconFile } from './Icons';

interface Props {
  issues: RequirementsIssue[] | null;
  onOpen: () => void;
  onSample: () => void;
}

export function Welcome({ issues, onOpen, onSample }: Props) {
  const { t, lang } = useI18n();
  const steps = [t.stepLoad, t.stepUpload, t.stepMatch, t.stepGenerate];
  return (
    <main className="welcome" id="main">
      <section className="welcome__card" aria-labelledby="welcome-title">
        <div className="welcome__icon">
          <IconFile size={28} />
        </div>
        <h1 id="welcome-title">{t.welcomeTitle}</h1>
        <p className="welcome__body">{t.welcomeBody}</p>

        {issues && <RequirementsError issues={issues} />}

        <div className="welcome__actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={onOpen}>
            {t.openRequirements}
          </button>
          <button type="button" className="btn btn--secondary btn--lg" onClick={onSample}>
            {t.loadSample}
          </button>
        </div>
        <p className="welcome__hint">{t.dropJsonHint}</p>

        <ol className="steps">
          {steps.map((label, i) => (
            <li key={i} className={i === 0 ? 'steps__item steps__item--current' : 'steps__item'}>
              <span className="steps__num">{digits(i + 1, lang)}</span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

export function RequirementsError({ issues }: { issues: RequirementsIssue[] }) {
  const { t } = useI18n();
  return (
    <div className="alert alert--error" role="alert">
      <IconAlert size={20} />
      <div>
        <p className="alert__title">{t.reqErrorTitle}</p>
        <ul className="alert__list">
          {issues.slice(0, 6).map((issue, i) => (
            <li key={i}>{t.issue(issue)}</li>
          ))}
        </ul>
        <p className="alert__help">{t.reqErrorHelp}</p>
      </div>
    </div>
  );
}
