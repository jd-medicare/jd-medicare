import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { caseService, type CustomerForm } from '../../services/cases';
import { errorMessage } from '../../services/api-client';
import { TextField, pageStyle } from '../../design-system';
import { today } from '../../lib/format';

const EMPTY: CustomerForm = { firstName: '', lastName: '', phone: '', dateOfBirth: '', address: '', zipCode: '' };
const LABELS: Record<keyof CustomerForm, string> = { firstName: 'First name', lastName: 'Last name', phone: 'Phone', dateOfBirth: 'Date of birth', address: 'Address', zipCode: 'Zip code' };
type Errors = Partial<Record<keyof CustomerForm, string>>;
function validate(f: CustomerForm): Errors {
  const e: Errors = {};
  (Object.keys(f) as Array<keyof CustomerForm>).forEach((k) => { if (!f[k].trim()) e[k] = `${LABELS[k]} is required.`; });
  if (f.phone.trim() && !/^\+?[0-9 ()-]{7,20}$/.test(f.phone.trim())) e.phone = 'Enter a valid phone number, for example +923001234567.';
  if (f.dateOfBirth > today()) e.dateOfBirth = 'Date of birth cannot be in the future.';
  return e;
}

export default function NewCustomerPage() {
  const [f, setF] = useState(EMPTY); const [errors, setErrors] = useState<Errors>({});
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (b: CustomerForm) => caseService.createCustomer(b),
    onSuccess: () => { setF(EMPTY); qc.invalidateQueries({ queryKey: ['cases'] }); },
  });
  const set = (k: keyof CustomerForm) => (v: string) => { setF({ ...f, [k]: v }); if (m.isSuccess) m.reset(); };
  function submit(e: FormEvent) {
    e.preventDefault();
    const errs = validate(f); setErrors(errs);
    if (Object.keys(errs).length === 0) m.mutate(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()])) as unknown as CustomerForm);
  }
  const created = m.data?.data;
  return (
    <main style={pageStyle}>
      <h1 style={{ margin: 0 }}>New customer</h1>
      <form className="card" onSubmit={submit} noValidate style={{ maxWidth: 520 }}>
        <TextField label="First name" autoComplete="off" required value={f.firstName} onChange={set('firstName')} error={errors.firstName} />
        <TextField label="Last name" autoComplete="off" required value={f.lastName} onChange={set('lastName')} error={errors.lastName} />
        <TextField label="Phone" type="tel" autoComplete="off" required value={f.phone} onChange={set('phone')} error={errors.phone} />
        <TextField label="Date of birth" type="date" max={today()} required value={f.dateOfBirth} onChange={set('dateOfBirth')} error={errors.dateOfBirth} />
        <TextField label="Address" autoComplete="off" required value={f.address} onChange={set('address')} error={errors.address} />
        <TextField label="Zip code" autoComplete="off" required value={f.zipCode} onChange={set('zipCode')} error={errors.zipCode} />
        {m.isError && <p className="err" role="alert">{errorMessage(m.error)}</p>}
        {created && <p role="status">Saved {created.customer.firstName} {created.customer.lastName}. A case was created. <Link to={`/cases/${created.case.id}`}>View case</Link></p>}
        <button className="btn btn-primary" style={{ marginTop: 16 }} disabled={m.isPending}>{m.isPending ? 'Saving…' : 'Save customer and create case'}</button>
      </form>
    </main>
  );
}
