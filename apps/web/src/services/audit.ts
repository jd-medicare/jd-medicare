import { supabase } from './supabase';
import type { ListQuery } from './types';
import type { AuditLogDto } from '../schemas/domain';

export interface AuditRecord {
  id: string;
  organizationId: string;
  actorId: string;
  actor?: { id: string; fullName: string; email: string };
  event: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  isProtected?: boolean;
}

const STORAGE_KEY = 'local_audit_logs';

function getDefaultAuditLogs(): AuditRecord[] {
  const now = new Date();
  const d1 = new Date(now.getTime() - 15 * 60000).toISOString();
  const d2 = new Date(now.getTime() - 45 * 60000).toISOString();
  const d3 = new Date(now.getTime() - 90 * 60000).toISOString();
  const d4 = new Date(now.getTime() - 180 * 60000).toISOString();
  return [
    {
      id: 'audit-init-1',
      organizationId: '00000000-0000-0000-0000-000000000000',
      actorId: 'usr-agent-1',
      actor: { id: 'usr-agent-1', fullName: 'Intake Agent', email: 'agent@jdmedicare.com' },
      event: 'CUSTOMER_CREATED',
      entityType: 'customer',
      entityId: 'cust-khan-1',
      metadata: { name: 'Khan Khan', phone: '+1 555 123 4567', zipCode: '1122' },
      createdAt: d1,
    },
    {
      id: 'audit-init-2',
      organizationId: '00000000-0000-0000-0000-000000000000',
      actorId: 'usr-tl-1',
      actor: { id: 'usr-tl-1', fullName: 'Team Leader', email: 'teamleader@jdmedicare.com' },
      event: 'CALL_LENGTH_UPDATED',
      entityType: 'case',
      entityId: 'case-3268',
      metadata: { durationSeconds: 120, formatted: '02:00', customer: 'Khan Khan' },
      createdAt: d2,
    },
    {
      id: 'audit-init-3',
      organizationId: '00000000-0000-0000-0000-000000000000',
      actorId: 'usr-ceo-1',
      actor: { id: 'usr-ceo-1', fullName: 'Chief Executive Officer', email: 'ceo@jdmedicare.com' },
      event: 'EXPENSE_CREATED',
      entityType: 'expense',
      entityId: 'exp-1999',
      metadata: { amount: '1999', head: 'Data', status: 'ACTIVE' },
      createdAt: d3,
    },
    {
      id: 'audit-init-4',
      organizationId: '00000000-0000-0000-0000-000000000000',
      actorId: 'usr-ceo-1',
      actor: { id: 'usr-ceo-1', fullName: 'Chief Executive Officer', email: 'ceo@jdmedicare.com' },
      event: 'INCOME_CREATED',
      entityType: 'income',
      entityId: 'inc-10000',
      metadata: { amount: '10000', category: 'Case Intake Fee', status: 'ACTIVE' },
      createdAt: d4,
    },
  ];
}

export function getLocalAuditLogs(): AuditRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = getDefaultAuditLogs();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    const defaults = getDefaultAuditLogs();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  } catch {
    return getDefaultAuditLogs();
  }
}

export function saveLocalAuditLog(record: AuditRecord) {
  try {
    const list = getLocalAuditLogs();
    list.unshift(record);
    // Keep last 500 audit logs
    if (list.length > 500) list.length = 500;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('saveLocalAuditLog error:', e);
  }
}

/**
 * Record an audit log entry for any user action.
 * Super Admin activity is masked as "Operations Staff" to hide super admin details.
 */
export async function recordAudit(
  event: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>
) {
  try {
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;
    if (!user) return;

    // Check if actor is Super Admin
    const roleKey = (user.app_metadata?.role_key || user.user_metadata?.role_key || '').toUpperCase();
    const email = (user.email || '').toLowerCase();
    const isPSA = user.app_metadata?.is_primary_super_admin || roleKey.includes('SUPER_ADMIN') || email.includes('superadmin');

    const orgId = (user.app_metadata?.organization_id || user.user_metadata?.organization_id || '00000000-0000-0000-0000-000000000000') as string;
    // Mask super admin identity so actions are recorded cleanly without revealing Super Admin
    const actorName = isPSA ? 'Operations Staff' : ((user.user_metadata?.full_name || user.email || 'User') as string);
    const actorEmail = isPSA ? 'staff@himayat.com' : (user.email || '');

    const record: AuditRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      organizationId: orgId,
      actorId: user.id,
      actor: {
        id: user.id,
        fullName: actorName,
        email: actorEmail,
      },
      event,
      entityType,
      entityId,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      isProtected: false,
    };

    // 1. Always save locally so it is immediately visible to CEO
    saveLocalAuditLog(record);

    // 2. Also try inserting into Supabase audit_logs
    try {
      await supabase.from('audit_logs').insert({
        organizationId: orgId,
        actorId: user.id,
        event,
        entityType,
        entityId,
        metadata: metadata || {},
        createdAt: record.createdAt,
        isProtected: false,
      });
    } catch {}
  } catch (e) {
    console.warn('recordAudit error:', e);
  }
}

export async function fetchAuditLogs(q: ListQuery = {}): Promise<{ data: any[]; meta: any }> {
  const merged: AuditRecord[] = [...getLocalAuditLogs()];

  // Try fetching from Supabase
  try {
    const { data: dbLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100);

    if (dbLogs) {
      for (const dl of dbLogs) {
        if (!merged.some((m) => m.id === dl.id)) {
          merged.push({
            id: dl.id,
            organizationId: dl.organizationId,
            actorId: dl.actorId,
            actor: {
              id: dl.actorId,
              fullName: dl.metadata?.actorName || 'User',
              email: dl.metadata?.actorEmail || '',
            },
            event: dl.event,
            entityType: dl.entityType,
            entityId: dl.entityId,
            metadata: dl.metadata,
            createdAt: dl.createdAt,
            isProtected: dl.isProtected,
          });
        }
      }
    }
  } catch (e) {
    console.warn('fetchAuditLogs db note:', e);
  }

  // Mask any super admin name/identity as "Operations Staff" ("no single thing is recorded of super admin, super admin is hidden")
  let filtered = merged.map((a) => {
    const actorName = (a.actor?.fullName || '').toLowerCase();
    const isSuperActor = actorName.includes('super admin') || actorName.includes('primary') || actorName === 'psa';
    if (isSuperActor) {
      return {
        ...a,
        actor: {
          id: a.actor?.id || a.actorId,
          fullName: 'Operations Staff',
          email: 'staff@himayat.com',
        },
      };
    }
    return a;
  });

  if (q.event) {
    filtered = filtered.filter((l) => l.event === q.event);
  }
  if (q.entityType) {
    const et = String(q.entityType).toLowerCase();
    filtered = filtered.filter((l) => l.entityType.toLowerCase().includes(et));
  }
  if (q.dateFrom) {
    filtered = filtered.filter((l) => l.createdAt.substring(0, 10) >= q.dateFrom!);
  }
  if (q.dateTo) {
    filtered = filtered.filter((l) => l.createdAt.substring(0, 10) <= q.dateTo!);
  }

  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const page = Math.max(1, Number(q.page) || 1);
  const pageSize = Math.max(1, Number(q.pageSize) || 25);
  const offset = (page - 1) * pageSize;
  const paginated = filtered.slice(offset, offset + pageSize);

  return {
    data: paginated,
    meta: {
      page,
      limit: pageSize,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / pageSize) || 1,
    },
  };
}
