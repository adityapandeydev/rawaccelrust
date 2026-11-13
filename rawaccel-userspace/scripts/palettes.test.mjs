import assert from 'node:assert/strict';
import test from 'node:test';
import { loadTs } from './load-ts.mjs';
const { PALETTES, COLOR_TOKENS, DEFAULT_PALETTE, parsePalette, findPalette, paletteVariables } = await loadTs('palettes');

function luminance(hex) {
  const rgb = hex.match(/[a-f0-9]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + 0.05) / (low + 0.05);
}

test('palette ids are unique and the default exists', () => {
  assert.equal(new Set(PALETTES.map(p => p.id)).size, PALETTES.length);
  assert.ok(PALETTES.some(p => p.id === DEFAULT_PALETTE));
});

test('unknown or corrupt stored palettes fall back to the default', () => {
  for (const value of [null, '', 'pink', 'TEAL']) assert.equal(parsePalette(value), DEFAULT_PALETTE);
  for (const palette of PALETTES) assert.equal(parsePalette(palette.id), palette.id);
  assert.equal(findPalette('missing').id, PALETTES[0].id);
});

for (const palette of PALETTES) {
  for (const mode of ['light', 'dark']) {
    const colors = palette[mode];
    test(`${palette.name} ${mode} defines every colour token as a hex colour`, () => {
      assert.deepEqual(Object.keys(colors).sort(), [...COLOR_TOKENS].sort());
      for (const [token, value] of Object.entries(colors)) assert.match(value, /^#[0-9a-f]{6}$/i, `${token} = ${value}`);
      const vars = paletteVariables(palette, mode);
      for (const derived of ['accent-soft', 'ok-soft', 'warn-soft', 'err-soft', 'grid', 'scrim', 'shadow-1', 'shadow-2']) assert.ok(vars[derived], derived);
    });
    test(`${palette.name} ${mode} keeps text, graph roles and field outlines readable`, () => {
      for (const surface of ['surface', 'surface-2', 'window']) {
        assert.ok(contrast(colors.fg, colors[surface]) >= 7, `text on ${surface}`);
        assert.ok(contrast(colors.muted, colors[surface]) >= 4.5, `muted text on ${surface}`);
        // Field outlines are interactive boundaries (WCAG non-text contrast).
        assert.ok(contrast(colors['field-line'], colors[surface]) >= 3, `field outline on ${surface}`);
      }
      const roles = [colors['c-sens'], colors['c-vel'], colors['c-gain']];
      assert.equal(new Set(roles).size, 3, 'graph roles must differ');
      for (const role of roles) assert.ok(contrast(role, colors.surface) >= 3, `${role} on surface`);
      assert.ok(contrast(colors['accent-fg'], colors.accent) >= 4.5, 'accent button label');
      assert.notEqual(colors.err, colors.accent, 'errors must not look like the accent');
    });
  }
}
