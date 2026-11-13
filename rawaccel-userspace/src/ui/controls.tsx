import { useId, useLayoutEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { NumberInput } from '../components/NumberInput';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// Arrow keys move between enabled items and activate them (radio semantics).
function arrowNavigate(event: KeyboardEvent<HTMLElement>, selector: string) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(selector)).filter(b => !b.disabled);
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0) return;
  event.preventDefault();
  const next = items[(index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length];
  next.focus();
  next.click();
}

export interface SegmentOption<T extends string> { value: T; label: ReactNode; disabled?: boolean; title?: string }

export function Segmented<T extends string>({ label, options, value, onChange, block = false, disabled = false, className = '' }: {
  label: string; options: SegmentOption<T>[]; value: T; onChange: (value: T) => void; block?: boolean; disabled?: boolean; className?: string;
}) {
  const k = Math.max(0, options.findIndex(option => option.value === value));
  return <div className={`seg ${block ? 'block' : ''} ${disabled ? 'is-disabled' : ''} ${className}`} role="radiogroup" aria-label={label}
    style={{ '--n': options.length, '--k': k } as CSSProperties} onKeyDown={event => arrowNavigate(event, 'button[role="radio"]')}>
    <span className="thumb" aria-hidden="true" />
    {options.map(option => <button key={option.value} type="button" role="radio" aria-checked={option.value === value}
      tabIndex={option.value === value ? 0 : -1} disabled={disabled || option.disabled} title={option.title}
      onClick={() => { if (option.value !== value) onChange(option.value); }}>{option.label}</button>)}
  </div>;
}

export function Check({ checked, onChange, title, description, disabled = false }: {
  checked: boolean; onChange: (checked: boolean) => void; title: ReactNode; description?: ReactNode; disabled?: boolean;
}) {
  const id = useId();
  return <label className="check" htmlFor={id}>
    <input type="checkbox" id={id} checked={checked} disabled={disabled} aria-labelledby={`${id}-t`}
      aria-describedby={description ? `${id}-d` : undefined} onChange={event => onChange(event.target.checked)} />
    <span className="box" aria-hidden="true"><svg viewBox="0 0 18 18"><path d="m4.5 9.3 3 3 6-6.6" /></svg></span>
    <span className="txt"><b id={`${id}-t`}>{title}</b>{description && <span id={`${id}-d`}>{description}</span>}</span>
  </label>;
}

export function Switch({ checked, onChange, title, description, disabled = false }: {
  checked: boolean; onChange: (checked: boolean) => void; title: ReactNode; description?: ReactNode; disabled?: boolean;
}) {
  const id = useId();
  return <label className="switch" htmlFor={id}>
    <span className="txt"><b id={`${id}-t`}>{title}</b>{description && <span id={`${id}-d`}>{description}</span>}</span>
    <input type="checkbox" id={id} checked={checked} disabled={disabled} aria-labelledby={`${id}-t`}
      aria-describedby={description ? `${id}-d` : undefined} onChange={event => onChange(event.target.checked)} />
    <span className="track" aria-hidden="true" />
  </label>;
}

// A slider for quick shaping beside a number box for exact values. The slider
// range is only a convenience: typed values outside it are kept as entered,
// and validation stays with validateSettings.
export function Field({ label, value, onChange, min, max, step, unit, hint, precision, integer = false, ariaLabel }: {
  label: ReactNode; value: number; onChange: (value: number) => void; min: number; max: number; step: number;
  unit?: string; hint?: ReactNode; precision?: number; integer?: boolean; ariaLabel?: string;
}) {
  const id = useId();
  const name = ariaLabel ?? (typeof label === 'string' ? label : undefined);
  const finite = Number.isFinite(value) ? value : 0;
  const percent = clamp(((finite - min) / (max - min)) * 100, 0, 100);
  const parse = (raw: string) => {
    const n = integer ? parseInt(raw, 10) : parseFloat(raw);
    return Number.isNaN(n) ? 0 : n;
  };
  return <div className="field">
    <div className="field-top"><label htmlFor={id}>{label}</label>{hint && <span className="hint">{hint}</span>}</div>
    <div className="field-ctl">
      <input type="range" min={min} max={max} step={step} value={clamp(finite, min, max)} tabIndex={-1}
        aria-label={name ? `${name} slider` : undefined} style={{ '--p': `${percent}%` } as CSSProperties}
        onChange={event => onChange(Number(event.target.value))} />
      <div className="numbox">
        <NumberInput id={id} className="num" value={value} step={String(step)} precision={precision} aria-label={name}
          onChange={event => onChange(parse(event.target.value))} />
        {unit && <span className="unit">{unit}</span>}
      </div>
    </div>
  </div>;
}

export interface TabItem<T extends string> { value: T; label: ReactNode }

export function Tabs<T extends string>({ label, tabs, value, onChange, idBase }: {
  label: string; tabs: TabItem<T>[]; value: T; onChange: (value: T) => void; idBase: string;
}) {
  const list = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const place = () => {
      const tab = list.current?.querySelector<HTMLElement>(`[data-tab="${value}"]`);
      if (tab && indicator.current) indicator.current.style.transform = `translateX(${tab.offsetLeft + 8}px) scaleX(${(tab.offsetWidth - 16) / 100})`;
    };
    place();
    const observer = new ResizeObserver(place);
    if (list.current) observer.observe(list.current);
    void document.fonts?.ready.then(place);
    return () => observer.disconnect();
  }, [value, tabs.length]);
  return <div className="tabs" role="tablist" aria-label={label} ref={list} onKeyDown={event => arrowNavigate(event, 'button[role="tab"]')}>
    <span className="tab-ind" ref={indicator} aria-hidden="true" />
    {tabs.map(tab => <button key={tab.value} type="button" role="tab" id={`${idBase}-tab-${tab.value}`} data-tab={tab.value}
      aria-selected={tab.value === value} aria-controls={`${idBase}-panel`} tabIndex={tab.value === value ? 0 : -1}
      onClick={() => onChange(tab.value)}>{tab.label}</button>)}
  </div>;
}

export function Callout({ tone = 'warn', children }: { tone?: 'warn' | 'info' | 'err'; children: ReactNode }) {
  return <div className={`callout ${tone}`} role={tone === 'err' ? 'alert' : 'note'}>
    <svg viewBox="0 0 24 24" aria-hidden="true">{tone === 'info'
      ? <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 11v6M12 7.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>
      : <><path d="M12 3 2 20h20L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 10v4M12 17v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>}</svg>
    <span>{children}</span>
  </div>;
}
