import type { StatusCode } from '../lib/types';
import { useI18n } from '../i18nContext';
import { IconAlert, IconCheck, IconDownload, IconSpinner, IconTable } from './Icons';

export interface Blocker {
  reqId: string;
  code: StatusCode;
  text: string;
}

interface Props {
  ready: number;
  total: number;
  blockers: Blocker[];
  progress: { done: number; total: number } | null;
  includeIndex: boolean;
  lastPackage: { url: string; name: string } | null;
  canExport: boolean;
  onIncludeIndex: (v: boolean) => void;
  onBlockerClick: (reqId: string) => void;
  onShowAllIssues: () => void;
  onGenerate: () => void;
  onExportCsv: () => void;
}

const VISIBLE = 3;

export function GenerateBar(p: Props) {
  const { t } = useI18n();
  const blocked = p.blockers.length > 0;
  const busy = Boolean(p.progress);
  const pct = p.total ? Math.round((p.ready / p.total) * 100) : 0;

  return (
    <section className="card genbar" id="generate-bar" aria-label={t.generate}>
      <div className="genbar__ready">
        <p className="genbar__count" aria-live="polite">
          {t.documentsReady(p.ready, p.total)}
        </p>
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="genbar__opts">
          <label className="check">
            <input type="checkbox" checked={p.includeIndex} onChange={(e) => p.onIncludeIndex(e.target.checked)} />
            <span>{t.includeIndex}</span>
          </label>
          <button type="button" className="link-btn link-btn--icon" onClick={p.onExportCsv} disabled={!p.canExport}>
            <IconTable size={15} />
            {t.exportCsv}
          </button>
        </div>
      </div>

      <div className={`issues-box ${blocked ? 'issues-box--blocked' : 'issues-box--ok'}`} role="status">
        {blocked ? (
          <>
            <div className="issues-box__head">
              <p className="issues-box__title">
                <IconAlert size={17} />
                {t.issuesTitle}
              </p>
              {p.blockers.length > 1 && (
                <button type="button" className="link-btn issues-box__more" onClick={p.onShowAllIssues}>
                  {t.showAll(p.blockers.length)}
                </button>
              )}
            </div>
            <ul className="issues-box__list">
              {p.blockers.slice(0, VISIBLE).map((b) => (
                <li key={b.reqId}>
                  <button type="button" className="issues-box__link" onClick={() => p.onBlockerClick(b.reqId)}>
                    {b.text}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="issues-box__title">
            <IconCheck size={18} strokeWidth={2.6} />
            {t.allSet}
          </p>
        )}
      </div>

      <div className="genbar__go-wrap">
        <button type="button" className="btn btn--primary btn--lg genbar__go" disabled={blocked || busy} onClick={p.onGenerate}>
          {busy ? <IconSpinner size={18} /> : <IconDownload size={18} />}
          {busy ? t.generating(p.progress!.done, p.progress!.total) : t.generate}
        </button>
        {p.lastPackage && !busy && !blocked ? (
          <a className="genbar__hint genbar__hint--link" href={p.lastPackage.url} download={p.lastPackage.name}>
            {t.downloadAgain}: {p.lastPackage.name}
          </a>
        ) : (
          blocked && <p className="genbar__hint">{t.generateHint}</p>
        )}
      </div>
    </section>
  );
}
