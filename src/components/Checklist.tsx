import type { Dispatch } from 'react';
import type { DuplicateGroup } from '../lib/duplicates';
import { duplicateConflict } from '../lib/duplicates';
import type { Requirement, RequirementStatus, UploadedFile } from '../lib/types';
import type { Action, State } from '../store';
import { digits } from '../i18n';
import { useI18n } from '../i18nContext';
import { RequirementRow, type FileOption } from './RequirementRow';
import type { Blocker } from './GenerateBar';
import { IconAlert, IconCalendar, IconCheck, IconInfo, IconMinus, IconX } from './Icons';

export type Tab = 'checklist' | 'summary' | 'issues';

interface Props {
  state: State;
  requirements: Requirement[];
  statuses: Record<string, RequirementStatus>;
  groups: Map<string, DuplicateGroup>;
  suggestions: Record<string, string>;
  blockers: Blocker[];
  includeIndex: boolean;
  flashId?: string;
  tab: Tab;
  onTab: (tab: Tab) => void;
  onBlockerClick: (reqId: string) => void;
  onPreview: (fileId: string) => void;
  dispatch: Dispatch<Action>;
}

export function Checklist(p: Props) {
  const { state, requirements, statuses, groups, dispatch } = p;
  const { t } = useI18n();
  const deadline = state.data!.tender.submission_deadline;
  const byId = new Map(state.files.map((f) => [f.id, f]));
  const reqById = new Map(requirements.map((r) => [r.id, r]));
  const reqOfFile = new Map<string, Requirement>();
  for (const [reqId, fileId] of Object.entries(state.matches)) {
    const req = reqById.get(reqId);
    if (fileId && req) reqOfFile.set(fileId, req);
  }

  const optionsFor = (req: Requirement): FileOption[] =>
    state.files.map((f: UploadedFile) => {
      let disabledReason: string | undefined;
      const usedBy = reqOfFile.get(f.id);
      if (f.inspecting) disabledReason = t.stillChecking;
      else if (f.problem) disabledReason = `${t.problemShort[f.problem]}, ${t.unusable}`;
      else if (usedBy && usedBy.id !== req.id) disabledReason = t.usedElsewhere(usedBy.order);
      else {
        const conflict = duplicateConflict(f.id, req.id, groups, state.matches);
        if (conflict) {
          const other = byId.get(conflict.fileId);
          disabledReason = t.duplicateUsed(other?.name ?? '', reqById.get(conflict.reqId)?.order ?? 0);
        }
      }
      return { id: f.id, name: f.name, disabledReason };
    });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'checklist', label: t.tabChecklist },
    { id: 'summary', label: t.tabSummary },
    { id: 'issues', label: t.tabIssues(p.blockers.length) },
  ];

  return (
    <section className="card col col--checklist" aria-labelledby="checklist-title">
      <h2 id="checklist-title" className="visually-hidden">
        {t.requiredDocuments}
      </h2>
      <div className="tabs" role="tablist" aria-label={t.requiredDocuments}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={p.tab === tab.id}
            aria-controls={`panel-${tab.id}`}
            className={`tab ${tab.id === 'issues' && p.blockers.length ? 'tab--alert' : ''}`}
            onClick={() => p.onTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="col__scroll" id={`panel-${p.tab}`} role="tabpanel" aria-labelledby={`tab-${p.tab}`}>
        {p.tab === 'checklist' && (
          <>
            <p className="hint">
              <IconInfo size={16} />
              {t.checklistHint}
            </p>
            <div className="req-head" aria-hidden="true">
              <span>#</span>
              <span>{t.colDocument}</span>
              <span>{t.colFile}</span>
              <span>{t.colExpiry}</span>
              <span>{t.colStatus}</span>
            </div>
            <ol className="req-list">
              {requirements.map((req) => {
                const fileId = state.matches[req.id];
                const suggestedId = p.suggestions[req.id];
                return (
                  <RequirementRow
                    key={req.id}
                    req={req}
                    status={statuses[req.id]}
                    deadline={deadline}
                    file={fileId ? byId.get(fileId) : undefined}
                    expiry={state.expiries[req.id]}
                    options={optionsFor(req)}
                    suggestion={suggestedId ? byId.get(suggestedId) : undefined}
                    flash={p.flashId === req.id}
                    onMatch={(id) => dispatch({ type: 'match', reqId: req.id, fileId: id })}
                    onExpiry={(date) => dispatch({ type: 'setExpiry', reqId: req.id, date })}
                    onPreview={p.onPreview}
                  />
                );
              })}
            </ol>
          </>
        )}

        {p.tab === 'summary' && (
          <PackageSummary requirements={requirements} statuses={statuses} state={state} includeIndex={p.includeIndex} />
        )}

        {p.tab === 'issues' && <IssuesList blockers={p.blockers} onClick={p.onBlockerClick} />}
      </div>
    </section>
  );
}

function PackageSummary({ requirements, statuses, state, includeIndex }: { requirements: Requirement[]; statuses: Record<string, RequirementStatus>; state: State; includeIndex: boolean }) {
  const { t, lang } = useI18n();
  let page = includeIndex ? 3 : 2;
  const rows = requirements.map((req) => {
    const file = state.files.find((f) => f.id === state.matches[req.id]);
    const pages = file?.pageCount ?? 0;
    const from = page;
    if (file) page += pages;
    return { req, file, from, to: from + pages - 1, status: statuses[req.id] };
  });
  const total = page - 1;
  return (
    <div className="summary">
      <p className="hint">
        <IconInfo size={16} />
        {t.summaryIntro} {t.summaryTotal(total)}.
      </p>
      <ol className="summary__list">
        <li className="summary__item summary__item--front">
          <span className="summary__pages">{t.summaryPages(1, 1)}</span>
          <span className="summary__title">{t.summaryCover}</span>
        </li>
        {includeIndex && (
          <li className="summary__item summary__item--front">
            <span className="summary__pages">{t.summaryPages(2, 2)}</span>
            <span className="summary__title">{t.summaryIndex}</span>
          </li>
        )}
        {rows.map(({ req, file, from, to, status }) => (
          <li key={req.id} className={`summary__item ${file ? '' : 'summary__item--muted'}`}>
            <span className="summary__pages">{file ? t.summaryPages(from, to) : '—'}</span>
            <span className="summary__title">
              {digits(req.order, lang)}. {lang === 'bn' ? req.title_bn : req.title_en}
              {file && <span className="summary__file">{file.name}</span>}
            </span>
            <span className="summary__state">
              {file ? (
                status.blocking ? (
                  <IconAlert size={15} />
                ) : (
                  <IconCheck size={15} strokeWidth={2.6} />
                )
              ) : req.mandatory ? (
                <span className="summary__waiting">
                  <IconX size={14} /> {t.summaryWaiting}
                </span>
              ) : (
                <span className="summary__skipped">
                  <IconMinus size={14} /> {t.summarySkipped}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const ISSUE_ICON = { missing: IconX, expiry_needed: IconCalendar, expired: IconAlert } as const;

function IssuesList({ blockers, onClick }: { blockers: Blocker[]; onClick: (reqId: string) => void }) {
  const { t } = useI18n();
  if (!blockers.length) {
    return (
      <div className="empty-ok">
        <span className="empty-ok__icon">
          <IconCheck size={22} strokeWidth={2.6} />
        </span>
        <p>{t.noIssues}</p>
      </div>
    );
  }
  return (
    <ul className="issues">
      {blockers.map((b) => {
        const Icon = ISSUE_ICON[b.code as keyof typeof ISSUE_ICON] ?? IconAlert;
        return (
          <li key={b.reqId}>
            <button type="button" className={`issue issue--${b.code}`} onClick={() => onClick(b.reqId)}>
              <Icon size={16} strokeWidth={2.4} />
              <span>{b.text}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
