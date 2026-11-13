import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Copy, MoreHorizontal, PenLine, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { Profile } from '../types';
import { MAX_PROFILES } from '../profileState';
import { driverStatusView, type DriverStatusSnapshot } from '../driverStatus';

export function ProfileTabs({ profiles, active, dirty, renaming, setRenaming, onSelect, onRename }: {
  profiles: Profile[]; active: number; dirty: Set<string>; renaming: number | null; setRenaming: (index: number | null) => void;
  onSelect: (index: number) => void; onRename: (index: number, name: string) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const known = useRef(new Set(profiles.map(p => p.id)));
  const fresh = profiles.filter(p => !known.current.has(p.id)).map(p => p.id);
  useEffect(() => { known.current = new Set(profiles.map(p => p.id)); });

  useLayoutEffect(() => {
    const place = () => {
      const tab = list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
      if (!tab || !indicator.current || !pill.current) return;
      indicator.current.style.transform = `translateX(${tab.offsetLeft + 10}px) scaleX(${(tab.offsetWidth - 20) / 100})`;
      pill.current.style.transform = `translateX(${tab.offsetLeft}px) scaleX(${tab.offsetWidth / 100})`;
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    place();
    const observer = new ResizeObserver(place);
    if (list.current) observer.observe(list.current);
    void document.fonts?.ready.then(place);
    return () => observer.disconnect();
  }, [active, renaming, profiles.map(p => `${p.id}:${p.name}`).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="profiles" role="tablist" aria-label="Profiles" ref={list}
    onKeyDown={event => {
      if (renaming !== null || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
      event.preventDefault();
      const next = (active + (event.key === 'ArrowRight' ? 1 : -1) + profiles.length) % profiles.length;
      onSelect(next);
      requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus());
    }}>
    <span className="ptab-bg" ref={pill} aria-hidden="true" />
    <span className="ptab-ind" ref={indicator} aria-hidden="true" />
    {profiles.map((profile, index) => renaming === index
      ? <RenameField key={profile.id} name={profile.name} onDone={name => { setRenaming(null); if (name !== null && name.trim() && name !== profile.name) onRename(index, name); }} />
      : <button key={profile.id} type="button" role="tab" data-index={index} aria-selected={index === active} tabIndex={index === active ? 0 : -1}
          className={`ptab ${dirty.has(profile.id) ? 'is-dirty' : ''} ${fresh.includes(profile.id) ? 'enter' : ''}`}
          title="Double-click to rename" onClick={() => onSelect(index)} onDoubleClick={() => { onSelect(index); setRenaming(index); }}
          onKeyDown={event => { if (event.key === 'F2') setRenaming(index); }}>
          <span className="mode-dot" aria-hidden="true" /><span className="pname">{profile.name}</span>
          <span className="dirty" aria-hidden="true" />{dirty.has(profile.id) && <span className="sr">(unsaved)</span>}
        </button>)}
  </div>;
}

// Rename commits once on Enter or blur, so a duplicate name is reported once.
function RenameField({ name, onDone }: { name: string; onDone: (name: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  const finish = (value: string | null) => { if (done.current) return; done.current = true; onDone(value); };
  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);
  return <span className="ptab renaming"><span className="mode-dot" aria-hidden="true" />
    <input ref={input} className="rename" aria-label="Profile name" defaultValue={name} maxLength={255}
      onKeyDown={event => { if (event.key === 'Enter') finish(event.currentTarget.value); if (event.key === 'Escape') finish(null); }}
      onBlur={event => finish(event.currentTarget.value)} /></span>;
}

export function ProfileMenu({ count, activeName, onRename, onDuplicate, onReset, onDelete }: {
  count: number; activeName: string; onRename: () => void; onDuplicate: () => void; onReset: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && !button.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [open]);
  const toggle = () => {
    const r = button.current!.getBoundingClientRect();
    setPosition({ left: Math.min(r.left, window.innerWidth - 230), top: r.bottom + 6 });
    setOpen(value => !value);
  };
  const run = (action: () => void) => { setOpen(false); button.current?.focus(); action(); };
  return <>
    <button ref={button} type="button" className="icon-btn" aria-label="Profile actions" title="Profile actions"
      aria-haspopup="menu" aria-expanded={open} onClick={toggle}><MoreHorizontal size={17} /></button>
    {open && <div ref={menu} className="menu" role="menu" style={position}
      onKeyDown={event => {
        if (event.key === 'Escape') { setOpen(false); button.current?.focus(); }
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const items = Array.from(menu.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
      }}>
      <button type="button" role="menuitem" onClick={() => run(onRename)}><PenLine size={14} />Rename</button>
      <button type="button" role="menuitem" disabled={count >= MAX_PROFILES} onClick={() => run(onDuplicate)}><Copy size={14} />Duplicate</button>
      <button type="button" role="menuitem" onClick={() => run(onReset)}><RotateCcw size={14} />Reset curve to defaults</button>
      <hr />
      <button type="button" role="menuitem" className="danger" disabled={count <= 1} onClick={() => run(onDelete)}><Trash2 size={14} />Delete {activeName}</button>
    </div>}
  </>;
}

export function AddProfileButton({ count, onAdd }: { count: number; onAdd: () => void }) {
  const full = count >= MAX_PROFILES;
  return <button type="button" className="icon-btn" aria-label="Add new profile" title={full ? `Maximum ${MAX_PROFILES} profiles allowed` : 'Add new profile'}
    disabled={full} onClick={onAdd}><Plus size={17} /></button>;
}

export function DriverChip({ snapshot, onOpen }: { snapshot: DriverStatusSnapshot; onOpen: () => void }) {
  const view = driverStatusView(snapshot);
  const tone = view.tone === 'success' ? 'ok' : view.tone === 'warning' ? 'warn' : view.tone === 'error' ? 'err' : 'neutral';
  return <button type="button" className="chip" data-tone={tone} title={`${view.description} Open driver details.`} onClick={onOpen}>
    <span className="led" aria-hidden="true" /><span role="status" aria-live="polite">{view.label}</span>
  </button>;
}

export function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: (origin: Element) => void }) {
  return <button type="button" className={`icon-btn theme-btn ${dark ? 'is-dark' : ''}`} aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}
    title={`Switch to ${dark ? 'light' : 'dark'} theme`} onClick={event => onToggle(event.currentTarget)}>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <mask id="theme-moon-mask"><rect x="-4" y="-4" width="32" height="32" fill="#fff" /><circle className="mask-dot" cx="25" cy="2" r="6" fill="#000" /></mask>
      <circle className="core" cx="12" cy="12" r="4.6" fill="currentColor" mask="url(#theme-moon-mask)" />
      <g className="rays" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 1.8v2.2M12 20v2.2M1.8 12H4M20 12h2.2M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6" />
      </g>
    </svg>
  </button>;
}

type ApplyState = 'idle' | 'busy' | 'done' | 'warn';
const APPLY_LABEL: Record<ApplyState, string> = { idle: 'Apply & Save', busy: 'Applying', done: 'Applied & saved', warn: 'Applied · not saved' };

// The operation resolves true for a full success, false for a partial one
// (applied but not saved) and rejects when nothing was applied.
export function ApplyButton({ onApply, disabledReason, onBlocked }: {
  onApply: () => Promise<boolean | void>; disabledReason: string | null; onBlocked: (reason: string) => void;
}) {
  const [state, setState] = useState<ApplyState>('idle');
  const [shake, setShake] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); }, []);
  const click = async () => {
    if (state !== 'idle') return;
    if (disabledReason) { setShake(n => n + 1); onBlocked(disabledReason); return; }
    setState('busy');
    try {
      const result = await onApply();
      if (!mounted.current) return;
      setState(result === false ? 'warn' : 'done');
      timer.current = setTimeout(() => { if (mounted.current) setState('idle'); }, 1900);
    } catch {
      if (mounted.current) { setState('idle'); setShake(n => n + 1); }
    }
  };
  return <button type="button" className={`apply ${shake ? `shake-${shake % 2}` : ''}`} data-state={state} aria-label={APPLY_LABEL[state]}
    aria-busy={state === 'busy'} aria-disabled={disabledReason !== null || state !== 'idle'} title={disabledReason ?? 'Apply all profiles and device settings, then save to disk'}
    onClick={() => void click()}>
    <span className="st-idle" aria-hidden="true">Apply &amp; Save</span>
    <span className="st-busy" aria-hidden="true"><svg className="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 60" strokeLinecap="round" /></svg>Applying</span>
    <span className="st-done" aria-hidden="true"><svg className="tick" width="16" height="16" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>Applied &amp; saved</span>
    <span className="st-warn" aria-hidden="true">Applied · not saved</span>
  </button>;
}
