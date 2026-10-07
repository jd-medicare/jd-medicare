import { useState, type CSSProperties } from 'react';

export interface ThemeDef { id: string; label: string; c1: string; c2: string }
/** auto = follow the operating system (no data-theme attribute). */
export const THEMES: ThemeDef[] = [
  { id: 'plum-peach', label: 'Plum & Peach', c1: '#542A52', c2: '#FFB39A' },
  { id: 'plum-night', label: 'Plum Night', c1: '#1d0f1e', c2: '#FFB39A' },
  { id: 'light', label: 'Light', c1: '#0e2f2d', c2: '#bfe6e1' },
  { id: 'dark', label: 'Dark', c1: '#0c1115', c2: '#5fb8b1' },
  { id: 'ocean', label: 'Ocean', c1: '#0d2a4a', c2: '#9fd2f5' },
];
const KEY = 'theme';
const valid = (t: string | null): t is string => !!t && THEMES.some((x) => x.id === t);

export function storedTheme(): string | null {
  try { const t = localStorage.getItem(KEY); return valid(t) ? t : null; } catch { return null; }
}
export function applyTheme(id: string | null) {
  const el = document.documentElement;
  if (id && valid(id)) el.setAttribute('data-theme', id); else el.removeAttribute('data-theme');
  try { if (id && valid(id)) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY); } catch { /* storage unavailable: theme still applies for this visit */ }
}
/** Call once before rendering (main.tsx) so there is no flash of the wrong theme. */
export const initTheme = () => applyTheme(storedTheme());

export function ThemeSwitcher({ className }: { className?: string }) {
  const [cur, setCur] = useState<string | null>(storedTheme());
  const pick = (id: string) => { setCur(id); applyTheme(id); };
  return (
    <div className={`theme-switch ${className ?? ''}`}>
      <span id="theme-label">Theme</span>
      <div className="theme-opts" role="radiogroup" aria-labelledby="theme-label">
        {THEMES.map((t) => (
          <button key={t.id} type="button" role="radio" aria-checked={cur === t.id} aria-label={t.label} title={t.label}
            className="theme-opt" style={{ '--c1': t.c1, '--c2': t.c2 } as CSSProperties} onClick={() => pick(t.id)} />))}
      </div>
    </div>
  );
}
