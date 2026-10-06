import type { DuplicateGroup } from '../lib/duplicates';
import type { Requirement, UploadedFile } from '../lib/types';
import { digits, formatBytes } from '../i18n';
import { useI18n } from '../i18nContext';
import { IconAlert, IconCheck, IconCopy, IconFile, IconLock, IconSpinner, IconX } from './Icons';

interface Props {
  file: UploadedFile;
  group?: DuplicateGroup;
  others: UploadedFile[];
  usedBy?: Requirement;
  onRemove: () => void;
}

export function FileCard({ file, group, others, usedBy, onRemove }: Props) {
  const { t, lang } = useI18n();
  const twins = group ? others.filter((o) => o.id !== file.id && group.fileIds.includes(o.id)) : [];
  const title = usedBy ? (lang === 'bn' ? usedBy.title_bn : usedBy.title_en) : '';
  const tone = file.problem ? 'file--problem' : usedBy ? 'file--used' : '';

  return (
    <li className={`file ${tone}`} data-dup={group ? group.index % 6 : undefined}>
      <div className="file__thumb" aria-hidden="true">
        {file.thumbnail ? (
          <img src={file.thumbnail} alt="" />
        ) : file.problem === 'encrypted' ? (
          <IconLock size={20} />
        ) : file.problem ? (
          <IconAlert size={20} />
        ) : file.inspecting ? (
          <IconSpinner size={18} />
        ) : (
          <IconFile size={20} />
        )}
      </div>
      <div className="file__body">
        <p className="file__name" title={file.name}>
          {file.name}
        </p>
        <p className="file__meta">
          {file.inspecting ? (
            <span className="file__checking">{t.checking}</span>
          ) : (
            <>
              {file.pageCount !== undefined && <span>{t.pages(file.pageCount)}</span>}
              <span>{formatBytes(file.size, lang)}</span>
            </>
          )}
        </p>

        {file.problem && (
          <p className="file__problem">
            <strong>{t.problemShort[file.problem]}.</strong>{' '}
            {t.problemHelp[file.problem]}
          </p>
        )}

        {group && (
          <p className="file__dup">
            <span className="dup-tag">
              <IconCopy size={12} />
              {t.duplicateBadge} {digits(String.fromCharCode(65 + group.index), lang)}
            </span>
            <span className="file__dup-text">{t.sameContentAs(twins.map((o) => o.name).join(', '))}</span>
          </p>
        )}

        {!file.problem && !file.inspecting && (
          <p className={`file__usage ${usedBy ? 'file__usage--used' : ''}`}>
            {usedBy ? (
              <>
                <IconCheck size={13} strokeWidth={2.6} />
                {t.matchedTo(usedBy.order, title)}
              </>
            ) : (
              t.notMatched
            )}
          </p>
        )}
      </div>
      <button type="button" className="icon-btn file__remove" aria-label={t.removeFile(file.name)} title={t.removeFile(file.name)} onClick={onRemove}>
        <IconX size={16} />
      </button>
    </li>
  );
}
