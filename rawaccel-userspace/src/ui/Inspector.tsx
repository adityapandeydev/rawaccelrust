import { useState } from 'react';
import { defaultAccelArgs, type AccelArgs } from '../types';
import type { ProfileEditor } from '../hooks/useProfileEditor';
import type { Notify } from '../hooks/useNotifications';
import { sampleCurve } from './graphSeries';
import { Field, Tabs } from './controls';
import { CurvePanel } from './CurvePanel';

const MODES: { id: string; label: string; sample: Partial<AccelArgs> }[] = [
  { id: 'noaccel', label: 'Off', sample: {} },
  { id: 'linear', label: 'Linear', sample: { acceleration: 0.03, cap_mode: 'out', cap: { x: 0, y: 2.2 } } },
  { id: 'classic', label: 'Classic', sample: { acceleration: 0.03, exponent_classic: 2.6, cap_mode: 'out', cap: { x: 0, y: 2.2 } } },
  { id: 'natural', label: 'Natural', sample: { decay_rate: 0.12, limit: 1.8 } },
  { id: 'jump', label: 'Jump', sample: { smooth: 0.2, cap: { x: 30, y: 1.8 } } },
  { id: 'power', label: 'Power', sample: { scale: 1, exponent_power: 0.3 } },
  { id: 'synchronous', label: 'Synchronous', sample: { motivity: 1.8, sync_speed: 30, gamma: 1, smooth: 0.5 } },
  { id: 'lookup', label: 'Lookup', sample: { gain: false, lookup_table: [{ x: 0.1, y: 1 }, { x: 20, y: 1.15 }, { x: 45, y: 1.6 }, { x: 80, y: 1.7 }] } },
  { id: 'tiered', label: 'Tiered', sample: { t_type: 'linear', tiered_multiplier1: 1, tiered_multiplier2: 1.6, tiered_multiplier3: 2.2,
    tiered_input_offset1: 8, tiered_transition1: 12, tiered_input_offset2: 40, tiered_transition2: 14 } },
];

// Each tile draws its mode's real curve, scaled to the tile.
function glyphPath(mode: string, sample: Partial<AccelArgs>) {
  const s = sampleCurve({ ...defaultAccelArgs(), gain: false, ...sample, mode } as AccelArgs, 80, 41).sensitivity;
  const finite = Array.from(s).filter(Number.isFinite);
  const lo = Math.min(...finite, 0.9), hi = Math.max(...finite, 1.3);
  return Array.from(s, (v, i) => `${i ? 'L' : 'M'}${(i / (s.length - 1) * 100).toFixed(1)} ${(20 - ((Number.isFinite(v) ? v : lo) - lo) / (hi - lo) * 18).toFixed(1)}`).join('');
}
const GLYPHS = Object.fromEntries(MODES.map(m => [m.id, glyphPath(m.id, m.sample)]));
const defaultLookupTable = () => [{ x: 0.1, y: 1.0 }, { x: 20.0, y: 1.0 }];

function ModeTiles({ editor, tieredApplyEnabled }: { editor: ProfileEditor; tieredApplyEnabled: boolean }) {
  const mode = editor.activeAccel.mode;
  const select = (value: string) => editor.updateLookup(args => {
    if (value !== 'lookup' || (args.lookup_table?.length ?? 0) >= 2) return { ...args, mode: value };
    // A newly created LUT starts as a flat sensitivity curve.
    return { ...args, mode: 'lookup', gain: false, lookup_table: defaultLookupTable() };
  });
  return <div className="modes" role="radiogroup" aria-label="Acceleration mode"
    onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      const tiles = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.mode'));
      const i = tiles.indexOf(document.activeElement as HTMLButtonElement);
      if (i < 0) return;
      event.preventDefault();
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[event.key as 'ArrowLeft'];
      const next = tiles[(i + delta + tiles.length) % tiles.length];
      next.focus(); next.click();
    }}>
    {MODES.map(m => <button key={m.id} type="button" className="mode" role="radio" aria-checked={mode === m.id}
      tabIndex={mode === m.id ? 0 : -1} onClick={() => { if (mode !== m.id) select(m.id); }}>
      <svg viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true"><path d={GLYPHS[m.id]} vectorEffect="non-scaling-stroke" /></svg>
      <span>{m.label}</span>
      {m.id === 'tiered' && !tieredApplyEnabled && <span className="badge" title="Applying Tiered requires a compatible signed driver.">Preview</span>}
    </button>)}
  </div>;
}

function OutputPanel({ editor }: { editor: ProfileEditor }) {
  const { activeProfile: p, updateProfile } = editor;
  return <>
    <div className="group"><div className="group-title">Sensitivity</div>
      <Field label="Output DPI" hint={`${(p.output_dpi / 1000).toFixed(2)}× sensitivity`} value={p.output_dpi} min={100} max={6400} step={1}
        onChange={v => updateProfile('output_dpi', v)} />
      <Field label="Y/X ratio" value={p.yx_output_dpi_ratio} min={0.1} max={4} step={0.01} onChange={v => updateProfile('yx_output_dpi_ratio', v)} />
      <Field label="L/R ratio" value={p.lr_output_dpi_ratio} min={0.1} max={4} step={0.01} onChange={v => updateProfile('lr_output_dpi_ratio', v)} />
      <Field label="U/D ratio" value={p.ud_output_dpi_ratio} min={0.1} max={4} step={0.01} onChange={v => updateProfile('ud_output_dpi_ratio', v)} />
    </div>
    <div className="group"><div className="group-title">Geometry</div>
      <Field label="Rotation" unit="°" value={p.degrees_rotation} min={-180} max={180} step={0.1} onChange={v => updateProfile('degrees_rotation', v)} />
      <Field label="Angle snapping" unit="°" value={p.degrees_snap} min={0} max={45} step={0.1} onChange={v => updateProfile('degrees_snap', v)} />
    </div>
  </>;
}

function InputPanel({ editor }: { editor: ProfileEditor }) {
  const { activeProfile: p, updateProfile, updateSpeed } = editor;
  const s = p.speed_processor_args;
  return <>
    <div className="group"><div className="group-title">Smoothing</div>
      <Field label="Input half-life" value={s.input_speed_smooth_halflife} min={0} max={100} step={0.1} onChange={v => updateSpeed('input_speed_smooth_halflife', v)} />
      <Field label="Scale half-life" value={s.scale_smooth_halflife} min={0} max={100} step={0.1} onChange={v => updateSpeed('scale_smooth_halflife', v)} />
      <Field label="Output half-life" value={s.output_speed_smooth_halflife} min={0} max={100} step={0.1} onChange={v => updateSpeed('output_speed_smooth_halflife', v)} />
    </div>
    <div className="group"><div className="group-title">Anisotropy</div>
      <Field label="LP norm" hint="2 = Euclidean" value={s.lp_norm} min={1} max={16} step={0.1} onChange={v => updateSpeed('lp_norm', v)} />
      <Field label="Domain weight X" value={p.domain_weights.x} min={0} max={4} step={0.1} onChange={x => updateProfile('domain_weights', { ...p.domain_weights, x })} />
      <Field label="Domain weight Y" value={p.domain_weights.y} min={0} max={4} step={0.1} onChange={y => updateProfile('domain_weights', { ...p.domain_weights, y })} />
      <Field label="Range weight X" value={p.range_weights.x} min={0} max={4} step={0.1} onChange={x => updateProfile('range_weights', { ...p.range_weights, x })} />
      <Field label="Range weight Y" value={p.range_weights.y} min={0} max={4} step={0.1} onChange={y => updateProfile('range_weights', { ...p.range_weights, y })} />
    </div>
    <div className="group"><div className="group-title">Speed limits</div>
      <Field label="Speed minimum" unit="counts/ms" value={p.speed_min} min={0} max={100} step={0.1} onChange={v => updateProfile('speed_min', v)} />
      <Field label="Speed maximum" unit="counts/ms" hint="0 = no limit" value={p.speed_max} min={0} max={500} step={1} onChange={v => updateProfile('speed_max', v)} />
    </div>
  </>;
}

type InspectorTab = 'curve' | 'output' | 'input';

export function Inspector({ editor, notify, tieredApplyEnabled }: { editor: ProfileEditor; notify: Notify; tieredApplyEnabled: boolean }) {
  const [tab, setTab] = useState<InspectorTab>('curve');
  const key = `${editor.activeProfile.id}-${editor.linkXY ? 'xy' : editor.activeCurveAxis}-${tab}-${tab === 'curve' ? editor.activeAccel.mode : ''}`;
  return <aside className="inspector" aria-label="Curve settings">
    <div className="insp-head">
      <h2>Mode <span className="pill muted">{editor.linkXY ? 'Both axes' : `Editing ${editor.activeCurveAxis.toUpperCase()} axis`}</span></h2>
      <ModeTiles editor={editor} tieredApplyEnabled={tieredApplyEnabled} />
    </div>
    <Tabs<InspectorTab> label="Curve settings sections" idBase="inspector" value={tab} onChange={setTab}
      tabs={[{ value: 'curve', label: 'Curve' }, { value: 'output', label: 'Output' }, { value: 'input', label: 'Input' }]} />
    <div className="insp-body" id="inspector-panel" role="tabpanel" aria-labelledby={`inspector-tab-${tab}`}>
      <div className="stagger" key={key}>
        {tab === 'curve' && <CurvePanel editor={editor} notify={notify} tieredApplyEnabled={tieredApplyEnabled} />}
        {tab === 'output' && <OutputPanel editor={editor} />}
        {tab === 'input' && <InputPanel editor={editor} />}
      </div>
    </div>
  </aside>;
}
