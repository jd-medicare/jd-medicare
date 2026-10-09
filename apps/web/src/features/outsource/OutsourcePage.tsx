import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { outsourceService } from '../../services/outsource';
import { errorMessage } from '../../services/api-client';
import { Dialog, StatusBadge } from '../../design-system';
import { setCaseStatus } from '../../services/caseSync';
import { notifyLiveSync } from '../../services/liveSync';
import { calculateAge, fmtDateTime, getCustomerSsnMbi, getCustomerState } from '../../lib/format';
import type { CaseDto, SessionUserDto } from '../../schemas';

export default function OutsourcePage({ user }: { user: SessionUserDto }) {
  const [page, setPage] = useState(1);
  const [phoneInput, setPhoneInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ phone: '', status: '' });
  const [sort, setSort] = useState('submittedAt:desc');
  const [target, setTarget] = useState<{ c: CaseDto; kind: 'accept' | 'reject' } | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<CaseDto | null>(null);
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['outsource', page, appliedFilters.phone, appliedFilters.status, sort],
    refetchInterval: 3000,
    queryFn: () =>
      outsourceService.cases({
        page,
        pageSize: 25,
        phone: appliedFilters.phone || undefined,
        status: appliedFilters.status || undefined,
        sort,
      }),
  });

  const summary = useQuery({
    queryKey: ['outsource-summary'],
    refetchInterval: 3000,
    queryFn: () => outsourceService.summary(),
  });
  const isSuper = Boolean(user.isPrimarySuperAdmin || user.roleKey === 'PRIMARY_SUPER_ADMIN' || user.roleKey === 'SUPER_ADMIN' || user.roleKey === 'ADMIN' || user.permissions.includes('*'));
  const canProcess = isSuper || user.permissions.includes('case:accept');
  const toggleSort = (f: string) => setSort(sort === `${f}:asc` ? `${f}:desc` : `${f}:asc`);
  const rows = list.data?.data ?? [];
  const meta = list.data?.meta;
  const s = summary.data?.data;
  const cols = canProcess ? 10 : 9;

  const pendingCount = s?.pending ?? s?.remaining ?? 0;
  const kpis: Array<[string, string | number]> = s
    ? [
        ['Total', s.total],
        ['Pending', pendingCount],
        ['Accepted', s.accepted],
        ['Rejected', s.rejected],
        ['Processed', `${s.processingRate}%`],
      ]
    : [];

  function handleSearch(e?: FormEvent) {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({ phone: phoneInput.trim(), status: statusInput });
  }

  function handleClear() {
    setPhoneInput('');
    setStatusInput('');
    setPage(1);
    setAppliedFilters({ phone: '', status: '' });
  }

  return (
    <main style={{ padding: 24, display: 'grid', gap: 16, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ margin: 0 }}>Records to process</h1>

      <section className="kpis" aria-label="Summary">
        {s
          ? kpis.map(([l, v]) => (
              <div className="card" key={l}>
                <div style={{ color: 'var(--secondary)' }}>{l}</div>
                <div style={{ fontSize: 26, fontWeight: 700 }}>{v}</div>
              </div>
            ))
          : Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton" style={{ height: 76 }} />)}
      </section>

      {/* Aligned search form with Search and Clear buttons */}
      <form
        role="search"
        aria-label="Filter outsource records"
        onSubmit={handleSearch}
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          padding: '16px 20px',
          background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
          borderRadius: 10,
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200, flex: '1 1 200px' }}>
          <label htmlFor="outsource-phone" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
            Phone
          </label>
          <input
            id="outsource-phone"
            className="input"
            style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
            placeholder="Search by phone"
            aria-label="Search by phone"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160, flex: '1 1 160px' }}>
          <label htmlFor="outsource-status" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
            Status
          </label>
          <select
            id="outsource-status"
            className="input"
            style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
            aria-label="Filter by status"
            value={statusInput}
            onChange={(e) => setStatusInput(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8, height: 40, alignItems: 'center' }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ height: 40, padding: '0 20px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Search
          </button>
          <button
            type="button"
            className="btn"
            style={{ height: 40, padding: '0 16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
      </form>

      {list.isError && <p className="err" role="alert">{errorMessage(list.error)}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Customer</th>
              <th scope="col">Phone</th>
              <th scope="col">Age</th>
              <th scope="col">State</th>
              <th scope="col">Zip code</th>
              <th scope="col">SSN | MBI</th>
              <th scope="col">Agent</th>
              <th
                scope="col"
                aria-sort={sort.startsWith('callLengthSeconds') ? (sort.endsWith('asc') ? 'ascending' : 'descending') : 'none'}
              >
                <button className="btn" onClick={() => toggleSort('callLengthSeconds')}>
                  Call length
                </button>
              </th>
              <th scope="col">Status</th>
              {canProcess && <th scope="col">Action</th>}
            </tr>
          </thead>
          <tbody>
            {list.isLoading &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={cols}>
                    <div className="skeleton" style={{ height: 20 }} />
                  </td>
                </tr>
              ))}
            {!list.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={cols}>No records match these filters. Clear the search or choose another status.</td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontWeight: 600,
                      color: 'var(--primary, #3b82f6)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      textDecoration: 'underline',
                    }}
                    onClick={() => setDetailsTarget(c)}
                    title="Click to view full customer details"
                  >
                    {c.customer.firstName} {c.customer.lastName}
                  </button>
                </td>
                <td>{c.customer.phone}</td>
                <td>{calculateAge(c.customer.dateOfBirth, (c.customer.extra as any)?.age)}</td>
                <td>{getCustomerState(c.customer)}</td>
                <td>{c.customer.zipCode || '—'}</td>
                <td style={{ fontSize: 13, color: 'var(--muted, #64748b)' }}>{getCustomerSsnMbi(c.customer)}</td>
                <td>{c.agent.fullName}</td>
                <td>{c.callLengthDisplay ?? '—'}</td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
                {canProcess && (
                  <td>
                    {(c.status === 'PENDING' || c.status === 'SUBMITTED') && (
                      <span style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => setTarget({ c, kind: 'accept' })}>
                          Accept
                        </button>
                        <button className="btn btn-danger" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => setTarget({ c, kind: 'reject' })}>
                          Reject
                        </button>
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && (
        <nav aria-label="Pagination" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {meta.page} of {meta.totalPages} ({meta.total} records)
          </span>
          <button className="btn" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </nav>
      )}

      <ProcessDialog
        target={target}
        onClose={() => setTarget(null)}
        onDone={() => {
          setTarget(null);
          qc.invalidateQueries({ queryKey: ['outsource'] });
          qc.invalidateQueries({ queryKey: ['outsource-summary'] });
        }}
      />

      <CustomerDetailsDialog
        target={detailsTarget}
        onClose={() => setDetailsTarget(null)}
      />
    </main>
  );
}

function ProcessDialog({
  target,
  onClose,
  onDone,
}: {
  target: { c: CaseDto; kind: 'accept' | 'reject' } | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const qc = useQueryClient();

  useEffect(() => {
    setReason('');
  }, [target]);

  const m = useMutation({
    mutationFn: async () => {
      if (!target) return;
      const caseId = target.c.id;
      const customerId = target.c.customer?.id;
      const newStatus = target.kind === 'accept' ? 'ACCEPTED' : 'REJECTED';

      // 1. Immediately store status
      setCaseStatus(caseId, newStatus, customerId);

      // 2. Perform optimistic query cache update
      qc.setQueriesData({ queryKey: ['outsource'] }, (old: any) => {
        if (!old?.data || !Array.isArray(old.data)) return old;
        return {
          ...old,
          data: old.data.map((item: CaseDto) =>
            item.id === caseId || (customerId && item.customer?.id === customerId)
              ? { ...item, status: newStatus }
              : item
          ),
        };
      });

      qc.setQueriesData({ queryKey: ['cases'] }, (old: any) => {
        if (!old?.data || !Array.isArray(old.data)) return old;
        return {
          ...old,
          data: old.data.map((item: CaseDto) =>
            item.id === caseId || (customerId && item.customer?.id === customerId)
              ? { ...item, status: newStatus }
              : item
          ),
        };
      });

      // 3. Call backend API
      if (target.kind === 'accept') {
        return outsourceService.accept(caseId, customerId);
      } else {
        return outsourceService.reject(caseId, reason.trim() || 'Rejected', customerId);
      }
    },
    onSuccess: () => {
      // Invalidate queries so CEO dashboard and other views immediately sync
      qc.invalidateQueries({ queryKey: ['outsource'] });
      qc.invalidateQueries({ queryKey: ['outsource-summary'] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      qc.invalidateQueries({ queryKey: ['ceo'] });
      qc.invalidateQueries({ queryKey: ['report'] });
      notifyLiveSync('case-updated');
      onDone();
    },
  });

  const reject = target?.kind === 'reject';

  return (
    <Dialog open={!!target} title={reject ? 'Reject this record' : 'Accept this record'} onClose={onClose}>
      {target && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px 12px', fontSize: 13, background: 'rgba(255, 255, 255, 0.04)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
            <span style={{ color: 'var(--muted, #94a3b8)' }}>Customer:</span>
            <strong>{target.c.customer.firstName} {target.c.customer.lastName}</strong>

            <span style={{ color: 'var(--muted, #94a3b8)' }}>Phone:</span>
            <span>{target.c.customer.phone}</span>

            <span style={{ color: 'var(--muted, #94a3b8)' }}>Age:</span>
            <span>{calculateAge(target.c.customer.dateOfBirth, (target.c.customer.extra as any)?.age)}</span>

            <span style={{ color: 'var(--muted, #94a3b8)' }}>State:</span>
            <span>{getCustomerState(target.c.customer)}</span>

            <span style={{ color: 'var(--muted, #94a3b8)' }}>Zip code:</span>
            <span>{target.c.customer.zipCode || '—'}</span>

            <span style={{ color: 'var(--muted, #94a3b8)' }}>SSN | MBI:</span>
            <span>{getCustomerSsnMbi(target.c.customer)}</span>

            <span style={{ color: 'var(--muted, #94a3b8)' }}>Agent:</span>
            <span>{target.c.agent?.fullName || '—'}</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted, #94a3b8)' }}>
            {reject
              ? 'Are you sure you want to mark this record as Rejected?'
              : 'Are you sure you want to mark this record as Accepted?'}
          </p>
        </div>
      )}
      {reject && (
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
            Reason for rejection (optional)
          </span>
          <textarea
            className="input"
            rows={3}
            style={{ width: '100%' }}
            placeholder="Provide a reason for rejection..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      )}
      {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn ${reject ? 'btn-danger' : 'btn-primary'}`}
          disabled={m.isPending}
          onClick={() => m.mutate()}
        >
          {m.isPending ? 'Processing…' : reject ? 'Reject record' : 'Accept record'}
        </button>
      </div>
    </Dialog>
  );
}

function CustomerDetailsDialog({ target, onClose }: { target: CaseDto | null; onClose: () => void }) {
  if (!target) return null;
  const c = target.customer;
  return (
    <Dialog open={!!target} title="Customer Full Details" onClose={onClose}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 12px', fontSize: 14 }}>
          <span style={{ color: 'var(--muted, #94a3b8)' }}>Full Name:</span>
          <strong>{c.firstName} {c.lastName}</strong>

          <span style={{ color: 'var(--muted, #94a3b8)' }}>Phone:</span>
          <strong>{c.phone}</strong>

          <span style={{ color: 'var(--muted, #94a3b8)' }}>Age:</span>
          <strong>{calculateAge(c.dateOfBirth, (c.extra as any)?.age)}</strong>

          <span style={{ color: 'var(--muted, #94a3b8)' }}>Date of birth:</span>
          <span>{c.dateOfBirth || '—'}</span>

          <span style={{ color: 'var(--muted, #94a3b8)' }}>State:</span>
          <span>{getCustomerState(c)}</span>

          <span style={{ color: 'var(--muted, #94a3b8)' }}>Zip code:</span>
          <span>{c.zipCode || '—'}</span>

          <span style={{ color: 'var(--muted, #94a3b8)' }}>SSN | MBI:</span>
          <span>{getCustomerSsnMbi(c)}</span>

          <span style={{ color: 'var(--muted, #94a3b8)' }}>Intake Agent:</span>
          <span>{target.agent?.fullName || '—'}</span>

          <span style={{ color: 'var(--muted, #94a3b8)' }}>Call length:</span>
          <span>{target.callLengthDisplay || '—'}</span>

          <span style={{ color: 'var(--muted, #94a3b8)' }}>Status:</span>
          <div><StatusBadge status={target.status} /></div>

          <span style={{ color: 'var(--muted, #94a3b8)' }}>Submitted:</span>
          <span>{fmtDateTime(target.submittedAt)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
}
