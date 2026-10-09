-- Migration: Clean up invalid UUID keys from menus and ensure standard menus
DELETE FROM "role_menus"
WHERE "menuId" IN (
  SELECT id FROM "menus"
  WHERE key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

DELETE FROM "user_menus"
WHERE "menuId" IN (
  SELECT id FROM "menus"
  WHERE key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

DELETE FROM "menus"
WHERE key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Ensure standard system menus exist with proper clean keys
INSERT INTO "menus" ("key")
VALUES
  ('DASHBOARD'),
  ('CUSTOMERS'),
  ('CASES'),
  ('OUTSOURCE'),
  ('REPORTS'),
  ('FINANCE'),
  ('EXPENSES'),
  ('CEO'),
  ('ADMINISTRATION')
ON CONFLICT ("key") DO NOTHING;

-- Ensure AGENT role is strictly linked ONLY to CUSTOMERS
DELETE FROM "role_menus"
WHERE "roleId" = (SELECT id FROM "roles" WHERE key = 'AGENT')
  AND "menuId" != (SELECT id FROM "menus" WHERE key = 'CUSTOMERS');

INSERT INTO "role_menus" ("roleId", "menuId")
SELECT r.id, m.id FROM "roles" r, "menus" m
WHERE r.key = 'AGENT' AND m.key = 'CUSTOMERS'
ON CONFLICT ("roleId", "menuId") DO NOTHING;
