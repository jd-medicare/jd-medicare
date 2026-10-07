import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { caseService } from '../../services/cases';
import { outsourceService } from '../../services/outsource';
import { errorMessage } from '../../services/api-client';
import { Dialog, Pager, StateRows, StatusBadge, pageStyle } from '../../design-system';
import { calculateAge, fmtDateTime, getCustomerSsnMbi, getCustomerState, parseDuration } from '../../lib/format';
import { formatCallSeconds, setCaseStatus } from '../../services/caseSync';
import { recordAudit } from '../../services/audit';
import { notifyLiveSync } from '../../services/liveSync';
import { getAllAssignments, getAgentIdsForTeamLeader, getTeamLeaderIdForAgent } from '../../services/teamAssignments';
import type { CaseDto, SessionUserDto } from '../../schemas';

export default function CasesPage({ user }: { user: SessionUserDto }) {
  const [page, setPage] = useState(1);
  const [phoneInput, setPhoneInput] = useState('');
  const [zipCodeInput, setZipCodeInput] = useState('');
  const [stateInput, setStateInput] = useState('');
  const [agentInput, setAgentInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [dateFromInput, setDateFromInput] = useState('');
  const [dateToInput, setDateToInput] = useState('');
  const [sortInput, setSortInput] = useState('submittedAt:desc');
  const [target, setTarget] = useState<{ c: CaseDto; kind: 'accept' | 'reject' } | null>(null);
  const [callLengthTarget, setCallLengthTarget] = useState<CaseDto | null>(null);

  const qc = useQueryClient();

  // Applied query params (updated on Search or Clear)
  const [appliedFilters, setAppliedFilters] = useState({
    phone: '',
    zipCode: '',
    state: '',
    agent: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    sort: 'submittedAt:desc',
  });

  const list = useQuery({
    queryKey: ['cases', page, appliedFilters.phone, appliedFilters.status, appliedFilters.dateFrom, appliedFilters.dateTo, appliedFilters.sort],
    refetchInterval: 3000,
    queryFn: () =>
      caseService.list({
        page,
        pageSize: 25,
        phone: appliedFilters.phone || undefined,
        status: appliedFilters.status || undefined,
        dateFrom: appliedFilters.dateFrom || undefined,
        dateTo: appliedFilters.dateTo || undefined,
        sort: appliedFilters.sort,
      }),
  });

  const isSuper = Boolean(user.isPrimarySuperAdmin || user.roleKey === 'PRIMARY_SUPER_ADMIN' || user.roleKey === 'SUPER_ADMIN' || user.roleKey === 'ADMIN' || user.permissions.includes('*'));
  const isTL = user.roleKey === 'TEAM_LEADER';
  const own = user.roleKey === 'AGENT';
  const showCall = isSuper || isTL || user.permissions.includes('call_length:view');
  const canEditCall = isSuper || isTL || user.permissions.includes('call_length:update') || user.permissions.includes('call_length:create');
  const canProcess = isSuper || user.permissions.includes('case:accept');

  // Filter client-side by zip code, agent, and Team Leader assignment
  const rawRows = list.data?.data ?? [];

  // Available unique states, zip codes, and agents for dropdowns
  const availableStates = Array.from(new Set(rawRows.map((c) => getCustomerState(c.customer)).filter((s) => s && s !== '—'))).sort();
  const availableZips = Array.from(new Set(rawRows.map((c) => c.customer?.zipCode?.trim()).filter(Boolean) as string[])).sort();
  const availableAgents: Array<{ id: string; name: string }> = [];
  const seenAgents = new Set<string>();
  for (const c of rawRows) {
    const id = c.agent?.id || c.agent?.fullName || '';
    const name = c.agent?.fullName || '';
    if (name && !seenAgents.has(id)) {
      seenAgents.add(id);
      availableAgents.push({ id, name });
    }
  }

  const myAssignedAgentIds = isTL ? getAgentIdsForTeamLeader(user.id) : [];
  const systemAssignments = isTL ? getAllAssignments() : [];

  const rows = rawRows.filter((c) => {
    // If user is a Team Leader and assignments exist, only show cases of assigned agents
    if (isTL && systemAssignments.length > 0) {
      const agentId = c.agent?.id;
      const isAssigned =
        c.teamLeader?.id === user.id ||
        (c as any).teamLeaderId === user.id ||
        (agentId && (myAssignedAgentIds.includes(agentId) || getTeamLeaderIdForAgent(agentId) === user.id));
      if (!isAssigned) return false;
    }
    if (appliedFilters.state && getCustomerState(c.customer).toLowerCase() !== appliedFilters.state.toLowerCase()) {
      return false;
    }
    if (appliedFilters.zipCode && c.customer.zipCode !== appliedFilters.zipCode) {
      return false;
    }
    if (appliedFilters.agent && c.agent.fullName !== appliedFilters.agent && c.agent.id !== appliedFilters.agent) {
      return false;
    }
    return true;
  });

  const cols = 8 + (own ? 0 : 1) + (showCall ? 1 : 0) + (canProcess ? 1 : 0);

  // Live auto-filter when user types 7+ digits of phone number
  function handlePhoneChange(val: string) {
    setPhoneInput(val);
    const digits = val.replace(/\D/g, '');
    if (digits.length >= 7) {
      setPage(1);
      setAppliedFilters((prev) => ({ ...prev, phone: val.trim() }));
    }
  }

  function handleSearch(e?: FormEvent) {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedFilters({
      phone: phoneInput.trim(),
      zipCode: zipCodeInput.trim(),
      state: stateInput.trim(),
      agent: agentInput.trim(),
      status: statusInput,
      dateFrom: dateFromInput,
      dateTo: dateToInput,
      sort: sortInput,
    });
  }

  function handleClear() {
    setPhoneInput('');
    setZipCodeInput('');
    setStateInput('');
    setAgentInput('');
    setStatusInput('');
    setDateFromInput('');
    setDateToInput('');
    setSortInput('submittedAt:desc');
    setPage(1);
    setAppliedFilters({
      phone: '',
      zipCode: '',
      state: '',
      agent: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      sort: 'submittedAt:desc',
    });
  }

  return (
    <main style={pageStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0 }}>{own ? 'My cases' : 'Cases'}</h1>
        {own && (
          <Link to="/customers/new" className="btn btn-primary" style={{ height: 40, display: 'inline-flex', alignItems: 'center' }}>
            + New customer
          </Link>
        )}
      </div>

      {/* Filter Box with uniform 40px height controls and Zip code search */}
      <form
        role="search"
        aria-label="Filter cases"
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
          marginTop: 8,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150, flex: '1 1 150px' }}>
          <label htmlFor="cases-phone" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
            Phone
          </label>
          <input
            id="cases-phone"
            className="input"
            placeholder="Search phone (7 digits auto-searches)…"
            style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
            value={phoneInput}
            onChange={(e) => handlePhoneChange(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140, flex: '1 1 140px' }}>
          <label htmlFor="cases-zip" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
            Zip code
          </label>
          <select
            id="cases-zip"
            className="input"
            style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
            value={zipCodeInput}
            onChange={(e) => setZipCodeInput(e.target.value)}
          >
            <option value="">All zip codes</option>
            {availableZips.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140, flex: '1 1 140px' }}>
          <label htmlFor="cases-state" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
            State
          </label>
          <select
            id="cases-state"
            className="input"
            style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
            value={stateInput}
            onChange={(e) => setStateInput(e.target.value)}
          >
            <option value="">All states</option>
            {availableStates.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {!own && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150, flex: '1 1 150px' }}>
            <label htmlFor="cases-agent" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
              User / Agent
            </label>
            <select
              id="cases-agent"
              className="input"
              style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
            >
              <option value="">All users / agents</option>
              {availableAgents.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 130, flex: '1 1 130px' }}>
          <label htmlFor="cases-status" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
            Status
          </label>
          <select
            id="cases-status"
            className="input"
            style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140, flex: '1 1 140px' }}>
          <label htmlFor="cases-date-from" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
            Submitted from
          </label>
          <input
            id="cases-date-from"
            className="input"
            type="date"
            style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
            value={dateFromInput}
            onChange={(e) => setDateFromInput(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140, flex: '1 1 140px' }}>
          <label htmlFor="cases-date-to" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
            Submitted to
          </label>
          <input
            id="cases-date-to"
            className="input"
            type="date"
            style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
            value={dateToInput}
            onChange={(e) => setDateToInput(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 130, flex: '1 1 130px' }}>
          <label htmlFor="cases-sort" style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--muted, #94a3b8)' }}>
            Sort
          </label>
          <select
            id="cases-sort"
            className="input"
            style={{ height: 40, boxSizing: 'border-box', width: '100%' }}
            value={sortInput}
            onChange={(e) => setSortInput(e.target.value)}
          >
            <option value="submittedAt:desc">Newest first</option>
            <option value="submittedAt:asc">Oldest first</option>
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
              {!own && <th scope="col">Agent</th>}
              <th scope="col">Submitted</th>
              {showCall && <th scope="col">Call length</th>}
              <th scope="col">Status</th>
              {canProcess && <th scope="col">Action</th>}
            </tr>
          </thead>
          <tbody>
            <StateRows
              loading={list.isLoading}
              empty={!list.isError && rows.length === 0}
              cols={cols}
              message="No cases match these filters. Clear a filter or add a customer."
            />
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/cases/${c.id}`} style={{ fontWeight: 600, color: 'var(--primary, #3b82f6)' }}>
                    {c.customer.firstName} {c.customer.lastName}
                  </Link>
                </td>
                <td>{c.customer.phone}</td>
                <td>{calculateAge(c.customer.dateOfBirth, (c.customer.extra as any)?.age)}</td>
                <td>{getCustomerState(c.customer)}</td>
                <td>{c.customer.zipCode || '—'}</td>
                <td style={{ fontSize: 13, color: 'var(--muted, #64748b)' }}>{getCustomerSsnMbi(c.customer)}</td>
                {!own && <td>{c.agent.fullName}</td>}
                <td>{fmtDateTime(c.submittedAt)}</td>
                {showCall && (
                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span>{c.callLengthDisplay ?? '—'}</span>
                      {canEditCall && (!c.callLengthDisplay || c.callLengthDisplay === '—') && (
                        <button
                          type="button"
                          className="btn"
                          style={{ height: 24, padding: '0 8px', fontSize: 11 }}
                          title="Set call duration"
                          onClick={() => setCallLengthTarget(c)}
                        >
                          + Set length
                        </button>
                      )}
                    </div>
                  </td>
                )}
                <td>
                  <StatusBadge status={c.status} />
                </td>
                {canProcess && (
                  <td>
                    {(c.status === 'PENDING' || c.status === 'SUBMITTED') && (
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '2px 8px', fontSize: 12 }}
                          onClick={() => setTarget({ c, kind: 'accept' })}
                        >
                          Accept
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '2px 8px', fontSize: 12 }}
                          onClick={() => setTarget({ c, kind: 'reject' })}
                        >
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
      <Pager meta={list.data?.meta} page={page} onPage={setPage} />

      {/* Edit Call Length Dialog */}
      <EditCallLengthDialog
        target={callLengthTarget}
        onClose={() => setCallLengthTarget(null)}
        onSaved={() => {
          setCallLengthTarget(null);
          qc.invalidateQueries({ queryKey: ['cases'] });
        }}
      />

      {/* Quick Accept/Reject Dialog for Cases page */}
      <CaseActionDialog
        target={target}
        onClose={() => setTarget(null)}
        onDone={() => {
          setTarget(null);
          qc.invalidateQueries({ queryKey: ['cases'] });
          qc.invalidateQueries({ queryKey: ['outsource'] });
        }}
      />
    </main>
  );
}

function EditCallLengthDialog({
  target,
  onClose,
  onSaved,
}: {
  target: CaseDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [durationStr, setDurationStr] = useState('');
  const [err, setErr] = useState('');
  const qc = useQueryClient();

  useEffect(() => {
    if (target) {
      const total = target.callLengthSeconds || 0;
      setDurationStr(total > 0 ? String(total) : '');
      setErr('');
    }
  }, [target]);

  const m = useMutation({
    mutationFn: async (secsToSave: number) => {
      if (!target) return;
      return caseService.setCallLength(target.id, secsToSave);
    },
    onSuccess: (_, secsSaved) => {
      if (!target) return;
      // Immediately update cache on the spot so NO REFRESH is needed
      qc.setQueriesData({ queryKey: ['cases'] }, (old: any) => {
        if (!old?.data || !Array.isArray(old.data)) return old;
        return {
          ...old,
          data: old.data.map((item: any) => {
            if (item.id === target.id || item.customer?.id === target.id) {
              return {
                ...item,
                callLengthSeconds: secsSaved,
                callLengthDisplay: formatCallSeconds(secsSaved),
              };
            }
            return item;
          }),
        };
      });
      qc.setQueryData(['case', target.id], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            callLengthSeconds: secsSaved,
            callLengthDisplay: formatCallSeconds(secsSaved),
          },
        };
      });
      qc.invalidateQueries({ queryKey: ['cases'] });
      qc.invalidateQueries({ queryKey: ['case', target.id] });
      recordAudit('CALL_LENGTH_UPDATED', 'case', target.id, {
        durationSeconds: secsSaved,
        formatted: formatCallSeconds(secsSaved),
        customer: `${target.customer.firstName} ${target.customer.lastName}`,
        phone: target.customer.phone,
      });
      notifyLiveSync('call-length-updated');
      onSaved();
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!target) return;
    const parsed = parseDuration(durationStr);
    if (parsed === null) {
      setErr('Enter duration in seconds (e.g. 120), or mm:ss (e.g. 02:00), or hh:mm:ss.');
      return;
    }
    setErr('');
    m.mutate(parsed);
  }

  return (
    <Dialog open={!!target} title="Set call length" onClose={onClose}>
      {target && (
        <form onSubmit={handleSubmit}>
          <p style={{ margin: '0 0 12px' }}>
            Set duration for call with <strong>{target.customer.firstName} {target.customer.lastName}</strong> ({target.customer.phone}):
          </p>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: 'var(--muted, #94a3b8)', display: 'block', marginBottom: 6 }}>
              Call duration (e.g. 120 for 2 mins, or 02:00, or 00:05:42)
            </label>
            <input
              className="input"
              autoFocus
              style={{ height: 42, width: '100%', fontSize: 15 }}
              placeholder="e.g. 120 or 02:00"
              value={durationStr}
              onChange={(e) => setDurationStr(e.target.value)}
            />
            <small style={{ display: 'block', marginTop: 4, color: 'var(--muted, #94a3b8)' }}>
              You can type pure seconds like <strong>120</strong>, or minutes/seconds like <strong>02:00</strong>.
            </small>
          </div>
          {err && <p className="err" role="alert">{err}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={m.isPending}>
              {m.isPending ? 'Saving…' : 'Save call length'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function CaseActionDialog({
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

      // 3. Call backend API
      if (target.kind === 'accept') {
        return outsourceService.accept(caseId, customerId);
      } else {
        return outsourceService.reject(caseId, reason.trim() || 'Rejected', customerId);
      }
    },
    onSuccess: () => {
      if (target) {
        if (target.kind === 'accept') {
          recordAudit('CASE_ACCEPTED', 'case', target.c.id, {
            customer: `${target.c.customer.firstName} ${target.c.customer.lastName}`,
            phone: target.c.customer.phone,
          });
        } else {
          recordAudit('CASE_REJECTED', 'case', target.c.id, {
            customer: `${target.c.customer.firstName} ${target.c.customer.lastName}`,
            phone: target.c.customer.phone,
            reason: reason.trim(),
          });
        }
      }
      qc.invalidateQueries({ queryKey: ['cases'] });
      qc.invalidateQueries({ queryKey: ['outsource'] });
      qc.invalidateQueries({ queryKey: ['outsource-summary'] });
      qc.invalidateQueries({ queryKey: ['ceo'] });
      qc.invalidateQueries({ queryKey: ['report'] });
      notifyLiveSync('case-updated');
      onDone();
    },
  });

  const reject = target?.kind === 'reject';

  return (
    <Dialog open={!!target} title={reject ? 'Reject this case' : 'Accept this case'} onClose={onClose}>
      {target && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px 0', fontSize: 14 }}>
            <strong>{target.c.customer.firstName} {target.c.customer.lastName}</strong> ({target.c.customer.phone})
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted, #94a3b8)' }}>
            {reject
              ? 'Are you sure you want to reject this case?'
              : 'Are you sure you want to accept this case?'}
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
          {m.isPending ? 'Processing…' : reject ? 'Reject case' : 'Accept case'}
        </button>
      </div>
    </Dialog>
  );
}
