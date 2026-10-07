import type { ReactNode } from 'react';
const P: Record<string, ReactNode> = {
  customer: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M19 8v6M16 11h6" /></>,
  cases: <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.5h8.5A1.5 1.5 0 0 1 21 10v8.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />,
  outsource: <><path d="M4 13l2.4-7h11.2L20 13" /><path d="M4 13v5.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V13h-4.5a3.5 3.5 0 0 1-7 0z" /></>,
  reports: <><path d="M4 20V4" /><path d="M4 20h16" /><rect x="7.5" y="11" width="3" height="6" rx=".6" /><rect x="13" y="7" width="3" height="10" rx=".6" /></>,
  ceo: <><path d="M4.5 18a8.5 8.5 0 1 1 15 0" /><path d="M12 13.5l4-4" /><circle cx="12" cy="14" r="1.2" /></>,
  income: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9M9.6 10c0-1 1-1.8 2.4-1.8s2.4.8 2.4 1.8-1 1.6-2.4 1.9-2.4.9-2.4 1.9 1 1.8 2.4 1.8 2.4-.8 2.4-1.8" /></>,
  expense: <><path d="M6 3h12v18l-3-1.8-3 1.8-3-1.8L6 21z" /><path d="M9 8h6M9 12h6" /></>,
  users: <><circle cx="9" cy="8" r="3.3" /><path d="M2.8 19.5c.6-3.3 3-5 6.2-5s5.6 1.7 6.2 5" /><path d="M16.5 5a3.3 3.3 0 0 1 0 6.3M18 14.8c1.9.6 3 2.2 3.3 4.7" /></>,
  audit: <><path d="M12 3l7.5 3v5.5c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V6z" /><path d="M9 12l2.2 2.2L15.5 10" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  out: <><path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10" /><path d="M15 8l4 4-4 4M19 12H9" /></>,
};
const BY_PATH: Record<string, string> = {
  '/customers/new': 'customer', '/cases': 'cases', '/team/agents': 'users', '/outsource': 'outsource', '/reports': 'reports', '/ceo': 'ceo',
  '/finance/income': 'income', '/finance/expenses': 'expense', '/admin/users': 'users', '/admin/audit': 'audit',
};
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[name] ?? P.cases}</svg>);
}
export const iconForPath = (path: string) => BY_PATH[path] ?? 'cases';
