import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { caseService } from '../../services/cases';
import { adminService } from '../../services/admin';
import { errorMessage } from '../../services/api-client';
import { recordAudit } from '../../services/audit';
import { Dialog, Loading, StatusBadge, TextField, pageStyle } from '../../design-system';
import { calculateAge, dobFromAge, fmtDateTime, getCustomerSsnMbi, getCustomerState, maskSsnMbi, parseDuration } from '../../lib/format';
import { formatCallSeconds } from '../../services/caseSync';
import type { SessionUserDto } from '../../schemas';

export default function CaseDetailPage({ user }: { user: SessionUserDto }) {
  const id = useParams().id ?? '';
  const q = useQuery({ queryKey: ['case', id], queryFn: () => caseService.get(id), enabled: !!id });
  const c = q.data?.data;
  const isSuper = Boolean(
    user.isPrimarySuperAdmin ||
    user.roleKey === 'PRIMARY_SUPER_ADMIN' ||
    user.roleKey === 'SUPER_ADMIN' ||
    user.roleKey === 'ADMIN' ||
    user.permissions.includes('*')
  );
  const isTeamLeader = Boolean(user.roleKey === 'TEAM_LEADER' || user.roleKey.includes('TEAM_LEADER'));
  const canEditCustomer = (isSuper || isTeamLeader) && user.roleKey !== 'AGENT' && user.roleKey !== 'OUTSOURCE';
  const canSet = isSuper || user.permissions.includes('call_length:create') || user.permissions.includes('call_length:update');

  const [editOpen, setEditOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const ssnMbiVal = getCustomerSsnMbi(c?.customer);
  const stateVal = getCustomerState(c?.customer);
  const ageVal = calculateAge(c?.customer?.dateOfBirth, (c?.customer?.extra as any)?.age);
  const detailItems: Array<[string, string]> = c ? [
    ['Phone', c.customer.phone],
    ['Date of birth', c.customer.dateOfBirth ?? '—'],
    ['Age', ageVal],
    ['State', stateVal],
    ['Zip code', c.customer.zipCode || '—'],
    ...(ssnMbiVal && ssnMbiVal !== '—' ? [['SSN | MBI', maskSsnMbi(ssnMbiVal)] as [string, string]] : []),
    ['Agent', c.agent?.fullName || '—'],
    ['Team leader', c.teamLeader?.fullName ?? '—'],
    ['Submitted', fmtDateTime(c.submittedAt)],
    ['Processed', fmtDateTime(c.processedAt)],
    ['Processed by', c.processedBy?.fullName ?? '—'],
    ['Rejection reason', c.rejectionReason ?? '—'],
    ['Call length', c.callLengthDisplay ?? 'Not set'],
  ] : [];

  return (
    <main style={pageStyle}>
      <p style={{ margin: 0 }}><Link to="/cases">Back to cases</Link></p>
      {q.isLoading && <Loading />}
      {q.isError && <p className="err" role="alert">{errorMessage(q.error)}</p>}
      {successMsg && (
        <div style={{ padding: '10px 16px', background: 'rgba(34, 197, 94, 0.15)', color: '#16a34a', borderRadius: 8, fontWeight: 600, margin: '8px 0' }}>
          {successMsg}
        </div>
      )}
      {c && (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ margin: 0 }}>
            {c.customer.firstName} {c.customer.lastName} <StatusBadge status={c.status} />
          </h1>
          {canEditCustomer && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => {
                setSuccessMsg('');
                setEditOpen(true);
              }}
            >
              ✏️ Edit Details
            </button>
          )}
        </div>
        <section className="card" aria-label="Case details" style={{ marginTop: 12 }}>
          <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 24px', margin: 0 }}>
            {detailItems.map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt style={{ color: 'var(--secondary)' }}>{k}</dt>
                <dd style={{ margin: 0 }}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        {canSet && <CallLengthForm caseId={c.id} current={c.callLengthDisplay} />}
        {canEditCustomer && (
          <EditCustomerDialog
            open={editOpen}
            caseItem={c}
            onClose={() => setEditOpen(false)}
            onSaved={() => {
              setEditOpen(false);
              setSuccessMsg('✓ Customer details updated successfully.');
            }}
          />
        )}
      </>)}
    </main>
  );
}

function CallLengthForm({ caseId, current }: { caseId: string; current: string | null }) {
  const [v, setV] = useState(current ?? '');
  const [err, setErr] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [pendingDuration, setPendingDuration] = useState<number | null>(null);
  const qc = useQueryClient();

  useEffect(() => setV(current ?? ''), [current]);

  const m = useMutation({
    mutationFn: (s: number) => caseService.setCallLength(caseId, s),
    onSuccess: (_, s) => {
      // Directly update cache on the spot so no refresh is needed
      qc.setQueryData(['case', caseId], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            callLengthSeconds: s,
            callLengthDisplay: formatCallSeconds(s),
          },
        };
      });
      qc.setQueriesData({ queryKey: ['cases'] }, (old: any) => {
        if (!old?.data || !Array.isArray(old.data)) return old;
        return {
          ...old,
          data: old.data.map((item: any) => {
            if (item.id === caseId || item.customer?.id === caseId) {
              return {
                ...item,
                callLengthSeconds: s,
                callLengthDisplay: formatCallSeconds(s),
              };
            }
            return item;
          }),
        };
      });
      qc.invalidateQueries({ queryKey: ['case', caseId] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      recordAudit('CALL_LENGTH_UPDATED', 'case', caseId, {
        durationSeconds: s,
        formatted: formatCallSeconds(s),
      });
      setConfirmOpen(false);
      setConfirmText('');
      setPendingDuration(null);
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    m.reset();
    const s = parseDuration(v);
    if (s === null) {
      setErr('Enter duration in seconds (e.g. 120), or mm:ss (e.g. 02:00), or hh:mm:ss (e.g. 00:05:42).');
      return;
    }
    setErr('');

    // If call length was already set, require typing 'yes' to edit
    if (current && current.trim() && current !== 'Not set') {
      setPendingDuration(s);
      setConfirmText('');
      setConfirmOpen(true);
      return;
    }

    m.mutate(s);
  }

  function handleConfirmEdit() {
    if (confirmText.trim().toLowerCase() !== 'yes') return;
    if (pendingDuration !== null) {
      m.mutate(pendingDuration);
    }
  }

  return (
    <>
      <form className="card" onSubmit={submit} noValidate style={{ maxWidth: 420 }} aria-label="Set call length">
        <h2 style={{ margin: 0, fontSize: 18 }}>Call length</h2>
        <TextField
          label="Call duration (seconds like 120, or mm:ss, or hh:mm:ss)"
          placeholder="e.g. 120 or 02:00 or 00:05:42"
          autoComplete="off"
          value={v}
          onChange={setV}
          error={err}
        />
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        {m.isSuccess && <p role="status" style={{ color: 'var(--success, #16a34a)', fontWeight: 600 }}>✓ Call length saved.</p>}
        <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={m.isPending}>
          {m.isPending ? 'Saving…' : 'Save call length'}
        </button>
      </form>

      {/* Confirmation Dialog requiring typing 'yes' to edit existing call length */}
      <Dialog
        open={confirmOpen}
        title="Confirm call length change"
        onClose={() => {
          setConfirmOpen(false);
          setPendingDuration(null);
        }}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <p style={{ margin: 0 }}>
            This case already has a recorded call length of <strong>{current}</strong>.
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted, #94a3b8)' }}>
            To confirm this change, type <strong>yes</strong> below:
          </p>
          <input
            className="input"
            autoFocus
            placeholder="Type 'yes' to confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setConfirmOpen(false);
                setPendingDuration(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={confirmText.trim().toLowerCase() !== 'yes' || m.isPending}
              onClick={handleConfirmEdit}
            >
              {m.isPending ? 'Updating…' : 'Confirm & update'}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function EditCustomerDialog({
  open,
  caseItem,
  onClose,
  onSaved,
}: {
  open: boolean;
  caseItem: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const cust = caseItem?.customer;

  // Form states
  const [phone, setPhone] = useState(cust?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(cust?.dateOfBirth || '');
  const [age, setAge] = useState<string>(() => {
    const calculated = calculateAge(cust?.dateOfBirth, (cust?.extra as any)?.age);
    return calculated !== '—' ? calculated : '';
  });
  const [state, setState] = useState(getCustomerState(cust) !== '—' ? getCustomerState(cust) : '');
  const [zipCode, setZipCode] = useState(cust?.zipCode || '');
  const [ssnMbi, setSsnMbi] = useState(getCustomerSsnMbi(cust) !== '—' ? getCustomerSsnMbi(cust) : '');
  const [showSsn, setShowSsn] = useState(false);
  const [agentId, setAgentId] = useState(caseItem?.agent?.id || caseItem?.agentId || '');
  const [teamLeaderId, setTeamLeaderId] = useState(caseItem?.teamLeader?.id || caseItem?.teamLeaderId || '');
  const [callDuration, setCallDuration] = useState(caseItem?.callLengthDisplay || '');
  const [err, setErr] = useState('');

  // Fetch users to populate agents and team leaders
  const usersQ = useQuery({
    queryKey: ['users-for-edit-customer'],
    queryFn: () => adminService.users({ page: 1, pageSize: 100 }),
    enabled: open,
  });

  const allUsers = usersQ.data?.data || [];
  const agents = allUsers.filter((u) => u.roleKey === 'AGENT' || u.roleKey?.includes('AGENT'));
  const teamLeaders = allUsers.filter((u) => u.roleKey === 'TEAM_LEADER' || u.roleKey?.includes('TEAM_LEADER'));

  // Sync state on open
  useEffect(() => {
    if (open && cust) {
      setPhone(cust.phone || '');
      setDateOfBirth(cust.dateOfBirth || '');
      const initialAge = calculateAge(cust.dateOfBirth, (cust.extra as any)?.age);
      setAge(initialAge !== '—' ? initialAge : '');
      const st = getCustomerState(cust);
      setState(st !== '—' ? st : '');
      setZipCode(cust.zipCode || '');
      const sm = getCustomerSsnMbi(cust);
      setSsnMbi(sm !== '—' ? sm : '');
      setShowSsn(false);
      setAgentId(caseItem?.agent?.id || caseItem?.agentId || '');
      setTeamLeaderId(caseItem?.teamLeader?.id || caseItem?.teamLeaderId || '');
      setCallDuration(caseItem?.callLengthDisplay || '');
      setErr('');
    }
  }, [open, cust, caseItem]);

  // Sync DOB -> Age
  function handleDobChange(newDob: string) {
    setDateOfBirth(newDob);
    if (newDob) {
      const calculated = calculateAge(newDob);
      if (calculated !== '—') {
        setAge(calculated);
      }
    }
  }

  // Sync Age -> DOB
  function handleAgeChange(newAge: string) {
    setAge(newAge);
    if (newAge && !isNaN(Number(newAge))) {
      const approxDob = dobFromAge(newAge);
      if (approxDob) {
        setDateOfBirth(approxDob);
      }
    }
  }

  const m = useMutation({
    mutationFn: async () => {
      const cleanPhone = phone.trim();
      const digits = cleanPhone.replace(/\D/g, '');
      if (!cleanPhone || digits.length < 7 || digits.length > 15) {
        throw new Error('Please enter a valid phone number (7 to 15 digits).');
      }
      if (age && (isNaN(Number(age)) || Number(age) < 0 || Number(age) > 130)) {
        throw new Error('Please enter a valid age between 0 and 130.');
      }
      if (!zipCode.trim()) {
        throw new Error('ZIP Code is required.');
      }

      let parsedSeconds: number | null = null;
      if (callDuration.trim()) {
        parsedSeconds = parseDuration(callDuration);
        if (parsedSeconds === null) {
          throw new Error('Invalid call duration. Enter seconds (e.g. 120), or mm:ss (e.g. 02:00).');
        }
      }

      const payload = {
        phone: cleanPhone,
        dateOfBirth: dateOfBirth || null,
        age: age ? Number(age) : null,
        state: state.trim(),
        zipCode: zipCode.trim(),
        ssnMbi: ssnMbi.trim(),
        agentId: agentId || undefined,
        teamLeaderId: teamLeaderId || null,
        durationSeconds: parsedSeconds,
      };

      return caseService.updateDetails(caseItem.id, payload);
    },
    onSuccess: () => {
      recordAudit('CUSTOMER_DETAILS_UPDATED', 'customer', cust?.id || caseItem.id, {
        customerUpdated: true,
        phoneUpdated: !!phone,
      });
      qc.invalidateQueries({ queryKey: ['case', caseItem.id] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      qc.invalidateQueries({ queryKey: ['cases-for-reports'] });
      onSaved();
    },
    onError: (error: any) => {
      setErr(errorMessage(error));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    m.mutate();
  }

  return (
    <Dialog open={open} title="Edit Customer Details" onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted, #94a3b8)' }}>
          Update customer details, assignment, and call information. Only authorized team leaders and administrators can make changes.
        </p>

        {err && <p className="err" role="alert" style={{ margin: 0 }}>{err}</p>}

        {/* Phone */}
        <TextField
          label="Phone number *"
          placeholder="e.g. +1 555-123-4567"
          value={phone}
          onChange={setPhone}
          autoComplete="off"
          required
        />

        {/* Date of Birth & Age Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              Date of Birth
            </label>
            <input
              type="date"
              className="input"
              style={{ width: '100%', height: 38 }}
              value={dateOfBirth}
              onChange={(e) => handleDobChange(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              Age (Years)
            </label>
            <input
              type="number"
              min="0"
              max="130"
              className="input"
              placeholder="e.g. 45"
              style={{ width: '100%', height: 38 }}
              value={age}
              onChange={(e) => handleAgeChange(e.target.value)}
            />
          </div>
        </div>

        {/* State & ZIP Code Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <TextField
            label="State *"
            placeholder="e.g. California or CA"
            value={state}
            onChange={setState}
            required
          />
          <TextField
            label="ZIP Code *"
            placeholder="e.g. 90210"
            value={zipCode}
            onChange={setZipCode}
            required
          />
        </div>

        {/* SSN / MBI with Mask Toggle */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>
              SSN / MBI
            </label>
            {ssnMbi && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '2px 6px', fontSize: 12, color: 'var(--primary)' }}
                onClick={() => setShowSsn(!showSsn)}
              >
                {showSsn ? '🔒 Mask' : '👁 Show'}
              </button>
            )}
          </div>
          <input
            type={showSsn ? 'text' : 'password'}
            className="input"
            style={{ width: '100%', height: 38 }}
            placeholder="e.g. 123-45-6789 or 1EG4-TE5-MK73"
            value={ssnMbi}
            onChange={(e) => setSsnMbi(e.target.value)}
            autoComplete="off"
          />
        </div>

        {/* Assigned Agent & Team Leader */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              Assigned Agent
            </label>
            <select
              className="input"
              style={{ width: '100%', height: 38 }}
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
            >
              <option value="">Choose Agent…</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
              {!agents.some((a) => a.id === agentId) && caseItem?.agent && (
                <option value={caseItem.agent.id}>{caseItem.agent.fullName}</option>
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
              Team Leader
            </label>
            <select
              className="input"
              style={{ width: '100%', height: 38 }}
              value={teamLeaderId}
              onChange={(e) => setTeamLeaderId(e.target.value)}
            >
              <option value="">No Team Leader</option>
              {teamLeaders.map((tl) => (
                <option key={tl.id} value={tl.id}>
                  {tl.fullName}
                </option>
              ))}
              {!teamLeaders.some((tl) => tl.id === teamLeaderId) && caseItem?.teamLeader && (
                <option value={caseItem.teamLeader.id}>{caseItem.teamLeader.fullName}</option>
              )}
            </select>
          </div>
        </div>

        {/* Call Length Duration */}
        <TextField
          label="Call Length (Duration)"
          placeholder="e.g. 120 or 02:00 or 00:05:42"
          value={callDuration}
          onChange={setCallDuration}
          autoComplete="off"
        />

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={m.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={m.isPending}
          >
            {m.isPending ? 'Saving changes…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
