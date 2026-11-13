// Colour palettes are data: add a palette by adding one entry with every
// colour token for both modes. scripts/palettes.test.mjs checks completeness
// and contrast, so a new palette cannot ship with a missing or unreadable role.

export type AppearanceMode = 'light' | 'dark';
export const PALETTE_KEY = 'rawaccel.palette';
export const DEFAULT_PALETTE = 'teal';

export const COLOR_TOKENS = [
  'bg', 'window', 'surface', 'surface-2', 'sunken', 'line', 'line-strong', 'field-line',
  'fg', 'muted', 'faint', 'accent', 'accent-strong', 'accent-fg',
  'c-sens', 'c-vel', 'c-gain', 'ok', 'warn', 'err',
] as const;
export type ColorToken = typeof COLOR_TOKENS[number];
export type PaletteColors = Record<ColorToken, string>;

export interface Palette {
  id: string;
  name: string;
  description: string;
  light: PaletteColors;
  dark: PaletteColors;
}

// Mode-wide values that do not change with the palette.
const SHARED: Record<AppearanceMode, Record<string, string>> = {
  light: {
    grid: 'rgba(15, 23, 36, 0.07)',
    scrim: 'rgba(15, 23, 36, 0.38)',
    'shadow-1': '0 1px 2px rgba(15, 23, 36, 0.06)',
    'shadow-2': '0 2px 4px rgba(15, 23, 36, 0.05), 0 12px 32px rgba(15, 23, 36, 0.10)',
  },
  dark: {
    grid: 'rgba(230, 236, 243, 0.06)',
    scrim: 'rgba(0, 0, 0, 0.55)',
    'shadow-1': '0 1px 2px rgba(0, 0, 0, 0.4)',
    'shadow-2': '0 2px 6px rgba(0, 0, 0, 0.35), 0 16px 40px rgba(0, 0, 0, 0.45)',
  },
};

export const PALETTES: Palette[] = [
  {
    id: 'teal', name: 'Signal Teal', description: 'Clean and technical, with a teal accent.',
    light: {
      bg: '#E9EDF2', window: '#F6F8FA', surface: '#FFFFFF', 'surface-2': '#F1F4F7', sunken: '#E6EBF0',
      line: '#D6DDE5', 'line-strong': '#B7C2CE', 'field-line': '#7E8A99',
      fg: '#0F1724', muted: '#566376', faint: '#7D8A9B', accent: '#087F75', 'accent-strong': '#066A62', 'accent-fg': '#FFFFFF',
      'c-sens': '#087F75', 'c-vel': '#3F5FD8', 'c-gain': '#C2620F', ok: '#1E8F4E', warn: '#A86A0B', err: '#CC3B3B',
    },
    dark: {
      bg: '#05080B', window: '#0B1015', surface: '#10161D', 'surface-2': '#151C24', sunken: '#0D1217',
      line: '#212A35', 'line-strong': '#2F3B49', 'field-line': '#5D6A7B',
      fg: '#E6ECF3', muted: '#94A1B2', faint: '#6B788A', accent: '#3CCFBE', 'accent-strong': '#64DCCE', 'accent-fg': '#03201C',
      'c-sens': '#3CCFBE', 'c-vel': '#84A0FF', 'c-gain': '#F3A04A', ok: '#46C77F', warn: '#E8B04A', err: '#FF6E6E',
    },
  },
  {
    id: 'bordeaux', name: 'Bordeaux & Silver', description: 'A wine accent on cool silver. Errors use vermilion so they never read as the accent.',
    light: {
      bg: '#E6E7EB', window: '#F4F5F7', surface: '#FFFFFF', 'surface-2': '#EFF0F3', sunken: '#E2E3E8',
      line: '#D2D4DA', 'line-strong': '#B3B6BF', 'field-line': '#82848F',
      fg: '#18141A', muted: '#5B5965', faint: '#82808C', accent: '#8A1538', 'accent-strong': '#6E0F2C', 'accent-fg': '#FFFFFF',
      'c-sens': '#8A1538', 'c-vel': '#4F6A8A', 'c-gain': '#A3711C', ok: '#2E7D4F', warn: '#946E00', err: '#C9440F',
    },
    dark: {
      bg: '#070709', window: '#0E0E11', surface: '#141418', 'surface-2': '#1A1A1F', sunken: '#101013',
      line: '#25252C', 'line-strong': '#35353F', 'field-line': '#666874',
      fg: '#ECEDF1', muted: '#A4A6AF', faint: '#767883', accent: '#DB5279', 'accent-strong': '#E87493', 'accent-fg': '#1C030B',
      'c-sens': '#E0607F', 'c-vel': '#A9B8CC', 'c-gain': '#E2B15A', ok: '#4CC38A', warn: '#EFC94C', err: '#FF7A45',
    },
  },
  {
    id: 'redline', name: 'Redline', description: 'Signal red on gunmetal. Errors use orange so they never read as the accent.',
    light: {
      bg: '#E5E6E9', window: '#F3F4F5', surface: '#FFFFFF', 'surface-2': '#EDEEF0', sunken: '#E0E2E5',
      line: '#D0D3D8', 'line-strong': '#B0B5BC', 'field-line': '#7F858D',
      fg: '#121417', muted: '#545A62', faint: '#7C838B', accent: '#D21F2A', 'accent-strong': '#AE1820', 'accent-fg': '#FFFFFF',
      'c-sens': '#D21F2A', 'c-vel': '#3D4D60', 'c-gain': '#B8700A', ok: '#2E7D4F', warn: '#8F7100', err: '#D25A0C',
    },
    dark: {
      bg: '#060708', window: '#0C0E10', surface: '#121518', 'surface-2': '#181B1F', sunken: '#0E1013',
      line: '#242930', 'line-strong': '#333A42', 'field-line': '#5F6770',
      fg: '#E8EBEE', muted: '#99A0A9', faint: '#6E757E', accent: '#FF3B46', 'accent-strong': '#FF636C', 'accent-fg': '#2A0004',
      'c-sens': '#FF4A54', 'c-vel': '#9FB0C4', 'c-gain': '#FFB02E', ok: '#4CC38A', warn: '#F0C93E', err: '#FF8A3D',
    },
  },
  {
    id: 'copper', name: 'Graphite & Copper', description: 'Warm machined greys with a copper accent.',
    light: {
      bg: '#E8E6E3', window: '#F5F4F2', surface: '#FFFFFF', 'surface-2': '#F1EFEC', sunken: '#E4E1DD',
      line: '#D6D2CC', 'line-strong': '#B8B2AA', 'field-line': '#857E75',
      fg: '#1A1714', muted: '#635C54', faint: '#878076', accent: '#AE5520', 'accent-strong': '#8F4419', 'accent-fg': '#FFFFFF',
      'c-sens': '#AE5520', 'c-vel': '#3C6C8C', 'c-gain': '#667824', ok: '#2F7D4A', warn: '#8A680D', err: '#C9302C',
    },
    dark: {
      bg: '#090807', window: '#100F0D', surface: '#161412', 'surface-2': '#1C1A17', sunken: '#11100E',
      line: '#2A2722', 'line-strong': '#3A3630', 'field-line': '#736B61',
      fg: '#EFEAE4', muted: '#A79F95', faint: '#7A7369', accent: '#E8894A', 'accent-strong': '#F2A26C', 'accent-fg': '#2A1203',
      'c-sens': '#E8894A', 'c-vel': '#7FB2D6', 'c-gain': '#B8C85E', ok: '#5CC98A', warn: '#E6C35A', err: '#FF6B5E',
    },
  },
  {
    id: 'cobalt', name: 'Cobalt & Titanium', description: 'Cool and technical, with a cobalt accent and titanium greys.',
    light: {
      bg: '#E6E9EF', window: '#F4F6FA', surface: '#FFFFFF', 'surface-2': '#EDF0F5', sunken: '#E0E5ED',
      line: '#CFD6E1', 'line-strong': '#AEB9CA', 'field-line': '#7A879C',
      fg: '#0D1424', muted: '#4E5B71', faint: '#77859B', accent: '#2A52D6', 'accent-strong': '#1E40B0', 'accent-fg': '#FFFFFF',
      'c-sens': '#2A52D6', 'c-vel': '#0B7A7A', 'c-gain': '#BF5E14', ok: '#1E8F4E', warn: '#A86A0B', err: '#D13B3B',
    },
    dark: {
      bg: '#05070D', window: '#0A0E17', surface: '#0F1420', 'surface-2': '#141A28', sunken: '#0C111B',
      line: '#1F2738', 'line-strong': '#2E3950', 'field-line': '#5F6A86',
      fg: '#E4EAF5', muted: '#8F9BB3', faint: '#66728B', accent: '#5D8DFF', 'accent-strong': '#81A6FF', 'accent-fg': '#061233',
      'c-sens': '#5D8DFF', 'c-vel': '#3FD0C4', 'c-gain': '#F2A14B', ok: '#46C77F', warn: '#E8B04A', err: '#FF6E6E',
    },
  },
];

export function parsePalette(value: string | null): string {
  return PALETTES.some(palette => palette.id === value) ? value as string : DEFAULT_PALETTE;
}

export function findPalette(id: string): Palette {
  return PALETTES.find(palette => palette.id === id) ?? PALETTES[0];
}

const rgba = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

// Every CSS custom property the interface reads, without the leading "--".
export function paletteVariables(palette: Palette, mode: AppearanceMode): Record<string, string> {
  const colors = palette[mode];
  const dark = mode === 'dark';
  return {
    ...SHARED[mode],
    ...colors,
    'accent-soft': rgba(colors.accent, dark ? 0.14 : 0.1),
    'ok-soft': rgba(colors.ok, dark ? 0.13 : 0.12),
    'warn-soft': rgba(colors.warn, 0.13),
    'err-soft': rgba(colors.err, dark ? 0.12 : 0.11),
  };
}
