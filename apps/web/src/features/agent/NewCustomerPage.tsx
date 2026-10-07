import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { caseService, type CustomerForm, type CustomerWithCaseStatus } from '../../services/cases';
import { errorMessage } from '../../services/api-client';
import { recordAudit } from '../../services/audit';
import { notifyLiveSync } from '../../services/liveSync';
import { Dialog, StatusBadge, pageStyle } from '../../design-system';
import { today, fmtDateTime } from '../../lib/format';
import type { SessionUserDto } from '../../schemas';

const EMPTY: CustomerForm & { email?: string } = {
  firstName: '',
  lastName: '',
  phone: '',
  dateOfBirth: '',
  address: '',
  zipCode: '',
  email: '',
};

type FormState = typeof EMPTY;
type Errors = Partial<Record<keyof FormState, string>>;

export default function NewCustomerPage({ user }: { user?: SessionUserDto }) {
  const [f, setF] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [matchingCustomers, setMatchingCustomers] = useState<CustomerWithCaseStatus[]>([]);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [detailsCustomer, setDetailsCustomer] = useState<CustomerWithCaseStatus | null>(null);

  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (b: CustomerForm) => caseService.createCustomer(b),
    retry: false,
    onSuccess: (res, variables) => {
      // Record in audit log
      if (res?.data?.customer?.id) {
        recordAudit('CUSTOMER_CREATED', 'customer', res.data.customer.id, {
          name: `${variables.firstName} ${variables.lastName}`,
          phone: variables.phone,
        });
      }
      setF(EMPTY);
      setMatchingCustomers([]);
      qc.invalidateQueries({ queryKey: ['cases'] });
      qc.invalidateQueries({ queryKey: ['outsource'] });
      qc.invalidateQueries({ queryKey: ['outsource-summary'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
      qc.invalidateQueries({ queryKey: ['ceo'] });
      qc.invalidateQueries({ queryKey: ['report'] });
      notifyLiveSync('case-created');
    },
  });

  const set = (k: keyof FormState) => (v: string) => {
    setF({ ...f, [k]: v });
    if (m.isSuccess) m.reset();
  };

  // Real-time lookup: When agent types 7+ digits of phone number, check for existing records and status
  useEffect(() => {
    const digits = f.phone.replace(/\D/g, '');
    if (digits.length < 7) {
      setMatchingCustomers([]);
      setIsSearchingPhone(false);
      return;
    }

    let active = true;
    setIsSearchingPhone(true);
    const timer = setTimeout(async () => {
      try {
        const found = await caseService.findCustomerByPhone(f.phone);
        if (active) {
          setMatchingCustomers(found);
          setIsSearchingPhone(false);
        }
      } catch {
        if (active) setIsSearchingPhone(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [f.phone]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (m.isPending) return;
    const eMap: Errors = {};
    if (!f.firstName.trim()) eMap.firstName = 'First name is required.';
    if (!f.lastName.trim()) eMap.lastName = 'Last name is required.';
    if (!f.phone.trim()) eMap.phone = 'Phone is required.';
    else if (!/^\+?[0-9 ()-]{7,20}$/.test(f.phone.trim())) {
      eMap.phone = 'Enter a valid phone number, for example +1 555 123 4567.';
    }
    if (!f.dateOfBirth) eMap.dateOfBirth = 'Date of birth is required.';
    else if (f.dateOfBirth > today()) eMap.dateOfBirth = 'Date of birth cannot be in the future.';
    if (!f.address.trim()) eMap.address = 'Address is required.';
    if (!f.zipCode.trim()) eMap.zipCode = 'Zip code is required.';

    setErrors(eMap);
    if (Object.keys(eMap).length === 0) {
      m.mutate({
        firstName: f.firstName.trim(),
        lastName: f.lastName.trim(),
        phone: f.phone.trim(),
        dateOfBirth: f.dateOfBirth,
        address: f.address.trim(),
        zipCode: f.zipCode.trim(),
      });
    }
  }

  const created = m.data?.data;
  const userName = user?.fullName || 'Muhammad';

  return (
    <main style={{ ...pageStyle, padding: '24px 20px', maxWidth: 1140, margin: '0 auto' }}>
      {/* Outer Card with Split Layout matching uploaded design */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) 1fr',
          borderRadius: 22,
          overflow: 'hidden',
          boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.15)',
          border: '1px solid var(--border)',
          background: 'var(--bg, #ffffff)',
          minHeight: 620,
        }}
      >
        {/* Left Side: Deep Plum / Purple Brand Card */}
        <aside
          style={{
            background: 'linear-gradient(165deg, #2b082c 0%, #461440 45%, #631d57 100%)',
            color: '#ffffff',
            padding: '36px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Decorative Overlay Circles */}
          <div
            style={{
              position: 'absolute',
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, transparent 70%)',
              top: '40%',
              left: '-10%',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
              bottom: '-40px',
              left: '-40px',
              pointerEvents: 'none',
            }}
          />

          {/* Top Brand Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
            <img
              src="/logo.png"
              alt="Himayat Associates"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                objectFit: 'contain',
                background: '#ffffff',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
              }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                Himayat Associates
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.72)', marginTop: 2 }}>
                Manage • Support • Grow
              </div>
            </div>
          </div>

          {/* Center Welcome Greetings */}
          <div style={{ position: 'relative', zIndex: 1, margin: '40px 0' }}>
            <div style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.9)' }}>
              👋 Welcome back,
            </div>
            <h2 style={{ fontSize: 28, margin: '6px 0 10px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              {userName}
            </h2>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(4px)',
                fontSize: 12,
                fontWeight: 600,
                color: '#ffffff',
              }}
            >
              Agent
            </span>
            <p style={{ marginTop: 22, fontSize: 14, color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.55 }}>
              Great service creates happy customers.
            </p>
          </div>

          {/* Bottom Stylized Illustration */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
              }}
            >
              👥
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' }}>
              Trusted Casework Portal
            </div>
          </div>
        </aside>

        {/* Right Side: Customer Registration Form */}
        <section style={{ padding: '36px 40px', background: 'var(--card-bg, #ffffff)' }}>
          {/* Top Form Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                👤⁺
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
                  New Customer
                </h1>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted, #94a3b8)' }}>
                  Add a new customer to the system
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 20,
                background: 'rgba(99, 29, 87, 0.08)',
                color: 'var(--primary, #631d57)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span>👤</span>
              <span>Agent Portal</span>
            </div>
          </div>

          <form onSubmit={submit} noValidate>
            {/* Form Fields: 2 Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
              {/* Row 1: First name & Last name */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span>👤</span> First name *
                </label>
                <input
                  className="input"
                  style={{ width: '100%', height: 42, borderRadius: 8 }}
                  placeholder="Enter first name"
                  autoComplete="off"
                  value={f.firstName}
                  onChange={(e) => set('firstName')(e.target.value)}
                />
                {errors.firstName && <span className="err" role="alert">{errors.firstName}</span>}
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span>👤</span> Last name *
                </label>
                <input
                  className="input"
                  style={{ width: '100%', height: 42, borderRadius: 8 }}
                  placeholder="Enter last name"
                  autoComplete="off"
                  value={f.lastName}
                  onChange={(e) => set('lastName')(e.target.value)}
                />
                {errors.lastName && <span className="err" role="alert">{errors.lastName}</span>}
              </div>

              {/* Row 2: Phone with Flag prefix & Date of Birth */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span>📞</span> Phone *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <input
                    className="input"
                    type="tel"
                    style={{ width: '100%', height: 42, borderRadius: 8, paddingRight: 80 }}
                    placeholder="+1 (555) 000-0000"
                    autoComplete="off"
                    value={f.phone}
                    onChange={(e) => set('phone')(e.target.value)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--muted, #64748b)',
                      pointerEvents: 'none',
                    }}
                  >
                    <span>🇺🇸</span>
                    <span>+1</span>
                  </div>
                </div>
                {isSearchingPhone && (
                  <span style={{ fontSize: 11, color: 'var(--muted, #94a3b8)', marginTop: 2, display: 'block' }}>
                    Searching database…
                  </span>
                )}
                {errors.phone && <span className="err" role="alert">{errors.phone}</span>}
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span>📅</span> Date of birth *
                </label>
                <input
                  className="input"
                  type="date"
                  max={today()}
                  style={{ width: '100%', height: 42, borderRadius: 8 }}
                  value={f.dateOfBirth}
                  onChange={(e) => set('dateOfBirth')(e.target.value)}
                />
                {errors.dateOfBirth && <span className="err" role="alert">{errors.dateOfBirth}</span>}
              </div>

              {/* Row 3: Address (Full width) */}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span>📍</span> Address *
                </label>
                <input
                  className="input"
                  style={{ width: '100%', height: 42, borderRadius: 8 }}
                  placeholder="Enter complete address"
                  autoComplete="off"
                  value={f.address}
                  onChange={(e) => set('address')(e.target.value)}
                />
                {errors.address && <span className="err" role="alert">{errors.address}</span>}
              </div>

              {/* Row 4: Zip code & Email (optional) */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span>💳</span> Zip code *
                </label>
                <input
                  className="input"
                  style={{ width: '100%', height: 42, borderRadius: 8 }}
                  placeholder="Enter zip code"
                  autoComplete="off"
                  value={f.zipCode}
                  onChange={(e) => set('zipCode')(e.target.value)}
                />
                {errors.zipCode && <span className="err" role="alert">{errors.zipCode}</span>}
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span>✉️</span> Email (optional)
                </label>
                <input
                  className="input"
                  type="email"
                  style={{ width: '100%', height: 42, borderRadius: 8 }}
                  placeholder="Enter email address"
                  autoComplete="off"
                  value={f.email ?? ''}
                  onChange={(e) => set('email')(e.target.value)}
                />
              </div>
            </div>

            {/* Existing Record Found Alert with Live Case Status */}
            {matchingCustomers.length > 0 && (
              <div
                role="status"
                style={{
                  marginTop: 18,
                  marginBottom: 12,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16 }}>📋</span>
                    <span>
                      <strong>Record found!</strong>{' '}
                      {matchingCustomers.length === 1 ? (
                        <span>
                          {matchingCustomers[0].firstName} {matchingCustomers[0].lastName} ({matchingCustomers[0].phone})
                        </span>
                      ) : (
                        <span>{matchingCustomers.length} matching customers found.</span>
                      )}
                    </span>
                    {matchingCustomers.length === 1 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                        <StatusBadge status={matchingCustomers[0].caseStatus || 'PENDING'} />
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn"
                    style={{ height: 28, fontSize: 12, padding: '0 10px', display: 'inline-flex', alignItems: 'center' }}
                    onClick={() => setDetailsCustomer(matchingCustomers[0])}
                  >
                    View details
                  </button>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--muted, #94a3b8)' }}>
                  Note: You are not restricted and can continue submitting if this is a different customer.
                </p>
              </div>
            )}

            {m.isError && <p className="err" role="alert" style={{ marginTop: 14 }}>{errorMessage(m.error)}</p>}

            {created && (
              <p role="status" style={{ color: 'var(--color-success, #16a34a)', marginTop: 14, fontWeight: 600 }}>
                ✓ Saved {created.customer.firstName} {created.customer.lastName}.{' '}
                {created.case ? (
                  <>
                    A case was created. <Link to={`/cases/${created.case.id}`}>View case</Link>
                  </>
                ) : (
                  'Customer added successfully.'
                )}
              </p>
            )}

            {/* Bottom Actions: Reset & Save Customer matching design */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, gap: 12 }}>
              <button
                type="button"
                className="btn"
                style={{
                  height: 44,
                  padding: '0 20px',
                  borderRadius: 10,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 600,
                }}
                onClick={() => {
                  setF(EMPTY);
                  setErrors({});
                  setMatchingCustomers([]);
                }}
              >
                <span>🔄</span> Reset
              </button>

              <button
                type="submit"
                className="btn"
                disabled={m.isPending}
                style={{
                  height: 44,
                  padding: '0 28px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #461440 0%, #631d57 100%)',
                  color: '#ffffff',
                  border: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(99, 29, 87, 0.35)',
                  cursor: m.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                <span>💾</span> {m.isPending ? 'Saving…' : 'Save Customer ➔'}
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Customer Details Dialog with Case Status (Approved / Rejected / Pending) */}
      <Dialog
        open={!!detailsCustomer}
        title="Existing Customer Details"
        onClose={() => setDetailsCustomer(null)}
      >
        {detailsCustomer && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, fontSize: 14, alignItems: 'center' }}>
              <span style={{ color: 'var(--muted, #94a3b8)' }}>Name:</span>
              <strong>{detailsCustomer.firstName} {detailsCustomer.lastName}</strong>

              <span style={{ color: 'var(--muted, #94a3b8)' }}>Phone:</span>
              <strong>{detailsCustomer.phone}</strong>

              <span style={{ color: 'var(--muted, #94a3b8)' }}>Case status:</span>
              <div>
                <StatusBadge status={detailsCustomer.caseStatus || 'PENDING'} />
              </div>

              <span style={{ color: 'var(--muted, #94a3b8)' }}>Date of birth:</span>
              <span>{detailsCustomer.dateOfBirth || '—'}</span>

              <span style={{ color: 'var(--muted, #94a3b8)' }}>Address:</span>
              <span>{detailsCustomer.address || '—'}</span>

              <span style={{ color: 'var(--muted, #94a3b8)' }}>Zip code:</span>
              <span>{detailsCustomer.zipCode || '—'}</span>

              <span style={{ color: 'var(--muted, #94a3b8)' }}>Registered:</span>
              <span>{detailsCustomer.createdAt ? fmtDateTime(detailsCustomer.createdAt) : '—'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button type="button" className="btn" onClick={() => setDetailsCustomer(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </main>
  );
}
