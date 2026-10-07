import { useEffect, useId, useRef, type InputHTMLAttributes, type ReactNode } from 'react';
import type { CaseStatus } from '../schemas';
export const StatusBadge = ({ status }: { status: CaseStatus }) => (
  <span className={`badge b-${status}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>
);
export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null); const tid = useId();
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); else if (!open && d.open) d.close(); }, [open]);
  return (<dialog ref={ref} onClose={onClose} aria-labelledby={tid}><h2 id={tid} style={{ marginTop: 0 }}>{title}</h2>{children}</dialog>);
}
/** Labelled text input with an inline error that is announced and linked via aria-describedby. */
export function TextField({ label, value, onChange, error, ...rest }: { label: string; value: string; onChange: (v: string) => void; error?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  const id = useId();
  return (<>
    <label htmlFor={id}>{label}</label>
    <input id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} {...rest} />
    {error && <span id={`${id}-e`} className="err" role="alert">{error}</span>}
  </>);
}
interface PageMeta { page: number; totalPages: number; total: number }
export function Pager({ meta, page, onPage }: { meta?: PageMeta; page: number; onPage: (n: number) => void }) {
  if (!meta) return null;
  return (<nav aria-label="Pagination" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
    <button className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
    <span>Page {meta.page} of {meta.totalPages} ({meta.total} records)</span>
    <button className="btn" disabled={page >= meta.totalPages} onClick={() => onPage(page + 1)}>Next</button></nav>);
}
/** Loading skeleton rows and the empty message for a table body. Render it first inside <tbody>. */
export function StateRows({ loading, empty, cols, message }: { loading: boolean; empty: boolean; cols: number; message: string }) {
  if (loading) return <>{Array.from({ length: 6 }, (_, i) => <tr key={i}><td colSpan={cols}><div className="skeleton" style={{ height: 20 }} /></td></tr>)}</>;
  return empty ? <tr><td colSpan={cols}>{message}</td></tr> : null;
}
export function Kpis({ items, label }: { items: Array<[string, string | number]>; label: string }) {
  return (<section className="kpis" aria-label={label}>{items.map(([l, v]) => (
    <div className="card" key={l}><div style={{ color: 'var(--secondary)' }}>{l}</div><div style={{ fontSize: 26, fontWeight: 700 }}>{v}</div></div>))}</section>);
}
export const Loading = () => <div className="skeleton" style={{ height: 120 }} aria-busy="true" />;
export const pageStyle = { padding: 24, display: 'grid', gap: 16, maxWidth: 1200, margin: '0 auto' } as const;

export { THEMES, ThemeSwitcher, applyTheme, initTheme, storedTheme } from './theme';
export { AuthLayout } from './AuthLayout';
