import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// graphSeries imports math.ts, so bundle both through one transpiled module graph.
async function load() {
  const compile = name => ts.transpileModule(readFileSync(new URL(`../src/${name}.ts`, import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const url = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  const math = url(compile('math'));
  return import(url(compile('ui/graphSeries').replace(/from ['"]\.\.\/math['"]/, `from '${math}'`)));
}
const { graphDomain, sampleCurve, niceCeil, robustMax, lookupPointSensitivity, lookupStoredValue, SAMPLES } = await load();
const defaults = JSON.parse(readFileSync(new URL('../src/settings-defaults.json', import.meta.url))).accel_args;
const args = patch => ({ ...structuredClone(defaults), ...patch });

test('graph domain keeps the previous widening rules', () => {
  assert.equal(graphDomain(args({}), args({}), false), 80);
  assert.equal(graphDomain(args({}), args({}), true), 200);
  assert.equal(graphDomain(args({ cap_mode: 'in', cap: { x: 90, y: 1 } }), args({}), false), 120);
  assert.equal(graphDomain(args({}), args({ lookup_table: [{ x: 1, y: 1 }, { x: 150, y: 2 }] }), false), 180);
});

test('samples are evenly spaced, start just above zero and follow the curve', () => {
  const s = sampleCurve(args({ mode: 'noaccel' }), 80);
  assert.equal(s.xs.length, SAMPLES);
  assert.equal(s.xs[0], 0.001);
  assert.equal(s.xs[SAMPLES - 1], 80);
  assert.ok(s.sensitivity.every(v => v === 1));
  assert.ok(s.gain.every(v => Math.abs(v - 1) < 1e-9));
  for (let i = 1; i < SAMPLES; i++) assert.ok(Math.abs(s.velocity[i] - s.xs[i]) < 1e-9);
});

test('axis helpers round up to readable values and ignore isolated spikes', () => {
  assert.equal(niceCeil(1.62, 1.5), 2);
  assert.equal(niceCeil(0.2, 1.5), 1.5);
  assert.equal(niceCeil(137, 20), 150);
  assert.equal(niceCeil(NaN, 20), 20);
  const values = [...Array(400).fill(2), 9000];
  assert.equal(robustMax(values), 2);
  assert.equal(robustMax([]), 0);
});

test('lookup points convert between stored and displayed sensitivity', () => {
  const velocityTable = args({ mode: 'lookup', gain: true });
  assert.equal(lookupPointSensitivity(velocityTable, { x: 10, y: 15 }), 1.5);
  assert.equal(lookupStoredValue(velocityTable, 10, 1.5), 15);
  const sensTable = args({ mode: 'lookup', gain: false });
  assert.equal(lookupPointSensitivity(sensTable, { x: 10, y: 1.5 }), 1.5);
  assert.equal(lookupStoredValue(sensTable, 10, 1.5), 1.5);
});
