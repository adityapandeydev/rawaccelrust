import { memo, useCallback, useRef, type ReactNode } from 'react';
import { Plus, Upload, RotateCcw, X } from 'lucide-react';
import type { AccelArgs } from '../types';
import type { ProfileEditor } from '../hooks/useProfileEditor';
import type { Notify } from '../hooks/useNotifications';
import { NumberInput } from '../components/NumberInput';
import { Callout, Check, Field, Segmented } from './controls';

const copyTable = (table: { x: number; y: number }[]) => table.map(point => ({ ...point }));
const MAX_LOOKUP_POINTS = 257;

type CapMode = AccelArgs['cap_mode'];

function CapType({ args, update }: { args: AccelArgs; update: ProfileEditor['updateAccel'] }) {
  return <div className="field">
    <div className="field-top"><span className="label">Cap type</span></div>
    <Segmented<'out' | 'in' | 'both'> label="Cap type" block value={args.cap_mode === 'io' ? 'both' : args.cap_mode}
      options={[{ value: 'out', label: 'Output' }, { value: 'in', label: 'Input' }, { value: 'both', label: 'Both' }]}
      onChange={value => update('cap_mode', (value === 'both' ? 'io' : value) as CapMode)} />
  </div>;
}

function Caps({ args, update }: { args: AccelArgs; update: ProfileEditor['updateAccel'] }) {
  const input = <Field key="cx" label="Cap: Input" unit="counts/ms" value={args.cap.x} min={0} max={200} step={0.1}
    onChange={x => update('cap', { ...args.cap, x })} />;
  const output = <Field key="cy" label="Cap: Output" unit="×" value={args.cap.y} min={0} max={10} step={0.01}
    onChange={y => update('cap', { ...args.cap, y })} />;
  return <>{args.cap_mode !== 'out' && input}{args.cap_mode !== 'in' && output}</>;
}

function ModeFields({ editor }: { editor: ProfileEditor }) {
  const { activeAccel: a, updateAccel: u } = editor;
  const offset = <Field key="io" label="Input offset" unit="counts/ms" value={a.input_offset} min={0} max={50} step={0.1} onChange={v => u('input_offset', v)} />;
  const acceleration = <Field key="ac" label="Acceleration" value={a.acceleration} min={0} max={0.1} step={0.001} onChange={v => u('acceleration', v)} />;
  switch (a.mode) {
    case 'linear':
      return <>{a.cap_mode !== 'io' && acceleration}<CapType args={a} update={u} /><Caps args={a} update={u} />{offset}</>;
    case 'classic':
      return <><CapType args={a} update={u} /><Caps args={a} update={u} />{a.cap_mode !== 'io' && acceleration}{offset}
        <Field label="Power" value={a.exponent_classic} min={1} max={6} step={0.01} onChange={v => u('exponent_classic', v)} /></>;
    case 'jump':
      return <>
        <Field label="Smooth" value={a.smooth} min={0} max={1} step={0.01} onChange={v => u('smooth', v)} />
        <Field label="Input" unit="counts/ms" value={a.cap.x} min={0} max={100} step={0.1} onChange={x => u('cap', { ...a.cap, x })} />
        <Field label="Output" unit="×" value={a.cap.y} min={0} max={10} step={0.01} onChange={y => u('cap', { ...a.cap, y })} />
      </>;
    case 'natural':
      return <>
        <Field label="Decay rate" value={a.decay_rate} min={0} max={1} step={0.001} onChange={v => u('decay_rate', v)} />
        {offset}
        <Field label="Limit" unit="×" value={a.limit} min={0} max={10} step={0.01} onChange={v => u('limit', v)} />
      </>;
    case 'power':
      return <>{a.cap_mode !== 'io' && <Field label="Scale" value={a.scale} min={0} max={10} step={0.01} onChange={v => u('scale', v)} />}
        <CapType args={a} update={u} /><Caps args={a} update={u} />
        <Field label="Exponent" value={a.exponent_power} min={0} max={2} step={0.01} onChange={v => u('exponent_power', v)} />
        <Field label="Output offset" unit="×" value={a.output_offset} min={0} max={5} step={0.01} onChange={v => u('output_offset', v)} />
      </>;
    case 'synchronous':
      return <>
        <Field label="Gamma" value={a.gamma} min={0} max={10} step={0.01} onChange={v => u('gamma', v)} />
        <Field label="Smooth" value={a.smooth} min={0} max={1} step={0.01} onChange={v => u('smooth', v)} />
        <Field label="Motivity" unit="×" value={a.motivity} min={1} max={10} step={0.01} onChange={v => u('motivity', v)} />
        <Field label="Sync speed" unit="counts/ms" value={a.sync_speed} min={0} max={100} step={0.1} onChange={v => u('sync_speed', v)} />
      </>;
    default:
      return null;
  }
}

function TieredLadder({ editor, applyEnabled }: { editor: ProfileEditor; applyEnabled: boolean }) {
  const { activeAccel: args, updateAccel } = editor;
  const linear = (args.t_type || 'linear') === 'linear';
  const level = (key: 'tiered_multiplier1' | 'tiered_multiplier2' | 'tiered_multiplier3', index: number) =>
    <Field label="Level" unit="×" ariaLabel={`Tier ${index} Multiplier`} precision={2} value={args[key]} min={0} max={5} step={0.01}
      onChange={value => updateAccel(key, value)} />;
  const rung = (kind: 'tier' | 'trans', title: string, note: string, children: ReactNode) =>
    <div className={`rung ${kind}`}><span className="node" aria-hidden="true" />
      <div className="rung-title">{title}{note && <span className="mono">{note}</span>}</div>{children}</div>;
  // Clamping keeps both transitions ordered, exactly as before the redesign.
  return <>
    <div className="group">
      <div className="field"><div className="field-top"><span className="label">Transition shape</span></div>
        <Segmented<'linear' | 'natural'> label="Tiered subtype" block value={linear ? 'linear' : 'natural'}
          options={[{ value: 'linear', label: 'Linear' }, { value: 'natural', label: 'Natural' }]}
          onChange={type => { updateAccel('t_type', type); if (type === 'linear') updateAccel('gain', false); }} /></div>
      {!applyEnabled && <Callout>Preview only with this driver. Tiered editing, both submodes and all graph views remain available; applying Tiered requires a signed driver that supports it.</Callout>}
    </div>
    <div className="group">
      <div className="group-title">Tiers <span className="mono">slow → fast</span></div>
      <div className="ladder">
        {rung('tier', 'Tier 1', 'below first start', level('tiered_multiplier1', 1))}
        {rung('trans', 'Transition 1', linear ? 'linear blend' : 'natural decay', <>
          <Field label="Start" ariaLabel="Transition 1 Start" unit="counts/ms" value={args.tiered_input_offset1} min={0} max={100} step={0.1}
            onChange={value => updateAccel('tiered_input_offset1', Math.max(0, Math.min(value, args.tiered_input_offset2 - (linear ? args.tiered_transition1 : 0))))} />
          {linear
            ? <Field label="Width" ariaLabel="Transition 1 Width" unit="counts/ms" value={args.tiered_transition1} min={0} max={50} step={0.1}
                onChange={value => updateAccel('tiered_transition1', Math.max(0, Math.min(value, args.tiered_input_offset2 - args.tiered_input_offset1)))} />
            : <Field label="Decay rate" ariaLabel="Transition 1 Decay rate" value={args.tiered_decay_rate1} min={0} max={1} step={0.01}
                onChange={value => updateAccel('tiered_decay_rate1', value)} />}
        </>)}
        {rung('tier', 'Tier 2', '', level('tiered_multiplier2', 2))}
        {rung('trans', 'Transition 2', linear ? 'linear blend' : 'natural decay', <>
          <Field label="Start" ariaLabel="Transition 2 Start" unit="counts/ms" value={args.tiered_input_offset2} min={0} max={100} step={0.1}
            onChange={value => updateAccel('tiered_input_offset2', Math.max(value, args.tiered_input_offset1 + (linear ? args.tiered_transition1 : 0)))} />
          {linear
            ? <Field label="Width" ariaLabel="Transition 2 Width" unit="counts/ms" value={args.tiered_transition2} min={0} max={50} step={0.1}
                onChange={value => updateAccel('tiered_transition2', value)} />
            : <Field label="Decay rate" ariaLabel="Transition 2 Decay rate" value={args.tiered_decay_rate2} min={0} max={1} step={0.01}
                onChange={value => updateAccel('tiered_decay_rate2', value)} />}
        </>)}
        {rung('tier', 'Tier 3', 'top speed', level('tiered_multiplier3', 3))}
      </div>
    </div>
  </>;
}

// Rows re-render only when their own point changes, so dragging one point on
// the graph does not rebuild a 257-row table.
const LutRow = memo(function LutRow({ index, x, y, velocity, canRemove, onSet, onRemove }: {
  index: number; x: number; y: number; velocity: boolean; canRemove: boolean;
  onSet: (index: number, key: 'x' | 'y', value: number) => void; onRemove: (index: number) => void;
}) {
  return <div className="lut-row">
    <span className="idx">{index + 1}</span>
    <div className="numbox"><NumberInput className="num" aria-label={`Point ${index + 1} speed`} step="0.1" value={x}
      onChange={event => onSet(index, 'x', parseFloat(event.target.value) || 0)} /></div>
    <div className="numbox"><NumberInput className="num" aria-label={`Point ${index + 1} ${velocity ? 'velocity' : 'sensitivity'}`} step="0.01" value={y}
      onChange={event => onSet(index, 'y', parseFloat(event.target.value) || 0)} /></div>
    <button type="button" className="icon-btn" aria-label={`Remove point ${index + 1}`} disabled={!canRemove} onClick={() => onRemove(index)}><X size={14} /></button>
  </div>;
});

function LookupEditor({ editor, notify }: { editor: ProfileEditor; notify: Notify }) {
  const { activeAccel, updateLookup } = editor;
  const file = useRef<HTMLInputElement>(null);
  const table = activeAccel.lookup_table ?? [];
  // Stable handlers that always reach the current editor.
  const latest = useRef(updateLookup);
  latest.current = updateLookup;
  const setPoint = useCallback((index: number, key: 'x' | 'y', value: number) =>
    latest.current(args => ({ ...args, lookup_table: (args.lookup_table ?? []).map((point, i) => i === index ? { ...point, [key]: value } : { ...point }) })), []);
  const addPoint = () => updateLookup(args => {
    const points = copyTable(args.lookup_table ?? []);
    const last = points[points.length - 1], previous = points[points.length - 2];
    const gap = last && previous ? Math.max(1, last.x - previous.x) : 10;
    return { ...args, lookup_table: [...points, { x: (last?.x ?? 0) + gap, y: last?.y ?? 1 }] };
  });
  const removePoint = useCallback((index: number) => latest.current(args => ({ ...args, lookup_table: (args.lookup_table ?? []).filter((_, i) => i !== index).map(p => ({ ...p })) })), []);

  const readCsv = (input: HTMLInputElement) => {
    const chosen = input.files?.[0];
    if (!chosen) return;
    const name = chosen.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      notify({ isOpen: true, title: 'Excel File Detected',
        message: "Raw Accel requires a plain-text CSV file.\n\nHow to convert your Excel sheet to CSV:\n1. Open your file in Excel or Google Sheets\n2. Click File → Save As (or Download)\n3. Choose 'CSV (Comma delimited) (*.csv)'\n4. Upload the saved .csv file here." });
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      const parsed: { x: number; y: number }[] = [];
      for (const [index, line] of lines.entries()) {
        const [rawX, rawY] = line.split(',');
        const x = Number(rawX?.trim()), y = Number(rawY?.trim());
        if (!rawX?.trim() || !rawY?.trim() || !Number.isFinite(x) || !Number.isFinite(y)) {
          notify({ isOpen: true, title: 'Invalid CSV', message: `Line ${index + 1} must contain two finite numbers: input speed, value.` });
          input.value = '';
          return;
        }
        parsed.push({ x, y });
      }
      parsed.sort((a, b) => a.x - b.x);
      if (parsed.length < 2 || parsed.length > MAX_LOOKUP_POINTS) {
        notify({ isOpen: true, title: 'Invalid CSV', message: 'A lookup table must contain between 2 and 257 points.' });
      } else if (parsed.some((point, index) => point.x <= 0 || (index > 0 && point.x <= parsed[index - 1].x))) {
        notify({ isOpen: true, title: 'Invalid CSV', message: 'Input speeds must be above zero and strictly increasing.' });
      } else {
        updateLookup(args => ({ ...args, gain: activeAccel.gain, lookup_table: copyTable(parsed),
          lookup_csv_backup: copyTable(parsed), lookup_csv_backup_gain: activeAccel.gain }));
      }
      input.value = '';
    };
    reader.readAsText(chosen);
  };

  return <>
    <div className="group">
      <div className="field"><div className="field-top"><span className="label">Apply as</span><span className="hint">drag points on the graph</span></div>
        <Segmented<'sensitivity' | 'velocity'> label="Apply as" block value={activeAccel.gain ? 'velocity' : 'sensitivity'}
          options={[{ value: 'sensitivity', label: 'Sensitivity' }, { value: 'velocity', label: 'Velocity' }]}
          onChange={value => {
            const useVelocity = value === 'velocity';
            updateLookup(args => {
              if (args.gain === useVelocity) return args;
              // Preserve the displayed sensitivity curve while changing the stored representation.
              const converted = (args.lookup_table ?? []).map(point => ({ x: point.x, y: useVelocity ? point.y * point.x : point.y / point.x }));
              return { ...args, gain: useVelocity, lookup_table: converted };
            });
          }} />
      </div>
    </div>
    <div className="group">
      <div className="group-title">Points <span className="mono">{table.length} of {MAX_LOOKUP_POINTS}</span></div>
      <div className="lut-head" aria-hidden="true"><span>#</span><span>Speed (counts/ms)</span><span>{activeAccel.gain ? 'Velocity' : 'Sensitivity'}</span><span /></div>
      <div className="lut">
        {table.map((point, index) => <LutRow key={index} index={index} x={point.x} y={point.y} velocity={activeAccel.gain}
          canRemove={table.length > 2} onSet={setPoint} onRemove={removePoint} />)}
      </div>
      <div className="btn-row">
        <button type="button" className="btn" disabled={table.length >= MAX_LOOKUP_POINTS} onClick={addPoint}><Plus size={14} />Add point</button>
        <input ref={file} type="file" accept=".csv, .xlsx, .xls" id="csv-upload" hidden onChange={event => readCsv(event.currentTarget)} />
        <button type="button" className="btn" onClick={() => file.current?.click()}><Upload size={14} />Upload CSV</button>
        <button type="button" className="btn" disabled={!activeAccel.lookup_csv_backup || activeAccel.lookup_csv_backup.length < 2}
          onClick={() => updateLookup(args => !args.lookup_csv_backup || args.lookup_csv_backup.length < 2 ? args
            : { ...args, lookup_table: copyTable(args.lookup_csv_backup), gain: args.lookup_csv_backup_gain ?? args.gain })}>
          <RotateCcw size={14} />Restore CSV points</button>
      </div>
    </div>
  </>;
}

export function CurvePanel({ editor, notify, tieredApplyEnabled }: { editor: ProfileEditor; notify: Notify; tieredApplyEnabled: boolean }) {
  const a = editor.activeAccel;
  const gainLocked = a.mode === 'tiered' && (!a.t_type || a.t_type === 'linear');
  return <>
    {a.mode !== 'noaccel' && a.mode !== 'lookup' && <div className="group">
      <Check title="Gain" checked={gainLocked ? false : a.gain} disabled={gainLocked}
        description={gainLocked ? 'Not available for Tiered Linear.' : undefined}
        onChange={checked => editor.updateAccel('gain', checked)} />
    </div>}
    {a.mode === 'noaccel' && <div className="group"><Callout tone="info">Acceleration disabled. Output DPI and the ratios on the Output tab still apply.</Callout></div>}
    {a.mode === 'tiered' && <TieredLadder editor={editor} applyEnabled={tieredApplyEnabled} />}
    {a.mode === 'lookup' && <LookupEditor editor={editor} notify={notify} />}
    {!['noaccel', 'tiered', 'lookup'].includes(a.mode) && <div className="group"><ModeFields editor={editor} /></div>}
  </>;
}
