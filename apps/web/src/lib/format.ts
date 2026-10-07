import { formatDuration } from '@shared/modules/cases';

/** Seconds -> hh:mm:ss. Averages may be fractional, so round first; formatDuration rejects non-integers. */
export const fmtSeconds = (s: number) => formatDuration(Math.max(0, Math.round(s)));

/** Flexible duration parser: supports plain seconds (e.g. "120"), suffixes (e.g. "2m", "120s"), mm:ss (e.g. "02:00"), and hh:mm:ss (e.g. "00:02:00"). */
export function parseDuration(v: string): number | null {
  const trimmed = v.trim().toLowerCase();
  if (!trimmed) return null;

  // 1. Plain integer seconds (e.g. "120", "45", "300")
  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return isNaN(n) ? null : Math.max(0, n);
  }

  // 2. Seconds with suffix (e.g. "120s", "120 sec", "120 secs", "120 seconds")
  const secMatch = /^(\d+)\s*s(?:ec|ecs|econds)?$/.exec(trimmed);
  if (secMatch) {
    const n = parseInt(secMatch[1], 10);
    return isNaN(n) ? null : Math.max(0, n);
  }

  // 3. Minutes with suffix (e.g. "2m", "2 min", "2 mins", "2 mints", "2 minutes")
  const minMatch = /^(\d+)\s*m(?:in|ins|ints|inute|inutes)?$/.exec(trimmed);
  if (minMatch) {
    const n = parseInt(minMatch[1], 10);
    return isNaN(n) ? null : Math.max(0, n) * 60;
  }

  // 4. mm:ss format (e.g. "02:30" or "5:45")
  const mmss = /^(\d{1,4}):([0-5]?\d)$/.exec(trimmed);
  if (mmss) {
    return Number(mmss[1]) * 60 + Number(mmss[2]);
  }

  // 5. hh:mm:ss format (e.g. "00:05:42")
  const hhmmss = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/.exec(trimmed);
  if (hhmmss) {
    return Number(hhmmss[1]) * 3600 + Number(hhmmss[2]) * 60 + Number(hhmmss[3]);
  }

  return null;
}
export const fmtDateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
/** Money is a decimal string end to end: validate the text, never convert to a number. */
export const isMoney = (v: string) => /^\d{1,12}(\.\d{1,2})?$/.test(v.trim());
export const today = () => new Date().toISOString().slice(0, 10);
