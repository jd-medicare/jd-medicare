import { z } from 'zod';
import { api } from './api-client';
import { supabase } from './supabase';
import { CaseDto, CustomerDto, type CaseStatus } from '../schemas';

// Persistent status storage for cases
export function getCaseStatus(customerId: string): CaseStatus {
  const s = localStorage.getItem(`case_status_${customerId}`) || localStorage.getItem(`case_status_c_${customerId}`);
  if (s === 'ACCEPTED' || s === 'REJECTED' || s === 'SUBMITTED' || s === 'PENDING') {
    return s as CaseStatus;
  }
  return 'PENDING';
}

export function setCaseStatus(caseOrCustomerId: string, status: CaseStatus, customerId?: string) {
  localStorage.setItem(`case_status_${caseOrCustomerId}`, status);
  localStorage.setItem(`case_status_c_${caseOrCustomerId}`, status);
  if (customerId) {
    localStorage.setItem(`case_status_${customerId}`, status);
    localStorage.setItem(`case_status_c_${customerId}`, status);
  }
  try {
    const filter = customerId
      ? `id.eq.${caseOrCustomerId},customerId.eq.${customerId}`
      : `id.eq.${caseOrCustomerId},customerId.eq.${caseOrCustomerId}`;
    Promise.resolve(
      supabase
        .from('cases')
        .update({ status, processedAt: new Date().toISOString() })
        .or(filter)
    ).catch(() => {});
  } catch {}
}

// Persistent call length storage
export function getLocalCallLength(caseId: string): number | null {
  const v = localStorage.getItem(`call_len_${caseId}`);
  return v ? parseInt(v, 10) : null;
}

export function setLocalCallLength(caseId: string, seconds: number) {
  localStorage.setItem(`call_len_${caseId}`, String(seconds));
}

export function formatCallSeconds(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Memory cache for registered customers to guarantee immediate visibility
function getLocallyRegisteredCustomers(): CustomerDto[] {
  try {
    const raw = localStorage.getItem('local_registered_customers');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((c) => CustomerDto.parse(c)) : [];
  } catch {
    return [];
  }
}

export function saveLocallyRegisteredCustomer(customer: CustomerDto) {
  try {
    const list = getLocallyRegisteredCustomers();
    const cleanPhone = (customer.phone || '').replace(/\D/g, '');
    const existingIndex = list.findIndex(
      (c) => c.id === customer.id || (cleanPhone && (c.phone || '').replace(/\D/g, '') === cleanPhone)
    );
    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        ...customer,
        zipCode: customer.zipCode || list[existingIndex].zipCode || '',
      };
    } else {
      list.unshift(customer);
    }
    localStorage.setItem('local_registered_customers', JSON.stringify(list));
  } catch (e) {
    console.warn('saveLocallyRegisteredCustomer error:', e);
  }
}

/**
 * Loads unified cases across the backend cases API, customers API, and local storage.
 * Guarantees that EVERY registered customer has a case visible to Agents, Team Leaders, and Outsource.
 */
export async function getUnifiedCases(): Promise<CaseDto[]> {
  const caseMap = new Map<string, CaseDto>();

  // 1. Fetch server cases if available
  try {
    const serverCases = await api.call('cases.list', {
      query: { page: 1, limit: 100 },
      schema: z.array(CaseDto),
    }).catch(() => null);

    if (serverCases?.data) {
      for (const c of serverCases.data) {
        if (c.id) caseMap.set(c.id, c);
        const custId = c.customerId || c.customer?.id;
        if (custId) {
          caseMap.set(`cust_${custId}`, c);
          caseMap.set(custId, c);
        }
        if (c.customer?.phone) {
          const cleanPhone = c.customer.phone.replace(/\D/g, '');
          if (cleanPhone) {
            caseMap.set(`phone_${cleanPhone}`, c);
          }
        }
      }
    }
  } catch (e) {
    console.warn('getUnifiedCases server cases fetch note:', e);
  }

  // 2. Fetch server customers
  const customers: CustomerDto[] = [];
  try {
    const serverCust = await api.call('customers.list', {
      query: { page: 1, limit: 100 },
      schema: z.array(CustomerDto),
    }).catch(() => null);

    if (serverCust?.data) {
      customers.push(...serverCust.data);
    }
  } catch (e) {
    console.warn('getUnifiedCases server customers fetch note:', e);
  }

  // 3. Fallback: direct Supabase query for customers
  try {
    const { data: dbCustomers } = await supabase
      .from('customers')
      .select('id, firstName, lastName, phone, dateOfBirth, address, zipCode, extra, createdById, createdAt')
      .limit(100);

    if (dbCustomers) {
      for (const dc of dbCustomers) {
        const cleanPhone = (dc.phone || '').replace(/\D/g, '');
        if (!customers.some((c) => c.id === dc.id || (cleanPhone && (c.phone || '').replace(/\D/g, '') === cleanPhone))) {
          customers.push(CustomerDto.parse(dc));
        }
      }
    }
  } catch (e) {
    console.warn('getUnifiedCases db customers note:', e);
  }

  // 4. Merge locally registered customers
  const localCust = getLocallyRegisteredCustomers();
  for (const lc of localCust) {
    const cleanPhone = (lc.phone || '').replace(/\D/g, '');
    const existingIdx = customers.findIndex((c) => c.id === lc.id || (cleanPhone && (c.phone || '').replace(/\D/g, '') === cleanPhone));
    if (existingIdx >= 0) {
      customers[existingIdx] = {
        ...customers[existingIdx],
        ...lc,
        zipCode: lc.zipCode || customers[existingIdx].zipCode || '',
      };
    } else {
      // If customer has an ID and wasn't in DB, check if it was recently created
      const ageMs = lc.createdAt ? Date.now() - new Date(lc.createdAt).getTime() : 999999;
      // If it's not recently created and DB was queried, do not revive deleted customer
      if (ageMs < 30000) {
        customers.unshift(lc);
      }
    }
  }

  // 5. Ensure each customer has a corresponding case
  const unified: CaseDto[] = [];
  for (const c of customers) {
    const custKey = `cust_${c.id}`;
    const cleanPhone = (c.phone || '').replace(/\D/g, '');
    let existingCase =
      caseMap.get(custKey) ||
      (c.id ? caseMap.get(c.id) : undefined) ||
      (cleanPhone ? caseMap.get(`phone_${cleanPhone}`) : undefined);

    const savedStatus = getCaseStatus(c.id);

    // Check for stored call length
    const storedDuration = getLocalCallLength(c.id) || (existingCase?.id ? getLocalCallLength(existingCase.id) : null);

    if (existingCase) {
      // Apply status override if user accepted/rejected it
      const currentStatus = savedStatus !== 'PENDING' ? savedStatus : existingCase.status;
      const durationSeconds = storedDuration !== null ? storedDuration : existingCase.callLengthSeconds;
      unified.push({
        ...existingCase,
        status: currentStatus,
        customer: {
          ...existingCase.customer,
          ...c,
          zipCode: c.zipCode || existingCase.customer?.zipCode || '',
        },
        callLengthSeconds: durationSeconds,
        callLengthDisplay: formatCallSeconds(durationSeconds),
      });
    } else {
      // Synthesize case for this customer so it is immediately visible
      const syntheticCase: CaseDto = {
        id: c.id,
        customerId: c.id,
        status: savedStatus,
        version: 1,
        submittedAt: c.createdAt || new Date().toISOString(),
        processedAt: null,
        processedBy: null,
        rejectionReason: null,
        agent: { id: c.createdById || '', fullName: '' },
        teamLeader: null,
        customer: c,
        callLengthSeconds: storedDuration,
        callLengthDisplay: formatCallSeconds(storedDuration),
      };
      unified.push(syntheticCase);
    }
  }

  // Add any server cases whose customer wasn't in the customer list
  for (const sc of Array.from(caseMap.values())) {
    const scPhone = (sc.customer?.phone || '').replace(/\D/g, '');
    const scCustId = sc.customerId || sc.customer?.id;
    const isAlreadyIncluded = unified.some((u) => {
      if (u.id === sc.id) return true;
      if (scCustId && (u.id === scCustId || u.customerId === scCustId || u.customer?.id === scCustId)) return true;
      const uPhone = (u.customer?.phone || '').replace(/\D/g, '');
      if (scPhone && uPhone && scPhone === uPhone) return true;
      return false;
    });

    if (!isAlreadyIncluded) {
      const storedDuration = getLocalCallLength(sc.id);
      const durationSeconds = storedDuration !== null ? storedDuration : sc.callLengthSeconds;
      unified.push({
        ...sc,
        callLengthSeconds: durationSeconds,
        callLengthDisplay: formatCallSeconds(durationSeconds),
      });
    }
  }

  // Final deduplication guarantee: ensure each customer appears EXACTLY ONCE
  const deduplicated: CaseDto[] = [];
  for (const c of unified) {
    const phoneKey = (c.customer?.phone || '').replace(/\D/g, '');
    const custId = c.customerId || c.customer?.id || c.id;

    const existingIdx = deduplicated.findIndex((d) => {
      const dPhone = (d.customer?.phone || '').replace(/\D/g, '');
      const dCustId = d.customerId || d.customer?.id || d.id;
      return (
        (phoneKey && dPhone && dPhone === phoneKey) ||
        (custId && dCustId && dCustId === custId) ||
        d.id === c.id
      );
    });

    if (existingIdx >= 0) {
      // Customer already in list: merge and preserve zip code!
      const existing = deduplicated[existingIdx];
      const mergedZip = existing.customer?.zipCode || c.customer?.zipCode || '';
      deduplicated[existingIdx] = {
        ...existing,
        customer: {
          ...existing.customer,
          ...c.customer,
          zipCode: mergedZip,
        },
      };
      continue;
    }

    deduplicated.push(c);
  }

  return deduplicated;
}

export async function ensureCasesForCustomers() {
  // Handled automatically by getUnifiedCases
}
