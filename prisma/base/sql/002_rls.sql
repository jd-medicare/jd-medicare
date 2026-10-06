-- Row Level Security: defense in depth for tenant isolation.
-- Policies match the session settings set by PrismaService:
--   app.current_org = '<organization uuid>'   (tenant-scoped client)
--   app.rls_bypass  = 'on'                    (explicit, grep-able system scope)
-- RLS does not apply to the table owner / superuser: production MUST connect as a non-owner role
-- (see docs/security/auth-authorization.md). Policies are harmless for the owner.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','audit_logs','security_events','system_settings'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($p$CREATE POLICY tenant_isolation ON %I USING (
        coalesce(current_setting('app.rls_bypass', true), '') = 'on'
        OR "organizationId"::text = current_setting('app.current_org', true)
      ) WITH CHECK (
        coalesce(current_setting('app.rls_bypass', true), '') = 'on'
        OR "organizationId"::text = current_setting('app.current_org', true)
      )$p$, t);
  END LOOP;
END $$;
