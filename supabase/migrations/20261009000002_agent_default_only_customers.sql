-- Migration: Ensure AGENT role default only has CUSTOMERS menu and customer creation permissions
DELETE FROM "role_menus"
WHERE "roleId" = (SELECT id FROM "roles" WHERE key = 'AGENT')
  AND "menuId" IN (SELECT id FROM "menus" WHERE key IN ('CASES', 'DASHBOARD'));

INSERT INTO "role_menus" ("roleId", "menuId")
SELECT r.id, m.id FROM "roles" r, "menus" m
WHERE r.key = 'AGENT' AND m.key = 'CUSTOMERS'
ON CONFLICT ("roleId", "menuId") DO NOTHING;

DELETE FROM "role_permissions"
WHERE "roleId" = (SELECT id FROM "roles" WHERE key = 'AGENT')
  AND "permissionId" IN (SELECT id FROM "permissions" WHERE key IN ('case:create', 'case:view', 'case:update', 'case:accept', 'case:reject'));

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r.id, p.id FROM "roles" r, "permissions" p
WHERE r.key = 'AGENT' AND p.key IN ('customer:create', 'customer:view')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
