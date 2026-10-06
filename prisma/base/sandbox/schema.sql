-- SANDBOX ONLY. Hand-written mirror of prisma/schema.base.prisma used when `prisma db push`
-- cannot download the schema engine (offline CI/sandbox). Keep it in sync by hand with the Prisma datamodel;
-- in real environments use `pnpm db:push` (and migrations at merge).
-- @@
DO $$ BEGIN CREATE TYPE "UserStatus" AS ENUM ('INVITED','ACTIVE','LOCKED','SUSPENDED','DISABLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- @@
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY, name text NOT NULL, slug text NOT NULL UNIQUE,
  "baseCurrency" varchar(3) NOT NULL DEFAULT 'PKR',
  "createdAt" timestamptz(3) NOT NULL DEFAULT now(), "updatedAt" timestamptz(3) NOT NULL DEFAULT now());
-- @@
CREATE TABLE IF NOT EXISTS roles (id uuid PRIMARY KEY, key text NOT NULL UNIQUE, name text NOT NULL);
-- @@
CREATE TABLE IF NOT EXISTS permissions (id uuid PRIMARY KEY, key text NOT NULL UNIQUE, description text NOT NULL);
-- @@
CREATE TABLE IF NOT EXISTS menus (id uuid PRIMARY KEY, key text NOT NULL UNIQUE);
-- @@
CREATE TABLE IF NOT EXISTS role_permissions (
  "roleId" uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  "permissionId" uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY ("roleId","permissionId"));
-- @@
CREATE TABLE IF NOT EXISTS role_menus (
  "roleId" uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  "menuId" uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  PRIMARY KEY ("roleId","menuId"));
-- @@
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id),
  email text NOT NULL UNIQUE, "fullName" text NOT NULL, phone text, "passwordHash" text NOT NULL,
  status "UserStatus" NOT NULL DEFAULT 'INVITED', "roleId" uuid NOT NULL REFERENCES roles(id),
  "isPrimarySuperAdmin" boolean NOT NULL DEFAULT false, "menusCustomized" boolean NOT NULL DEFAULT false,
  "mfaEnabled" boolean NOT NULL DEFAULT false, "mfaSecretEnc" text,
  "failedLoginCount" integer NOT NULL DEFAULT 0, "lockedUntil" timestamptz(3), "lastLoginAt" timestamptz(3),
  "passwordChangedAt" timestamptz(3),
  "createdAt" timestamptz(3) NOT NULL DEFAULT now(), "updatedAt" timestamptz(3) NOT NULL DEFAULT now());
-- @@
CREATE INDEX IF NOT EXISTS users_org_status ON users ("organizationId", status);
-- @@
CREATE INDEX IF NOT EXISTS users_org_role ON users ("organizationId", "roleId");
-- @@
CREATE TABLE IF NOT EXISTS user_profiles (
  "userId" uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, "jobTitle" text,
  timezone text NOT NULL DEFAULT 'UTC', locale text NOT NULL DEFAULT 'en');
-- @@
CREATE TABLE IF NOT EXISTS user_permissions (
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "permissionId" uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY ("userId","permissionId"));
-- @@
CREATE TABLE IF NOT EXISTS user_menus (
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "menuId" uuid NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  PRIMARY KEY ("userId","menuId"));
-- @@
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY, "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "tokenHash" text NOT NULL UNIQUE, "expiresAt" timestamptz(3) NOT NULL, "usedAt" timestamptz(3),
  "createdAt" timestamptz(3) NOT NULL DEFAULT now());
-- @@
CREATE INDEX IF NOT EXISTS prt_user ON password_reset_tokens ("userId");
-- @@
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id), event text NOT NULL,
  "actorId" uuid, "entityType" text NOT NULL, "entityId" text NOT NULL, "requestId" text,
  before jsonb, after jsonb, "isProtected" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz(3) NOT NULL DEFAULT now());
-- @@
CREATE INDEX IF NOT EXISTS audit_org_created ON audit_logs ("organizationId", "createdAt" DESC);
-- @@
CREATE INDEX IF NOT EXISTS audit_org_event ON audit_logs ("organizationId", event);
-- @@
CREATE INDEX IF NOT EXISTS audit_org_entity ON audit_logs ("organizationId", "entityType", "entityId");
-- @@
CREATE TABLE IF NOT EXISTS security_events (
  id uuid PRIMARY KEY, "organizationId" uuid REFERENCES organizations(id), "userId" uuid,
  type text NOT NULL, ip text, "userAgent" text, "requestId" text, metadata jsonb,
  "isProtected" boolean NOT NULL DEFAULT false, "createdAt" timestamptz(3) NOT NULL DEFAULT now());
-- @@
CREATE INDEX IF NOT EXISTS secev_org_created ON security_events ("organizationId", "createdAt" DESC);
-- @@
CREATE INDEX IF NOT EXISTS secev_type_created ON security_events (type, "createdAt" DESC);
-- @@
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY, "organizationId" uuid NOT NULL REFERENCES organizations(id), key text NOT NULL,
  value jsonb NOT NULL, "updatedAt" timestamptz(3) NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", key));
