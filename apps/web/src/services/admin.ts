import { z } from 'zod';
import { api } from './api-client';
import type { ListQuery } from './types';
import { AuditLogDto, PermissionDto, UserDto } from '../schemas/domain';

export interface CreateUserForm { email: string; fullName: string; phone?: string; roleKey: string; password?: string }
export const adminService = {
  users: (q: ListQuery) => api.call('users.list', { query: q, schema: z.array(UserDto) }),
  createUser: (b: CreateUserForm) => api.call('users.create', { body: b, schema: UserDto }),
  lock: (id: string, reason?: string) => api.call('users.lock', { params: { id }, body: { reason }, schema: UserDto }),
  unlock: (id: string, reason?: string) => api.call('users.unlock', { params: { id }, body: { reason }, schema: UserDto }),
  permissions: () => api.call('permissions.list', { schema: z.array(PermissionDto) }),
  setPermissions: (id: string, permissions: string[]) => api.call('users.setPermissions', { params: { id }, body: { permissions }, schema: UserDto }),
  audit: (q: ListQuery) => api.call('audit.list', { query: q, schema: z.array(AuditLogDto) }),
};
