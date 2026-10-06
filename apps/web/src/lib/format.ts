import { formatDuration } from '@shared/modules/cases';

/** Seconds -> hh:mm:ss. Averages may be fractional, so round first; formatDuration rejects non-integers. */
export const fmtSeconds = (s: number) => formatDuration(Math.max(0, Math.round(s)));

/** "hh:mm:ss" -> durationSeconds, or null when the text is not a valid duration. */
export function parseDuration(v: string): number | null {
  const m = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/.exec(v.trim());
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
}
export const fmtDateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
/** Money is a decimal string end to end: validate the text, never convert to a number. */
export const isMoney = (v: string) => /^\d{1,12}(\.\d{1,2})?$/.test(v.trim());
export const today = () => new Date().toISOString().slice(0, 10);
