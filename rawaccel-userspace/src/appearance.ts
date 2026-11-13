import { findPalette, paletteVariables, type AppearanceMode } from './palettes';

// Custom properties are written through the CSSOM, which works under any CSP.
export function applyAppearance(paletteId: string, mode: AppearanceMode) {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(paletteVariables(findPalette(paletteId), mode))) {
    root.style.setProperty(`--${name}`, value);
  }
  root.dataset.theme = mode;
  root.dataset.palette = paletteId;
  root.style.colorScheme = mode;
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reveal the new appearance as a circle growing from the control that changed
// it. `update` must change the DOM synchronously (React: wrap in flushSync).
export function revealFrom(origin: Element | null | undefined, update: () => void) {
  const start = (document as Document & { startViewTransition?: (callback: () => void) => unknown }).startViewTransition;
  if (!start || reducedMotion()) { update(); return; }
  const root = document.documentElement;
  const rect = origin?.getBoundingClientRect();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : 0;
  root.style.setProperty('--reveal-x', `${x}px`);
  root.style.setProperty('--reveal-y', `${y}px`);
  root.style.setProperty('--reveal-r', `${Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))}px`);
  start.call(document, update);
}
