import type { Lang } from '../i18n';
import { digits } from '../i18n';
import { useI18n } from '../i18nContext';
import { IconCheck, IconLock } from './Icons';

interface Props {
  done: boolean[];
  enabled: boolean[];
  onStep: (index: number) => void;
  onLangChange: (lang: Lang) => void;
}

export function Sidebar({ done, enabled, onStep, onLangChange }: Props) {
  const { t, lang } = useI18n();
  const current = done.findIndex((d) => !d);
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="./favicon.svg" alt="" width={34} height={34} />
        <span className="brand__name">{t.appName}</span>
      </div>

      <nav aria-label={t.stepsLabel}>
        <ol className="nav-steps">
          {t.navSteps.map((label, i) => {
            const state = done[i] ? 'done' : i === current ? 'current' : 'todo';
            return (
              <li key={i}>
                <button
                  type="button"
                  className={`nav-step nav-step--${state}`}
                  disabled={!enabled[i]}
                  aria-current={state === 'current' ? 'step' : undefined}
                  onClick={() => onStep(i)}
                >
                  <span className="nav-step__num" aria-hidden="true">
                    {done[i] ? <IconCheck size={15} strokeWidth={3} /> : digits(i + 1, lang)}
                  </span>
                  <span className="nav-step__label">{label}</span>
                  <span className="visually-hidden">
                    {done[i] ? `, ${t.stepDone}` : state === 'current' ? `, ${t.stepCurrent}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="sidebar__foot">
        <div className="lang-toggle" role="group" aria-label={t.langLabel}>
          <button type="button" lang="en" aria-pressed={lang === 'en'} onClick={() => onLangChange('en')}>
            English
          </button>
          <button type="button" lang="bn" aria-pressed={lang === 'bn'} onClick={() => onLangChange('bn')}>
            বাংলা
          </button>
        </div>
        <p className="privacy">
          <IconLock size={14} />
          <span>{t.privacyNote}</span>
        </p>
      </div>
    </aside>
  );
}
