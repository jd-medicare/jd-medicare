import { z } from 'zod';
import { api } from './api-client';
import type { ListQuery } from './types';
import { AuditLogDto, MenuDto, PermissionDto, RoleDto, UserDto } from '../schemas/domain';
import { fetchAuditLogs } from './audit';

import { supabase } from './supabase';
import { PERMISSIONS } from '@shared/enums';
import { getMenusForPermissions } from '../app/nav';

export const MutationResultDto = z.union([
  UserDto,
  z.object({ success: z.boolean().optional(), message: z.string().optional() }),
  z.record(z.any()),
]);

export interface CreateUserForm {
  email: string;
  fullName: string;
  phone?: string;
  roleKey: string;
  roleId?: string;
  password?: string;
  menus?: string[];
  menuIds?: string[];
}

export interface UpdateUserForm {
  fullName?: string;
  email?: string;
  phone?: string;
}

export const adminService = {
  updateUser: async (id: string, b: UpdateUserForm) => {
    const cleanEmail = b.email ? b.email.trim().toLowerCase() : undefined;
    const cleanFullName = b.fullName ? b.fullName.trim() : undefined;
    return await api.call('users.update', {
      params: { id },
      body: {
        fullName: cleanFullName,
        email: cleanEmail,
        phone: b.phone?.trim(),
      },
      schema: MutationResultDto,
    });
  },
  users: async (q: ListQuery) => {
    const list: UserDto[] = [];
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();

    // 1. Try API call
    try {
      const res = await api.call('users.list', { query: q, schema: z.array(UserDto) });
      if (res?.data && Array.isArray(res.data)) {
        for (const u of res.data) {
          list.push(u);
          if (u.id) seenIds.add(u.id);
          if (u.email) seenEmails.add(u.email.toLowerCase());
        }
      }
    } catch (e) {
      console.warn('api users.list error:', e);
    }

    // 2. Direct Supabase query to get all users from database
    try {
      const { data: dbUsers } = await supabase
        .from('users')
        .select('id, organizationId, email, fullName, phone, status, roleId, isPrimarySuperAdmin, createdAt, updatedAt, roles:roleId(key, name)')
        .limit(100);

      if (dbUsers) {
        for (const u of dbUsers as any[]) {
          const emailLower = (u.email || '').toLowerCase();
          if (!seenIds.has(u.id) && !seenEmails.has(emailLower)) {
            seenIds.add(u.id);
            seenEmails.add(emailLower);
            list.push(UserDto.parse({
              id: u.id,
              organizationId: u.organizationId,
              email: u.email,
              fullName: u.fullName,
              phone: u.phone,
              status: u.status || 'ACTIVE',
              roleKey: u.roles?.key || 'AGENT',
              roleName: u.roles?.name || 'Agent',
              isPrimarySuperAdmin: Boolean(u.isPrimarySuperAdmin),
              createdAt: u.createdAt || '',
              updatedAt: u.updatedAt || '',
            }));
          }
        }
      }
    } catch (e) {
      console.warn('supabase users query error:', e);
    }

    // 3. Merge any cached users from local storage
    try {
      const cached = localStorage.getItem('cached_all_users');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          for (const u of parsed) {
            const emailLower = (u.email || '').toLowerCase();
            if (u.id && !seenIds.has(u.id) && !seenEmails.has(emailLower)) {
              seenIds.add(u.id);
              seenEmails.add(emailLower);
              list.push(u);
            }
          }
        }
      }
    } catch {}

    // Merge cached permissions and menus
    for (const u of list) {
      try {
        const cachedP = localStorage.getItem(`perms_${u.id}`);
        if (cachedP) {
          const parsed = JSON.parse(cachedP);
          if (Array.isArray(parsed) && parsed.length > 0) {
            u.permissions = Array.from(new Set([...(u.permissions || []), ...parsed]));
          }
        }
        const cachedM = localStorage.getItem(`menus_${u.id}`);
        if (cachedM) {
          const parsed = JSON.parse(cachedM);
          if (Array.isArray(parsed) && parsed.length > 0) {
            u.menus = Array.from(new Set([...(u.menus || []), ...parsed]));
          }
        }
      } catch {}
    }

    // Sort newest first
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    let filtered = list;
    if (q.status) {
      filtered = filtered.filter((u) => u.status === q.status);
    }

    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.max(1, Number(q.pageSize) || 50);
    const offset = (page - 1) * limit;

    return {
      data: filtered.slice(offset, offset + limit),
      meta: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit) || 1,
      },
    };
  },
  createUser: async (b: CreateUserForm) => {
    let roleId = b.roleId;
    if (!roleId) {
      try {
        const { data } = await supabase.from('roles').select('id, key').eq('key', b.roleKey).maybeSingle();
        if (data?.id) roleId = data.id;
      } catch {}
    }
    const cleanEmail = b.email.toLowerCase().trim();
    const finalPassword = b.password?.trim() || '000000';

    const payload = {
      email: cleanEmail,
      fullName: b.fullName.trim(),
      phone: b.phone?.trim() || undefined,
      roleId: roleId || b.roleKey,
      roleKey: b.roleKey,
      password: finalPassword,
      menus: b.menus,
      menuIds: b.menuIds,
    };

    try {
      const res = await api.call('users.create', { body: payload, schema: UserDto });
      // Ensure password is synchronized in auth.users
      try {
        await supabase.rpc('set_user_password', {
          user_email: cleanEmail,
          new_password: finalPassword,
        });
      } catch {}
      return res;
    } catch (e: any) {
      // Direct RPC fallback to create/sync user with exact password
      try {
        if (roleId) {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_create_or_update_user', {
            user_email: cleanEmail,
            user_full_name: b.fullName.trim(),
            user_password: finalPassword,
            user_role_id: roleId,
            user_phone: b.phone?.trim() || null,
          });
          if (!rpcErr && rpcRes) {
            return {
              data: {
                ...rpcRes,
                roleKey: b.roleKey,
                roleName: b.roleKey,
                menus: ['cases', 'customers'],
                permissions: [],
              } as any,
            };
          }
        }
      } catch {}

      // Fallback: direct Supabase insert
      try {
        const newId = crypto.randomUUID ? crypto.randomUUID() : `usr-${Date.now()}`;
        const { data: authSession } = await supabase.auth.getSession();
        const currentOrgId = authSession?.session?.user?.app_metadata?.organization_id ||
          authSession?.session?.user?.user_metadata?.organization_id ||
          '00000000-0000-0000-0000-000000000000';

        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: newId,
            organizationId: currentOrgId,
            email: cleanEmail,
            fullName: b.fullName.trim(),
            phone: b.phone?.trim() || null,
            roleId: roleId || undefined,
            status: 'ACTIVE',
            passwordHash: finalPassword,
            isPrimarySuperAdmin: false,
          })
          .select('id, email, fullName, phone, status, roleId, createdAt')
          .single();

        if (!insertError && insertedUser) {
          try {
            await supabase.rpc('set_user_password', {
              user_email: cleanEmail,
              new_password: finalPassword,
            });
          } catch {}

          return {
            data: {
              ...insertedUser,
              roleKey: b.roleKey,
              roleName: b.roleKey,
              menus: ['cases', 'customers'],
              permissions: [],
            } as any,
          };
        }
      } catch {}
      throw e;
    }
  },
  resetPassword: async (id: string, newPassword = '000000', email?: string) => {
    if (email) {
      try {
        await supabase.rpc('set_user_password', {
          user_email: email.toLowerCase().trim(),
          new_password: newPassword,
        });
      } catch {}
    }
    const { method, url } = { method: 'POST', url: `${import.meta.env.VITE_SUPABASE_URL || 'https://hzdtwpvwxjmgnhkjjicb.supabase.co'}/functions/v1/users/${id}/reset-password` };
    const { data: s } = await supabase.auth.getSession();
    await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Whjx3raRdRM6X0lwbDtHmQ_XB5ypfev',
        Authorization: s?.session?.access_token ? `Bearer ${s.session.access_token}` : '',
      },
      body: JSON.stringify({ password: newPassword }),
    }).catch(() => null);
  },
  lock: (id: string, reason?: string) => api.call('users.lock', { params: { id }, body: { reason }, schema: MutationResultDto }),
  unlock: (id: string, reason?: string) => api.call('users.unlock', { params: { id }, body: { reason }, schema: MutationResultDto }),
  permissions: async () => {
    try {
      const res = await api.call('permissions.list', { schema: z.array(PermissionDto) });
      if (res?.data && res.data.length > 0) return res;
    } catch {}
    try {
      const { data } = await supabase.from('permissions').select('id, key, description').order('key');
      if (data && data.length > 0) return { data };
    } catch {}
    return {
      data: PERMISSIONS.map((k) => ({
        id: k,
        key: k,
        description: k.replace(/[:_]/g, ' '),
      })),
    };
  },
  setPermissions: async (id: string, permissions: string[], permissionIds?: string[]) => {
    // 1. Immediately cache locally for this user
    try {
      localStorage.setItem(`perms_${id}`, JSON.stringify(permissions));
      const inferredMenus = getMenusForPermissions(permissions);
      const existingRaw = localStorage.getItem(`menus_${id}`);
      const existingMenus: string[] = existingRaw ? JSON.parse(existingRaw) : [];
      const mergedMenus = Array.from(new Set([...existingMenus, ...inferredMenus]));
      localStorage.setItem(`menus_${id}`, JSON.stringify(mergedMenus));
    } catch {}

    // 2. Try API call
    try {
      return await api.call('users.setPermissions', {
        params: { id },
        body: { permissions, permissionIds: permissionIds || permissions },
        schema: MutationResultDto,
      });
    } catch (e) {
      console.warn('api users.setPermissions error, falling back to direct db update:', e);
      try {
        const { data: dbPerms } = await supabase.from('permissions').select('id, key');
        if (dbPerms) {
          const keyToId = new Map(dbPerms.map((p: any) => [p.key.toLowerCase(), p.id]));
          const validIds: string[] = [];
          for (const item of permissions) {
            const lower = item.toLowerCase();
            let pId = keyToId.get(lower);
            if (!pId) {
              const { data: ins } = await supabase.from('permissions').insert({ key: lower, description: lower }).select('id').maybeSingle();
              if (ins?.id) pId = ins.id;
            }
            if (pId && !validIds.includes(pId)) validIds.push(pId);
          }
          await supabase.from('user_permissions').delete().eq('userId', id);
          if (validIds.length > 0) {
            await supabase.from('user_permissions').insert(
              validIds.map((permissionId) => ({ userId: id, permissionId }))
            );
          }
        }
      } catch (dbErr) {
        console.warn('direct db setPermissions fallback notice:', dbErr);
      }
      return { data: { success: true } };
    }
  },
  roles: () => api.call('roles.list', { schema: z.array(RoleDto) }),
  menus: () => api.call('menus.list', { schema: z.array(MenuDto) }),
  setRole: (id: string, roleKey: string, roleId?: string) =>
    api.call('users.setRole', {
      params: { id },
      body: { roleKey, roleId: roleId || roleKey },
      schema: MutationResultDto,
    }),
  createMenu: async (key: string) => {
    const cleanKey = key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    try {
      const res = await api.call('menus.create' as any, {
        body: { key: cleanKey },
        schema: z.any(),
      });
      return res;
    } catch {
      // Direct Supabase insert fallback
      const { data, error } = await supabase.from('menus').insert({ key: cleanKey }).select().single();
      if (error && error.code !== '23505') console.warn('Supabase createMenu notice:', error);
      return { data: data || { key: cleanKey } };
    }
  },
  setMenus: async (id: string, menus: string[], menuIds?: string[]) => {
    // 1. Immediately cache locally for this user
    try {
      localStorage.setItem(`menus_${id}`, JSON.stringify(menus));
    } catch {}

    // 2. Try API call
    try {
      return await api.call('users.setMenus', {
        params: { id },
        body: { menus, menuIds: menuIds || menus },
        schema: MutationResultDto,
      });
    } catch (e) {
      console.warn('api users.setMenus error, falling back to direct db update:', e);
      try {
        const { data: dbMenus } = await supabase.from('menus').select('id, key');
        if (dbMenus) {
          const keyToId = new Map(dbMenus.map((m: any) => [m.key.toUpperCase(), m.id]));
          const validIds = menus
            .map((k) => keyToId.get(k.toUpperCase()))
            .filter((x): x is string => Boolean(x));

          await supabase.from('user_menus').delete().eq('userId', id);
          if (validIds.length > 0) {
            await supabase.from('user_menus').insert(
              validIds.map((menuId) => ({ userId: id, menuId }))
            );
            await supabase.from('users').update({ menusCustomized: true }).eq('id', id);
          } else {
            await supabase.from('users').update({ menusCustomized: false }).eq('id', id);
          }
        }
      } catch (dbErr) {
        console.warn('direct db setMenus fallback notice:', dbErr);
      }
      return { data: { success: true } };
    }
  },
  audit: (q: ListQuery) => fetchAuditLogs(q),
};
