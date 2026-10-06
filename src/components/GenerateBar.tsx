import { useState } from 'react';
import type { StatusCode } from '../lib/types';
import { useI18n } from '../i18nContext';
import { IconAlert, IconCalendar, IconCheck, IconDownload, IconSpinner, IconTable, IconX } from './Icons';

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
  onGenerate: () => void;
  onExportCsv: () => void;
}

const BLOCKER_ICON = { missing: IconX, expiry_needed: IconCalendar, expired: IconAlert } as const;

const COLLAPSED = 3;

export function GenerateBar(p: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const blocked = p.blockers.length > 0;
  const busy = Boolean(p.progress);
  const pct = p.total ? Math.round((p.ready / p.total) * 100) : 0;

  return (
    <footer className="genbar" aria-label={t.generate}>
      <div className="genbar__inner">
        <div className="genbar__progress">
          <div className="ring" style={{ ['--pct' as string]: `${pct}` }} aria-hidden="true">
            <span>{blocked ? <IconAlert size={16} /> : <IconCheck size={18} strokeWidth={2.6} />}</span>
          </div>
          <div>
            <p className="genbar__ready" aria-live="polite">
              {t.checklistSummary(p.ready, p.total)}
            </p>
            <p className={`genbar__state ${blocked ? 'genbar__state--blocked' : 'genbar__state--ok'}`}>
              {blocked ? t.blockersTitle(p.blockers.length) : t.allSet}
            </p>
          </div>
        </div>

        {blocked && (
          <ul className={`blockers ${expanded ? 'blockers--expanded' : ''}`} aria-label={t.blockersTitle(p.blockers.length)}>
            {(expanded ? p.blockers : p.blockers.slice(0, COLLAPSED)).map((b) => {
              const Icon = BLOCKER_ICON[b.code as keyof typeof BLOCKER_ICON] ?? IconAlert;
              return (
                <li key={b.reqId}>
                  <button type="button" className={`blocker blocker--${b.code}`} onClick={() => p.onBlockerClick(b.reqId)}>
                    <Icon size={14} strokeWidth={2.4} />
                    <span>{b.text}</span>
                  </button>
                </li>
              );
            })}
            {p.blockers.length > COLLAPSED && (
              <li>
                <button type="button" className="blocker blocker--more" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
                  {expanded ? t.showLess : t.showAll(p.blockers.length)}
                </button>
              </li>
            )}
          </ul>
        )}

        <div className="genbar__actions">
          <label className="check">
            <input type="checkbox" checked={p.includeIndex} onChange={(e) => p.onIncludeIndex(e.target.checked)} />
            <span>{t.includeIndex}</span>
          </label>
          <button type="button" className="btn btn--secondary" onClick={p.onExportCsv} disabled={!p.canExport}>
            <IconTable size={16} />
            {t.exportCsv}
          </button>
          {p.lastPackage && !busy && (
            <a className="btn btn--ghost" href={p.lastPackage.url} download={p.lastPackage.name}>
              <IconDownload size={16} />
              {t.downloadAgain}
            </a>
          )}
          <button
            type="button"
            className="btn btn--primary btn--lg genbar__go"
            disabled={blocked || busy}
            aria-disabled={blocked || busy}
            onClick={p.onGenerate}
          >
            {busy ? <IconSpinner size={18} /> : <IconDownload size={18} />}
            {busy ? t.generating(p.progress!.done, p.progress!.total) : t.generate}
          </button>
        </div>
      </div>
    </footer>
  );
}
