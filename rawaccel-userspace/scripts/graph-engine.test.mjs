import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs } from './load-ts.mjs';

const { GraphEngine } = await loadTs('ui/graphEngine');
function renderer() {
  const labels = [], segments = [], dots = [];
  const context = new Proxy({}, {
    get: (_, key) => key === 'fillText' ? (...args) => {
      labels.push(args);
      assert.ok(labels.length < 100, 'axis label count must stay bounded');
    } : key === 'lineTo' || key === 'moveTo' ? (...args) => segments.push(args)
      : key === 'arc' ? (...args) => dots.push(args)
      : key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {},
    set: () => true,
  });
  const canvas = () => ({ getContext: () => context, getBoundingClientRect: () => ({ left: 0, top: 0 }) });
  const engine = new GraphEngine(canvas(), canvas(), () => true);
  engine.resize(900, 600, 1);
  engine.setColors(Object.fromEntries(['sensitivity', 'velocity', 'gain', 'grid', 'faint', 'line', 'surface', 'accent', 'font'].map(k => [k, '#000'])));
  labels.length = 0;
  return { engine, labels, segments, dots };
}
const target = patch => ({ domain: 80, left: 2, right: 100, leftMin: 0, rightMin: 0,
  series: new Map(), bands: [], handles: [], ...patch });

test('axis ticks stay bounded at large valid input speeds', () => {
  for (const domain of [80, 200, 1.2e9, 4e38]) {
    const { engine, labels } = renderer();
    engine.setTarget(target({ domain }), 'direct');
    assert.ok(labels.length < 25);
    assert.ok(labels.every(([, x, y]) => Number.isFinite(x) && Number.isFinite(y)));
  }
});

test('negative sensitivity, velocity, handles and live dots share signed axes', () => {
  const { engine, segments, dots } = renderer();
  const values = new Float64Array([-1, 1]);
  engine.setTarget(target({ leftMin: -2, rightMin: -100,
    handles: [{ x: 40, y: -1 }],
    series: new Map([
      ['sensitivity-x', { kind: 'sensitivity', axis: 'x', values, dashed: false, alpha: 1 }],
      ['velocity-x', { kind: 'velocity', axis: 'x', values: new Float64Array([-50, 50]), dashed: false, alpha: 1 }],
    ]),
  }), 'direct');
  // Plot: x=46..846, y=30..572. -1 on [-2,2] is y=436.5.
  assert.equal(engine.handleAt(446, 436.5), 0);
  assert.equal(engine.toData(446, 436.5).y, -1);
  assert.ok(segments.some(([, y]) => y === 436.5));
  engine.drawLive([{ speed: 0, axis: 'x', values, hollow: false }]);
  assert.ok(dots.some(([, y]) => y === 436.5));
});
