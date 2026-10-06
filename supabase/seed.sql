-- ==============================================================================
-- Supabase Seed Data: Roles, Permissions, Menus, Role Mappings, Initial Org
-- Idempotent (ON CONFLICT DO NOTHING / UPDATE)
-- ==============================================================================

-- 1. Roles
INSERT INTO "roles" ("key", "name") VALUES ('PRIMARY_SUPER_ADMIN', 'Primary Super Admin') ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name";
INSERT INTO "roles" ("key", "name") VALUES ('ADMIN', 'Admin') ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name";
INSERT INTO "roles" ("key", "name") VALUES ('CEO', 'CEO') ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name";
INSERT INTO "roles" ("key", "name") VALUES ('TEAM_LEADER', 'Team Leader') ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name";
INSERT INTO "roles" ("key", "name") VALUES ('AGENT', 'Agent') ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name";
INSERT INTO "roles" ("key", "name") VALUES ('OUTSOURCE', 'Outsource') ON CONFLICT ("key") DO UPDATE SET "name" = EXCLUDED."name";

-- 2. Permissions
INSERT INTO "permissions" ("key", "description") VALUES ('user:create', 'user create') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('user:view', 'user view') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('user:update', 'user update') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('user:lock', 'user lock') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('user:unlock', 'user unlock') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('role:manage', 'role manage') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('permission:manage', 'permission manage') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('menu:manage', 'menu manage') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('customer:create', 'customer create') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('customer:view', 'customer view') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('customer:update', 'customer update') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('case:create', 'case create') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('case:view', 'case view') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('case:update', 'case update') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('case:accept', 'case accept') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('case:reject', 'case reject') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('case:modify_processed', 'case modify processed') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('call_length:view', 'call length view') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('call_length:create', 'call length create') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('call_length:update', 'call length update') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('report:view', 'report view') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('report:export', 'report export') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('finance:view', 'finance view') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('income:create', 'income create') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('income:update', 'income update') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('expense:create', 'expense create') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('expense:update', 'expense update') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('expense_head:create', 'expense head create') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('expense_head:update', 'expense head update') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('ceo:dashboard', 'ceo dashboard') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";
INSERT INTO "permissions" ("key", "description") VALUES ('audit:view', 'audit view') ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description";

-- 3. Menus
INSERT INTO "menus" ("key") VALUES ('DASHBOARD') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "menus" ("key") VALUES ('CUSTOMERS') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "menus" ("key") VALUES ('CASES') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "menus" ("key") VALUES ('OUTSOURCE') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "menus" ("key") VALUES ('REPORTS') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "menus" ("key") VALUES ('FINANCE') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "menus" ("key") VALUES ('EXPENSES') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "menus" ("key") VALUES ('CEO') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "menus" ("key") VALUES ('ADMINISTRATION') ON CONFLICT ("key") DO NOTHING;

-- 4. Role Permissions Mapping
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'AGENT' AND p.key = 'customer:create'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'AGENT' AND p.key = 'customer:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'AGENT' AND p.key = 'case:create'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'AGENT' AND p.key = 'case:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'TEAM_LEADER' AND p.key = 'customer:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'TEAM_LEADER' AND p.key = 'customer:update'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'TEAM_LEADER' AND p.key = 'case:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'TEAM_LEADER' AND p.key = 'case:update'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'TEAM_LEADER' AND p.key = 'call_length:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'TEAM_LEADER' AND p.key = 'call_length:create'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'TEAM_LEADER' AND p.key = 'call_length:update'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'TEAM_LEADER' AND p.key = 'report:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'OUTSOURCE' AND p.key = 'case:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'OUTSOURCE' AND p.key = 'case:accept'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'OUTSOURCE' AND p.key = 'case:reject'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'OUTSOURCE' AND p.key = 'call_length:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'OUTSOURCE' AND p.key = 'report:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'ADMIN' AND p.key = 'user:create'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'ADMIN' AND p.key = 'user:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'ADMIN' AND p.key = 'user:update'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'ADMIN' AND p.key = 'user:lock'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'ADMIN' AND p.key = 'user:unlock'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'ADMIN' AND p.key = 'menu:manage'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'ADMIN' AND p.key = 'report:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'CEO' AND p.key = 'ceo:dashboard'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'CEO' AND p.key = 'report:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'CEO' AND p.key = 'report:export'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'CEO' AND p.key = 'finance:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'CEO' AND p.key = 'income:create'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'CEO' AND p.key = 'income:update'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'CEO' AND p.key = 'expense:create'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'CEO' AND p.key = 'expense:update'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'CEO' AND p.key = 'expense_head:create'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'CEO' AND p.key = 'expense_head:update'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'user:create'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'user:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'user:update'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'user:lock'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'user:unlock'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'role:manage'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'permission:manage'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'menu:manage'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'customer:create'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'customer:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'customer:update'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'case:create'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'case:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'case:update'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'case:accept'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'case:reject'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'case:modify_processed'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'call_length:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'call_length:create'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'call_length:update'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'report:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'report:export'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'finance:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'income:create'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'income:update'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'expense:create'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'expense:update'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'expense_head:create'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'expense_head:update'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'ceo:dashboard'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;
INSERT INTO "role_permissions" ("roleId", "permissionId")
  SELECT r.id, p.id FROM "roles" r, "permissions" p
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND p.key = 'audit:view'
  ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- 5. Role Menus Mapping
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'AGENT' AND m.key = 'DASHBOARD'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'AGENT' AND m.key = 'CUSTOMERS'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'AGENT' AND m.key = 'CASES'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'TEAM_LEADER' AND m.key = 'DASHBOARD'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'TEAM_LEADER' AND m.key = 'CUSTOMERS'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'TEAM_LEADER' AND m.key = 'CASES'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'TEAM_LEADER' AND m.key = 'REPORTS'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'OUTSOURCE' AND m.key = 'DASHBOARD'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'OUTSOURCE' AND m.key = 'OUTSOURCE'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'OUTSOURCE' AND m.key = 'REPORTS'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'ADMIN' AND m.key = 'DASHBOARD'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'ADMIN' AND m.key = 'REPORTS'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'ADMIN' AND m.key = 'ADMINISTRATION'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'CEO' AND m.key = 'DASHBOARD'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'CEO' AND m.key = 'REPORTS'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'CEO' AND m.key = 'FINANCE'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'CEO' AND m.key = 'EXPENSES'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'CEO' AND m.key = 'CEO'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND m.key = 'DASHBOARD'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND m.key = 'CUSTOMERS'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND m.key = 'CASES'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND m.key = 'OUTSOURCE'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND m.key = 'REPORTS'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND m.key = 'FINANCE'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND m.key = 'EXPENSES'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND m.key = 'CEO'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;
INSERT INTO "role_menus" ("roleId", "menuId")
  SELECT r.id, m.id FROM "roles" r, "menus" m
  WHERE r.key = 'PRIMARY_SUPER_ADMIN' AND m.key = 'ADMINISTRATION'
  ON CONFLICT ("roleId", "menuId") DO NOTHING;

-- 6. Initial Organization
INSERT INTO "organizations" ("name", "slug", "baseCurrency")
VALUES ('JD Medicare', 'jd-medicare', 'PKR')
ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name";
