import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs } from './load-ts.mjs';
const { parseTheme, resolveTheme } = await loadTs('theme');
test('theme preference recovers bad storage and follows system only when selected', () => {
  for (const value of [null, '', 'pink']) assert.equal(parseTheme(value), 'system');
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
});
// Graph-role and field-outline contrast is checked for every palette in palettes.test.mjs.
