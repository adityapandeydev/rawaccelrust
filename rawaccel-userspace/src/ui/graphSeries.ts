import type { AccelArgs } from '../types';
import { createEvaluator } from '../math';

export const SAMPLES = 201;

export interface CurveSamples {
  xs: Float64Array;
  sensitivity: Float64Array;
  velocity: Float64Array;
  gain: Float64Array;
}

// Same rules as the previous graph: an 80 counts/ms window (200 expanded),
// widened to show an input cap or every lookup point, in steps of 20.
export function graphDomain(x: AccelArgs, y: AccelArgs, expanded: boolean): number {
  let m = expanded ? 200 : 80;
  if (x.cap_mode === 'in' && x.cap.x > 0) m = Math.max(m, x.cap.x * 1.2);
  if (y.cap_mode === 'in' && y.cap.x > 0) m = Math.max(m, y.cap.x * 1.2);
  for (const table of [x.lookup_table, y.lookup_table]) {
    for (const point of table ?? []) if (Number.isFinite(point.x) && point.x > 0) m = Math.max(m, point.x * 1.2);
  }
  return Math.ceil(m / 20) * 20;
}

// Evenly spaced samples so successive curves can be morphed index by index.
// Gain is the backward difference of velocity, as in generateGraphData.
export function sampleCurve(args: AccelArgs, domain: number, n = SAMPLES): CurveSamples {
  const evaluate = createEvaluator(args);
  const xs = new Float64Array(n), sensitivity = new Float64Array(n), velocity = new Float64Array(n), gain = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const x = i === 0 ? 0.001 : (i * domain) / (n - 1);
    xs[i] = x;
    sensitivity[i] = evaluate(x);
    velocity[i] = x * sensitivity[i];
    gain[i] = i === 0 ? sensitivity[0] : (velocity[i] - velocity[i - 1]) / (x - xs[i - 1]);
  }
  return { xs, sensitivity, velocity, gain };
}

export function niceCeil(value: number, floor: number): number {
  const v = Number.isFinite(value) ? Math.max(value, floor) : floor;
  const power = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / power;
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(s => m <= s + 1e-9) ?? 10;
  return step * power;
}

// Axis ends that ignore isolated spikes. A discontinuous curve (a Jump with
// Smooth 0, a vertical lookup step) has an impulse for gain: unbounded and of
// zero width. Its sampled height depends only on sample spacing, so it must
// not set the scale; the line still runs off the plot edge to show it.
function percentile(values: Iterable<number>, fraction: number): number {
  const finite = Array.from(values).filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return 0;
  return finite[Math.floor(fraction * (finite.length - 1))];
}
export const robustMax = (values: Iterable<number>) => percentile(values, 0.995);
export const robustMin = (values: Iterable<number>) => percentile(values, 0.005);

// Signed axis range: spike-robust in both directions over sampled curves, but
// `exact` values (editable lookup handles) always stay in view, since a narrow
// point between samples would otherwise be dropped as a spike.
export function axisBounds(values: number[], floor: number, exact: number[] = []) {
  const finiteExact = exact.filter(Number.isFinite);
  const low = Math.min(0, robustMin(values), ...finiteExact);
  const high = Math.max(robustMax(values), ...finiteExact);
  return {
    min: low < 0 ? -niceCeil(-low * 1.08, floor) : 0,
    max: niceCeil(high * 1.08, floor),
  };
}

// Lookup points are drawn and dragged on the sensitivity scale.
export const lookupPointSensitivity = (args: AccelArgs, point: { x: number; y: number }) => args.gain ? point.y / point.x : point.y;
export const lookupStoredValue = (args: AccelArgs, x: number, sensitivity: number) => args.gain ? sensitivity * x : sensitivity;
