import { useEffect, useLayoutEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { parseTheme, resolveTheme, THEME_KEY, type ThemePreference } from '../theme';
import { parsePreferences, PREFERENCES_KEY } from '../preferences';
import { parsePalette, PALETTE_KEY } from '../palettes';
import { applyAppearance, revealFrom } from '../appearance';

const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

export function usePreferences() {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    try { return parseTheme(localStorage.getItem(THEME_KEY)); } catch { return 'system'; }
  });
  const [palette, setPalette] = useState<string>(() => {
    try { return parsePalette(localStorage.getItem(PALETTE_KEY)); } catch { return parsePalette(null); }
  });
  const [system, setSystem] = useState(systemDark);
  const resolvedTheme = resolveTheme(theme, system);
  const [preferences, setPreferences] = useState(() => {
    try { return parsePreferences(localStorage.getItem(PREFERENCES_KEY)); } catch { return parsePreferences(null); }
  });
  const setShowToastNotifications = (value: boolean) => setPreferences(previous => ({ ...previous, showToastNotifications: value }));
  const setShowConfirmModals = (value: boolean) => setPreferences(previous => ({ ...previous, showConfirmModals: value }));
  useEffect(() => {
    try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* Session-only if storage is unavailable. */ }
  }, [preferences]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystem(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  // Layout effect: colours change in the same commit, inside a view transition.
  useLayoutEffect(() => { applyAppearance(palette, resolvedTheme); }, [palette, resolvedTheme]);
  useEffect(() => { try { localStorage.setItem(THEME_KEY, theme); } catch { /* Session-only. */ } }, [theme]);
  useEffect(() => { try { localStorage.setItem(PALETTE_KEY, palette); } catch { /* Session-only. */ } }, [palette]);

  // Both switches reveal the new colours outward from the control that was used.
  const switchTheme = (next: ThemePreference, origin?: Element | null) => {
    if (resolveTheme(next, system) === resolvedTheme) { setTheme(next); return; }
    revealFrom(origin, () => flushSync(() => setTheme(next)));
  };
  const switchPalette = (next: string, origin?: Element | null) => revealFrom(origin, () => flushSync(() => setPalette(parsePalette(next))));

  return { theme, setTheme, resolvedTheme, palette, switchTheme, switchPalette, ...preferences,
    setShowToastNotifications, setShowConfirmModals };
}
