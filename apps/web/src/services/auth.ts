// apps/web/src/services/auth.ts
import { z } from 'zod';
import { api } from './api-client';
import { supabase } from './supabase';
import { LoginResult, SessionUserDto } from '../schemas';

export const authService = {
  login: async (b: { email: string; password: string }) => {
    // 1. Sign in with Supabase
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: b.email.toLowerCase().trim(),
      password: b.password,
    });

    if (error || !authData.session) {
      throw error || new Error('Invalid email or password');
    }

    // 2. Fetch user profile from /auth/me
    const meRes = await authService.me();
    return {
      data: {
        user: meRes.data,
        mfaRequired: false,
      },
    };
  },

  mfaVerify: async (_code: string) => {
    const meRes = await authService.me();
    return {
      data: {
        user: meRes.data,
      },
    };
  },

  me: async () => {
    const res = await api.call('auth.me', { schema: z.any() });
    const rawUser = res.data.user || res.data;
    const mapped: SessionUserDto = {
      id: rawUser.id,
      email: rawUser.email,
      fullName: rawUser.fullName,
      organizationId: rawUser.organizationId,
      roleKey: rawUser.role || rawUser.roleKey || 'AGENT',
      permissions: rawUser.permissions || [],
      menus: rawUser.menus || [],
      mfaEnabled: Boolean(rawUser.mfaEnabled),
    };
    return { data: mapped };
  },

  logout: async () => {
    await supabase.auth.signOut();
    return { data: { success: true } };
  },

  passwordForgot: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim());
    if (error) throw error;
    return { data: { success: true } };
  },

  passwordReset: async (_token: string, newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { data: { success: true } };
  },
};
