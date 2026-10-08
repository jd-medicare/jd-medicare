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

/** Calculate age from date of birth (YYYY-MM-DD) or explicit age fallback */
export function calculateAge(dob?: string | null, fallbackAge?: unknown): string {
  if (fallbackAge !== undefined && fallbackAge !== null && String(fallbackAge).trim() !== '') {
    const n = parseInt(String(fallbackAge).trim(), 10);
    if (!isNaN(n) && n >= 0 && n <= 130) return String(n);
  }
  if (!dob) return '—';
  try {
    const s = String(dob).trim();
    const parts = s.split(/[-/]/);
    let birth: Date;
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        birth = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else if (parts[2].length === 4) {
        birth = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      } else {
        birth = new Date(s);
      }
    } else {
      birth = new Date(s);
    }
    if (isNaN(birth.getTime())) return '—';
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 && age <= 130 ? String(age) : '—';
  } catch {
    return '—';
  }
}

/** Given an age in years, calculate approximate ISO date of birth (YYYY-01-01) */
export function dobFromAge(age: number | string): string {
  const n = parseInt(String(age).trim(), 10);
  if (isNaN(n) || n < 0 || n > 130) return '';
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - n;
  return `${birthYear}-01-01`;
}

/** Extract effective state from customer object (state field, extra.state, or address fallback) */
export function getCustomerState(customer?: { state?: string | null; address?: string | null; extra?: any } | null): string {
  if (!customer) return '—';
  const state = customer.state || customer.extra?.state || customer.address;
  return state ? String(state).trim() : '—';
}

/** Extract effective SSN or MBI from customer object */
export function getCustomerSsnMbi(customer?: { ssnMbi?: string | null; extra?: any } | null): string {
  if (!customer) return '—';
  const ssn = customer.ssnMbi || customer.extra?.ssnMbi;
  return ssn ? String(ssn).trim() : '—';
}

/** Safely mask SSN or MBI for secure display (e.g. •••-••-6789) */
export function maskSsnMbi(val?: string | null): string {
  if (!val || val === '—') return '—';
  const clean = String(val).trim();
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  return `•••-••-${last4}`;
}

