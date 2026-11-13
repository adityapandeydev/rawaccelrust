import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs } from './load-ts.mjs';
const { defaultDeviceConfig, patchDevice, resolveDeviceSelection } = await loadTs('deviceState');

test('late devices, disconnect and reconnect resolve to a connected selection', () => {
  assert.equal(resolveDeviceSelection(null, []), null);
  assert.equal(resolveDeviceSelection(null, [{ id: 'a' }]), 'a');
  assert.equal(resolveDeviceSelection('b', [{ id: 'a' }, { id: 'b' }]), 'b');
  assert.equal(resolveDeviceSelection('b', [{ id: 'a' }]), 'a');
  assert.equal(resolveDeviceSelection('b', []), null);
  const fallback = resolveDeviceSelection('a', [{ id: 'b' }]);
  assert.equal(resolveDeviceSelection(fallback, [{ id: 'a' }, { id: 'b' }]), 'b');
});

test('first edit creates unassigned config; later edits retain mappings and disconnected entries', () => {
  const before = [{ ...defaultDeviceConfig('offline'), profile_id: 'Other', dpi: 1600 }];
  const edited = patchDevice(before, 'new', { dpi: 800 });
  assert.equal(edited[1].profile_id, null);
  assert.equal(edited[1].dpi, 800);
  assert.deepEqual(edited[0], before[0]);
  assert.equal(before.length, 1);
  const next = patchDevice(edited, 'new', { poll_time_lock: true });
  assert.equal(next.length, 2);
  assert.equal(next[1].dpi, 800);
  assert.equal(next[1].poll_time_lock, true);
});

test('device defaults are written only on edit and keep unrelated metadata', async () => {
  const { readDeviceDefaults, patchDeviceDefaults, BASE_DEVICE_DEFAULTS } = await loadTs('deviceState');
  const metadata = { schema_version: 2 };
  assert.deepEqual(readDeviceDefaults(metadata), BASE_DEVICE_DEFAULTS);
  assert.deepEqual(readDeviceDefaults({ default_device_config: [] }), BASE_DEVICE_DEFAULTS);
  const patched = patchDeviceDefaults(metadata, { dpi: 1600 });
  assert.equal(patched.schema_version, 2);
  assert.deepEqual(patched.default_device_config, { ...BASE_DEVICE_DEFAULTS, dpi: 1600 });
  assert.equal(metadata.default_device_config, undefined);
  const again = patchDeviceDefaults(patched, { clamp_max: 4 });
  assert.equal(again.default_device_config.dpi, 1600);
  assert.equal(again.default_device_config.clamp_max, 4);
});

test('device entries list connected mice first, then saved disconnected mice', async () => {
  const { deviceEntries } = await loadTs('deviceState');
  const entries = deviceEntries([{ id: 'b', name: 'Mouse B' }, { id: 'a', name: 'Mouse A' }],
    [{ id: 'z', profile_id: 'P', dpi: 800 }, { id: 'a', profile_id: 'Q', dpi: 400 }, { id: 'm', profile_id: null }]);
  assert.deepEqual(entries.map(e => [e.id, e.connected]), [['b', true], ['a', true], ['m', false], ['z', false]]);
  assert.equal(entries[1].config.dpi, 400);
  assert.equal(entries[0].config.profile_id, null, 'unconfigured mice get a default entry');
});
