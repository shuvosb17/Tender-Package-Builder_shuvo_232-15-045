import type { Dispatch } from 'react';
import type { DuplicateGroup } from '../lib/duplicates';
import { duplicateConflict } from '../lib/duplicates';
import type { Requirement, RequirementStatus, UploadedFile } from '../lib/types';
import type { Action, State } from '../store';
import { useI18n } from '../i18nContext';
import { RequirementRow, type FileOption } from './RequirementRow';

interface Props {
  state: State;
  requirements: Requirement[];
  statuses: Record<string, RequirementStatus>;
  groups: Map<string, DuplicateGroup>;
  suggestions: Record<string, string>;
  flashId?: string;
  readyText: string;
  dispatch: Dispatch<Action>;
}

export function Checklist({ state, requirements, statuses, groups, suggestions, flashId, readyText, dispatch }: Props) {
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

  return (
    <section className="panel checklist" aria-labelledby="checklist-title">
      <div className="panel__head">
        <h2 id="checklist-title">{t.requiredDocuments}</h2>
        <span className="panel__count">{readyText}</span>
      </div>
      <ol className="req-list">
        {requirements.map((req) => {
          const fileId = state.matches[req.id];
          const suggestedId = suggestions[req.id];
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
              flash={flashId === req.id}
              onMatch={(id) => dispatch({ type: 'match', reqId: req.id, fileId: id })}
              onExpiry={(date) => dispatch({ type: 'setExpiry', reqId: req.id, date })}
            />
          );
        })}
      </ol>
    </section>
  );
}
