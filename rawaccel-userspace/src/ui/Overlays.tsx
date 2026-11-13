import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { Notification } from '../hooks/useNotifications';

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Keeps content mounted briefly after it closes so it can animate out.
function useExit(open: boolean, ms: number) {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (open) { setMounted(true); setLeaving(false); return; }
    if (!mounted) return;
    if (reduced()) { setMounted(false); return; }
    setLeaving(true);
    const timer = setTimeout(() => { setMounted(false); setLeaving(false); }, ms);
    return () => clearTimeout(timer);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return { mounted, leaving };
}

export function Modal({ isOpen, title, message, onClose, onConfirm, confirmLabel = 'Confirm' }: {
  isOpen: boolean; title: string; message: string; onClose: () => void; onConfirm?: () => void; confirmLabel?: string;
}) {
  const { mounted, leaving } = useExit(isOpen, 160);
  const content = useRef<HTMLDivElement>(null);
  const titleId = useId(), messageId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Keep the text visible while the dialog animates out.
  const shown = useRef({ title, message, onConfirm, confirmLabel });
  if (isOpen) shown.current = { title, message, onConfirm, confirmLabel };
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    content.current?.querySelector<HTMLElement>('button')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(content.current?.querySelectorAll<HTMLElement>('button') ?? []);
      const index = buttons.indexOf(document.activeElement as HTMLElement);
      event.preventDefault();
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, [isOpen]);
  if (!mounted) return null;
  const s = shown.current;
  const lines = s.message.split('\n');
  return <div className={`modal-back ${leaving ? 'out' : ''}`} onClick={isOpen ? onClose : undefined}>
    <div ref={content} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}
      onClick={event => event.stopPropagation()}>
      <h3 id={titleId}><AlertCircle size={18} aria-hidden="true" />{s.title}</h3>
      <p id={messageId}>{lines.map((line, i) => <Fragment key={i}>{line}{i < lines.length - 1 && <br />}</Fragment>)}</p>
      <div className="btn-row end">
        <button type="button" className="btn" onClick={onClose}>{s.onConfirm ? 'Cancel' : 'OK'}</button>
        {s.onConfirm && <button type="button" className="btn primary" onClick={() => { s.onConfirm!(); onClose(); }}>{s.confirmLabel}</button>}
      </div>
    </div>
  </div>;
}

export function Toast({ toast, onDismiss }: { toast: Notification; onDismiss: () => void }) {
  const { mounted, leaving } = useExit(toast.isOpen, 220);
  const shown = useRef(toast);
  if (toast.isOpen) shown.current = toast;
  if (!mounted) return null;
  return <div className="toasts">
    <div className={`toast notification-toast ${leaving ? 'out' : ''}`} role="status" aria-live="polite">
      <CheckCircle2 size={16} aria-hidden="true" />
      <div><b>{shown.current.title}</b><span>{shown.current.message}</span></div>
      <button type="button" className="toast-x" aria-label="Dismiss notification" onClick={onDismiss}><X size={14} /></button>
    </div>
  </div>;
}
