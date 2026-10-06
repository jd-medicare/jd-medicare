import { z } from 'zod';
import { api } from './api-client';
import type { ListQuery } from './types';
import { CaseDto } from '../schemas';
import { CustomerCreateResult } from '../schemas/domain';

export interface CustomerForm { firstName: string; lastName: string; phone: string; dateOfBirth: string; address: string; zipCode: string }
export const caseService = {
  // customers.create creates the customer AND its case (CustomerCreateResult). The registry has no cases.create.
  createCustomer: (b: CustomerForm) => api.call('customers.create', { body: b, schema: CustomerCreateResult }),
  list: (q: ListQuery) => api.call('cases.list', { query: q, schema: z.array(CaseDto) }),
  get: (id: string) => api.call('cases.get', { params: { id }, schema: CaseDto }),
  setCallLength: (id: string, durationSeconds: number) => api.call('cases.setCallLength', { params: { id }, body: { durationSeconds }, schema: CaseDto }),
};
