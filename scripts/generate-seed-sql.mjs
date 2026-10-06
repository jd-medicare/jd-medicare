// scripts/generate-seed-sql.mjs
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const ROLE_KEYS = ['PRIMARY_SUPER_ADMIN', 'ADMIN', 'CEO', 'TEAM_LEADER', 'AGENT', 'OUTSOURCE'];
const ROLE_NAMES = {
  PRIMARY_SUPER_ADMIN: 'Primary Super Admin',
  ADMIN: 'Admin',
  CEO: 'CEO',
  TEAM_LEADER: 'Team Leader',
  AGENT: 'Agent',
  OUTSOURCE: 'Outsource',
};

const PERMISSIONS = [
  'user:create', 'user:view', 'user:update', 'user:lock', 'user:unlock',
  'role:manage', 'permission:manage', 'menu:manage',
  'customer:create', 'customer:view', 'customer:update',
  'case:create', 'case:view', 'case:update', 'case:accept', 'case:reject', 'case:modify_processed',
  'call_length:view', 'call_length:create', 'call_length:update',
  'report:view', 'report:export',
  'finance:view', 'income:create', 'income:update', 'expense:create', 'expense:update',
  'expense_head:create', 'expense_head:update',
  'ceo:dashboard', 'audit:view',
];

const MENUS = ['DASHBOARD', 'CUSTOMERS', 'CASES', 'OUTSOURCE', 'REPORTS', 'FINANCE', 'EXPENSES', 'CEO', 'ADMINISTRATION'];

const DEFAULT_ROLE_PERMISSIONS = {
  AGENT: ['customer:create', 'customer:view', 'case:create', 'case:view'],
  TEAM_LEADER: ['customer:view', 'customer:update', 'case:view', 'case:update', 'call_length:view', 'call_length:create', 'call_length:update', 'report:view'],
  OUTSOURCE: ['case:view', 'case:accept', 'case:reject', 'call_length:view', 'report:view'],
  ADMIN: ['user:create', 'user:view', 'user:update', 'user:lock', 'user:unlock', 'menu:manage', 'report:view'],
  CEO: ['ceo:dashboard', 'report:view', 'report:export', 'finance:view', 'income:create', 'income:update', 'expense:create', 'expense:update', 'expense_head:create', 'expense_head:update'],
  PRIMARY_SUPER_ADMIN: PERMISSIONS,
};

const DEFAULT_ROLE_MENUS = {
  AGENT: ['DASHBOARD', 'CUSTOMERS', 'CASES'],
  TEAM_LEADER: ['DASHBOARD', 'CUSTOMERS', 'CASES', 'REPORTS'],
  OUTSOURCE: ['DASHBOARD', 'OUTSOURCE', 'REPORTS'],
  ADMIN: ['DASHBOARD', 'REPORTS', 'ADMINISTRATION'],
  CEO: ['DASHBOARD', 'REPORTS', 'FINANCE', 'EXPENSES', 'CEO'],
  PRIMARY_SUPER_ADMIN: MENUS,
};

let sql = `-- ==============================================================================
-- Supabase Seed Data: Roles, Permissions, Menus, Role Mappings, Initial Org
-- Idempotent (ON CONFLICT DO NOTHING / UPDATE)
-- ==============================================================================

-- 1. Roles
`;

for (const key of ROLE_KEYS) {
  sql += `INSERT INTO "roles" ("key", "name") VALUES ('${key}', '${ROLE_NAMES[key]}') ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name";\n`;
}

sql += `\n-- 2. Permissions\n`;
for (const key of PERMISSIONS) {
  const desc = key.replace(/[:_]/g, ' ');
  sql += `INSERT INTO "permissions" ("key", "description") VALUES ('${key}', '${desc}') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";\n`;
}

sql += `\n-- 3. Menus\n`;
for (const key of MENUS) {
  sql += `INSERT INTO "menus" ("key") VALUES ('${key}') ON CONFLICT ("key") DO NOTHING;\n`;
}

sql += `\n-- 4. Role Permissions Mapping\n`;
for (const [role, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
  for (const perm of perms) {
    sql += `INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = '${role}' AND p.key = '${perm}'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;\n`;
  }
}

sql += `\n-- 5. Role Menus Mapping\n`;
for (const [role, menus] of Object.entries(DEFAULT_ROLE_MENUS)) {
  for (const menu of menus) {
    sql += `INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = '${role}' AND m.key = '${menu}'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;\n`;
  }
}

sql += `\n-- 6. Initial Organization\n`;
sql += `INSERT INTO "organizations" ("name", "slug", "baseCurrency")
VALUES ('JD Medicare', 'jd-medicare', 'PKR')
ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name";\n`;

writeFileSync(resolve('supabase/seed.sql'), sql, 'utf8');
console.log('Successfully generated supabase/seed.sql');
