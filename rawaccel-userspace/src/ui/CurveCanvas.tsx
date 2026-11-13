import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode, type RefObject } from 'react';
import type { AccelArgs } from '../types';
import { useMouseTelemetry } from '../components/MouseTelemetry';
import { trackerInputs } from '../tracker';
import { GraphEngine, type GraphSeries, type GraphTarget, type SeriesKind } from './graphEngine';
import { axisBounds, graphDomain, lookupPointSensitivity, lookupStoredValue, sampleCurve } from './graphSeries';

export type VisibleGraphs = Record<SeriesKind, boolean>;

interface CurveCanvasProps {
  argsX: AccelArgs;
  argsY: AccelArgs;
  whole: boolean;
  editAxis: 'x' | 'y';
  visible: VisibleGraphs;
  expanded: boolean;
  live: boolean;
  appearance: string; // changes whenever theme colours change
  identity: string; // the active profile; switching profiles morphs the curves
  children?: ReactNode; // controls drawn over the graph
  onLookupChange: (axis: 'x' | 'y', table: { x: number; y: number }[]) => void;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function readColors() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return { sensitivity: v('--c-sens'), velocity: v('--c-vel'), gain: v('--c-gain'), grid: v('--grid'), faint: v('--faint'),
    line: v('--line-strong'), surface: v('--surface'), accent: v('--accent'), font: v('--f-num') || 'monospace' };
}

export function CurveCanvas({ argsX, argsY, whole, editAxis, visible, expanded, live, appearance, identity, onLookupChange, children }: CurveCanvasProps) {
  const card = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const engine = useRef<GraphEngine | null>(null);
  const dragging = useRef<{ axis: 'x' | 'y'; index: number } | null>(null);
  const lastShape = useRef<string | null>(null);
  const [showRight, setShowRight] = useState(visible.velocity);
  const editArgs = whole || editAxis === 'x' ? argsX : argsY;

  const domain = useMemo(() => graphDomain(argsX, argsY, expanded), [argsX, argsY, expanded]);
  const samples = useMemo(() => ({ x: sampleCurve(argsX, domain), y: whole ? null : sampleCurve(argsY, domain) }), [argsX, argsY, whole, domain]);

  const target = useMemo<GraphTarget>(() => {
    const series = new Map<string, GraphSeries>();
    const left: number[] = [], right: number[] = [];
    for (const axis of (whole ? ['x'] : ['x', 'y']) as ('x' | 'y')[]) {
      const s = axis === 'x' ? samples.x : samples.y!;
      for (const kind of ['sensitivity', 'velocity', 'gain'] as SeriesKind[]) {
        if (!visible[kind]) continue;
        const values = s[kind];
        (kind === 'velocity' ? right : left).push(...values);
        series.set(`${kind}-${axis}`, { kind, axis, values, dashed: axis === 'y', alpha: whole || axis === editAxis ? 1 : 0.42 });
      }
    }
    const bands = editArgs.mode !== 'tiered' ? []
      : (editArgs.t_type || 'linear') === 'linear'
        ? [{ start: editArgs.tiered_input_offset1, end: editArgs.tiered_input_offset1 + editArgs.tiered_transition1 },
           { start: editArgs.tiered_input_offset2, end: editArgs.tiered_input_offset2 + editArgs.tiered_transition2 }]
        : [{ start: editArgs.tiered_input_offset1, end: null }, { start: editArgs.tiered_input_offset2, end: null }];
    const handles = editArgs.mode === 'lookup' && visible.sensitivity
      ? (editArgs.lookup_table ?? []).map(point => ({ x: point.x, y: lookupPointSensitivity(editArgs, point) })) : [];
    // Include editable handles, including narrow features between sampled speeds.
    left.push(...handles.map(handle => handle.y));
    const leftBounds = axisBounds(left, 1.5), rightBounds = axisBounds(right, 20);
    return { domain, series, bands, handles, left: leftBounds.max, right: rightBounds.max, leftMin: leftBounds.min, rightMin: rightBounds.min };
  }, [samples, visible, whole, editAxis, editArgs, domain]);

  // Declared before the update effect: layout effects run in order, so the
  // engine exists before the first curve is handed to it.
  useLayoutEffect(() => {
    const e = new GraphEngine(base.current!, overlay.current!, reducedMotion);
    engine.current = e;
    lastShape.current = null;
    e.setColors(readColors());
    const element = card.current!;
    let alive = true;
    // Size now so the first curve can play its draw-in animation.
    const first = element.getBoundingClientRect();
    if (first.width && first.height) e.resize(first.width, first.height, Math.min(2, window.devicePixelRatio || 1));
    // Observers and font loading can report after unmount; ignore those.
    const observer = new ResizeObserver(() => {
      if (!alive) return;
      const r = element.getBoundingClientRect();
      if (r.width && r.height) e.resize(r.width, r.height, Math.min(2, window.devicePixelRatio || 1));
    });
    observer.observe(element);
    void document.fonts?.ready.then(() => { if (alive) e.setColors(readColors()); });
    return () => { alive = false; observer.disconnect(); e.destroy(); engine.current = null; };
  }, []);

  // Morph on discrete changes; draw directly while a value is being edited.
  const shape = `${identity}|${whole}|${editAxis}|${visible.sensitivity}${visible.velocity}${visible.gain}|${argsX.mode}|${argsY.mode}|${argsX.t_type}|${argsY.t_type}|${argsX.gain}|${argsY.gain}|${expanded}`;
  useLayoutEffect(() => {
    const e = engine.current;
    if (!e) return;
    const discrete = lastShape.current !== shape;
    const how = lastShape.current === null ? 'grow' : discrete && !dragging.current ? 'morph' : 'direct';
    lastShape.current = shape;
    e.setTarget(target, how);
    setShowRight(visible.velocity);
  }, [target, shape, visible.velocity]);

  useEffect(() => { engine.current?.setColors(readColors()); }, [appearance]);

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const e = engine.current;
    if (!e || editArgs.mode !== 'lookup') return;
    const index = e.handleAt(event.clientX, event.clientY);
    if (index < 0) return;
    dragging.current = { axis: whole ? 'x' : editAxis, index };
    e.activeHandle = index;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const e = engine.current, drag = dragging.current;
    const table = editArgs.lookup_table;
    if (!e || !drag || !table || table.length < 2) return;
    const { x, y } = e.toData(event.clientX, event.clientY);
    const next = table.map(point => ({ ...point }));
    // Points cannot cross their neighbours.
    const low = drag.index > 0 ? table[drag.index - 1].x + 0.001 : 0.001;
    const high = drag.index < table.length - 1 ? table[drag.index + 1].x - 0.001 : e.domain;
    const nx = Math.max(low, Math.min(high, x));
    next[drag.index] = { x: nx, y: lookupStoredValue(editArgs, nx, y) };
    onLookupChange(drag.axis, next);
  };
  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = null;
    if (engine.current) { engine.current.activeHandle = -1; engine.current.draw(); }
  };

  return <div className="graph-card" ref={card}>
    <canvas ref={base} role="img" aria-label={`Curve graph: ${['sensitivity', 'velocity', 'gain'].filter(k => visible[k as SeriesKind]).join(', ')}`} />
    <canvas ref={overlay} className={`overlay ${target.handles.length ? 'editable' : ''}`} aria-hidden="true"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} />
    <div className="axis-key l" aria-hidden="true">Multiplier ×</div>
    <div className="axis-key r" aria-hidden="true">{showRight ? 'Output velocity' : ''}</div>
    <LiveLayer engine={engine} whole={whole} live={live} samples={samples} domain={domain} onCurve={visible.sensitivity} />
    {children}
  </div>;
}

// Only this layer re-renders on telemetry events.
function LiveLayer({ engine, whole, live, samples, domain, onCurve }: {
  engine: RefObject<GraphEngine | null>; whole: boolean; live: boolean; domain: number; onCurve: boolean;
  samples: { x: { sensitivity: Float64Array }; y: { sensitivity: Float64Array } | null };
}) {
  const { mouseSpeed, trackerUnavailable } = useMouseTelemetry();
  const inputs = live && !trackerUnavailable ? trackerInputs(whole, mouseSpeed) : [];
  // The dot rides the sensitivity curve, so it is hidden while that curve is.
  useEffect(() => {
    if (!onCurve) { engine.current?.drawLive([]); return; }
    engine.current?.drawLive(inputs.map(input => ({
      speed: input.speed, axis: input.axis, hollow: input.axis === 'y',
      values: input.axis === 'y' ? samples.y?.sensitivity ?? null : samples.x.sensitivity,
    })));
  });
  const at = (values: Float64Array | undefined, speed: number) => {
    if (!values) return null;
    const n = values.length, t = Math.min(1, Math.max(0, speed / domain)) * (n - 1);
    const i = Math.floor(t), j = Math.min(n - 1, i + 1);
    return values[i] + (values[j] - values[i]) * (t - i);
  };
  const first = inputs[0];
  const sens = first ? at(first.axis === 'y' ? samples.y?.sensitivity : samples.x.sensitivity, first.speed) : null;
  return <div className={`readout ${live ? '' : 'paused'}`} aria-hidden="true">
    {trackerUnavailable ? <span>Tracker unavailable</span> : whole
      ? <><span>Live input <b>{mouseSpeed.speed_whole.toFixed(1)}</b> counts/ms</span>
          <span className="sens">Sensitivity <b>{sens === null || !Number.isFinite(sens) ? '—' : sens.toFixed(2)}</b>×</span></>
      : <span>Live input <b>X {mouseSpeed.speed_x.toFixed(1)}</b> <b>Y {mouseSpeed.speed_y.toFixed(1)}</b> counts/ms</span>}
  </div>;
}
