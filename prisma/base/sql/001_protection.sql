-- Idempotent. Statements are separated by lines containing only "-- @@".
-- 1. Exactly one Primary Super Admin per organization (partial unique index).
CREATE UNIQUE INDEX IF NOT EXISTS users_one_psa_per_org ON users ("organizationId") WHERE "isPrimarySuperAdmin";
-- @@
-- 2. Primary Super Admin protection trigger.
CREATE OR REPLACE FUNCTION guard_primary_super_admin() RETURNS trigger AS $$
DECLARE psa_role uuid;
BEGIN
  SELECT id INTO psa_role FROM roles WHERE key = 'PRIMARY_SUPER_ADMIN';
  IF TG_OP = 'DELETE' THEN
    IF OLD."isPrimarySuperAdmin" THEN
      RAISE EXCEPTION 'PROTECTED_USER: the Primary Super Admin cannot be deleted' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW."isPrimarySuperAdmin" AND coalesce(current_setting('app.allow_psa_seed', true), '') <> 'on' THEN
      RAISE EXCEPTION 'PROTECTED_USER: a Primary Super Admin can only be created by the seed process' USING ERRCODE = '42501';
    END IF;
    IF NEW."isPrimarySuperAdmin" IS DISTINCT FROM coalesce(NEW."roleId" = psa_role, false) THEN
      RAISE EXCEPTION 'PROTECTED_USER: PRIMARY_SUPER_ADMIN role and flag must go together' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  -- UPDATE
  IF OLD."isPrimarySuperAdmin" THEN
    IF NOT NEW."isPrimarySuperAdmin" OR NEW."roleId" <> OLD."roleId" OR NEW."organizationId" <> OLD."organizationId"
       OR NEW.status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'PROTECTED_USER: the Primary Super Admin cannot be demoted, moved or deactivated' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NEW."isPrimarySuperAdmin" OR NEW."roleId" = psa_role THEN
      RAISE EXCEPTION 'PROTECTED_USER: cannot promote a user to Primary Super Admin' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
-- @@
DROP TRIGGER IF EXISTS trg_guard_psa ON users;
-- @@
CREATE TRIGGER trg_guard_psa BEFORE INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION guard_primary_super_admin();
-- @@
-- 3. Per-user permission / menu overrides on the Primary Super Admin are forbidden.
CREATE OR REPLACE FUNCTION guard_psa_overrides() RETURNS trigger AS $$
DECLARE uid uuid;
BEGIN
  uid := CASE WHEN TG_OP = 'DELETE' THEN OLD."userId" ELSE NEW."userId" END;
  IF EXISTS (SELECT 1 FROM users WHERE id = uid AND "isPrimarySuperAdmin") THEN
    RAISE EXCEPTION 'PROTECTED_USER: overrides on the Primary Super Admin are not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$ LANGUAGE plpgsql;
-- @@
DROP TRIGGER IF EXISTS trg_guard_psa_perm ON user_permissions;
-- @@
CREATE TRIGGER trg_guard_psa_perm BEFORE INSERT OR UPDATE OR DELETE ON user_permissions FOR EACH ROW EXECUTE FUNCTION guard_psa_overrides();
-- @@
DROP TRIGGER IF EXISTS trg_guard_psa_menu ON user_menus;
-- @@
CREATE TRIGGER trg_guard_psa_menu BEFORE INSERT OR UPDATE OR DELETE ON user_menus FOR EACH ROW EXECUTE FUNCTION guard_psa_overrides();
-- @@
-- 4. Audit evidence is append-only: never updated, deleted or truncated.
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'APPEND_ONLY: % on % is not allowed', TG_OP, TG_TABLE_NAME USING ERRCODE = '42501';
END $$ LANGUAGE plpgsql;
-- @@
DROP TRIGGER IF EXISTS trg_audit_immutable ON audit_logs;
-- @@
CREATE TRIGGER trg_audit_immutable BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
-- @@
DROP TRIGGER IF EXISTS trg_audit_no_truncate ON audit_logs;
-- @@
CREATE TRIGGER trg_audit_no_truncate BEFORE TRUNCATE ON audit_logs FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();
-- @@
DROP TRIGGER IF EXISTS trg_secevent_immutable ON security_events;
-- @@
CREATE TRIGGER trg_secevent_immutable BEFORE UPDATE OR DELETE ON security_events FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
