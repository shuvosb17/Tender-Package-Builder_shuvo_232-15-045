import type { Dict } from '../i18n';
import { useI18n } from '../i18nContext';
import { IconAlert, IconCheck, IconInfo, IconX } from './Icons';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  /** Rendered with the current dictionary, so toasts follow the language toggle. */
  message: (t: Dict) => string;
}

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  const { t } = useI18n();
  const errors = toasts.filter((x) => x.kind === 'error');
  const others = toasts.filter((x) => x.kind !== 'error');
  const render = (toast: Toast) => {
    const Icon = toast.kind === 'success' ? IconCheck : toast.kind === 'error' ? IconAlert : IconInfo;
    return (
      <div key={toast.id} className={`toast toast--${toast.kind}`}>
        <span className="toast__icon">
          <Icon size={18} />
        </span>
        <p className="toast__text">{toast.message(t)}</p>
        <button type="button" className="icon-btn icon-btn--sm" aria-label={t.dismiss} onClick={() => onDismiss(toast.id)}>
          <IconX size={16} />
        </button>
      </div>
    );
  };
  return (
    <div className="toasts">
      <div role="alert" aria-live="assertive" className="toasts__group">
        {errors.map(render)}
      </div>
      <div role="status" aria-live="polite" className="toasts__group">
        {others.map(render)}
      </div>
    </div>
  );
}
