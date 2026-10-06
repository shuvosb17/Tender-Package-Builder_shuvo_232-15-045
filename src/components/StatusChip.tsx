import type { StatusCode } from '../lib/types';
import { useI18n } from '../i18nContext';
import { IconAlert, IconCalendar, IconCheck, IconMinus, IconX } from './Icons';

const ICONS: Record<StatusCode, typeof IconCheck> = {
  missing: IconX,
  expiry_needed: IconCalendar,
  expired: IconAlert,
  not_provided: IconMinus,
  ok: IconCheck,
};

export function StatusChip({ code }: { code: StatusCode }) {
  const { t } = useI18n();
  const Icon = ICONS[code];
  return (
    <span className={`chip chip--${code}`}>
      <Icon size={14} strokeWidth={2.6} />
      {t.status[code]}
    </span>
  );
}
