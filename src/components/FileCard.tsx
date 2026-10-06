import type { DuplicateGroup } from '../lib/duplicates';
import type { Requirement, UploadedFile } from '../lib/types';
import { formatBytes } from '../i18n';
import { useI18n } from '../i18nContext';
import { IconAlert, IconCheck, IconCopy, IconLock, IconSpinner, IconX } from './Icons';

interface Props {
  file: UploadedFile;
  group?: DuplicateGroup;
  others: UploadedFile[];
  usedBy?: Requirement;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

export function FileCard({ file, group, others, usedBy, selected, onSelect, onRemove }: Props) {
  const { t, lang } = useI18n();
  const twins = group ? others.filter((o) => o.id !== file.id && group.fileIds.includes(o.id)) : [];
  const title = usedBy ? (lang === 'bn' ? usedBy.title_bn : usedBy.title_en) : '';
  const tone = file.problem ? 'file--problem' : usedBy ? 'file--used' : '';

  return (
    <li className={`file ${tone} ${selected ? 'file--selected' : ''}`} data-dup={group ? group.index % 6 : undefined}>
      <button type="button" className="file__main" onClick={onSelect} aria-label={t.previewFile(file.name)} aria-pressed={selected}>
        <span className={`file__icon ${file.problem ? 'file__icon--problem' : ''}`} aria-hidden="true">
          {file.inspecting ? (
            <IconSpinner size={16} />
          ) : file.problem === 'encrypted' ? (
            <IconLock size={16} />
          ) : file.problem ? (
            <IconAlert size={16} />
          ) : (
            'PDF'
          )}
        </span>
        <span className="file__body">
          <span className="file__name" title={file.name}>
            {file.name}
          </span>
          <span className="file__meta">
            {file.inspecting ? (
              <span className="file__checking">{t.checking}</span>
            ) : (
              <>
                {file.pageCount !== undefined && <span>{t.pages(file.pageCount)}</span>}
                <span>{formatBytes(file.size, lang)}</span>
              </>
            )}
          </span>
          <span className="file__badges">
          {file.problem && <span className="badge badge--red">{t.problemShort[file.problem]}</span>}
          {group && (
            <span className="badge badge--dup">
              <IconCopy size={11} />
              {t.duplicateBadge} {String.fromCharCode(65 + group.index)}
            </span>
          )}
          {usedBy && !file.problem && (
            <span className="badge badge--green" title={t.matchedTo(usedBy.order, title)}>
              <IconCheck size={11} strokeWidth={3} />
              {t.matchedTo(usedBy.order, title)}
            </span>
          )}
          </span>
        </span>
      </button>
      <button type="button" className="icon-btn icon-btn--sm file__remove" aria-label={t.removeFile(file.name)} title={t.removeFile(file.name)} onClick={onRemove}>
        <IconX size={15} />
      </button>

      {file.problem && <p className="file__note file__note--red">{t.problemHelp[file.problem]}</p>}
      {group && <p className="file__note">{t.sameContentAs(twins.map((o) => o.name).join(', '))}</p>}
      {!usedBy && !file.problem && !file.inspecting && <span className="visually-hidden">{t.notMatched}</span>}
    </li>
  );
}
