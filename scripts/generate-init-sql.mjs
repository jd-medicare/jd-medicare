// scratch/generate-init-sql.mjs
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const sql = `-- ==============================================================================
-- Migration: 20241006000000_init
-- Full schema, constraints, indexes, triggers, rate limiting, and RLS for Supabase
-- ==============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums
DO $$ BEGIN CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'LOCKED', 'SUSPENDED', 'DISABLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CaseStatus" AS ENUM ('SUBMITTED', 'PENDING', 'ACCEPTED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CaseDecision" AS ENUM ('ACCEPT', 'REJECT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CaseRevisionType" AS ENUM ('CREATED', 'EDITED', 'CALL_LENGTH', 'ACCEPTED', 'REJECTED', 'MODIFIED_AFTER_PROCESSING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CaseAssignmentRole" AS ENUM ('AGENT', 'TEAM_LEADER', 'OUTSOURCE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FinanceStatus" AS ENUM ('ACTIVE', 'VOIDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "FinancialTransactionType" AS ENUM ('INCOME', 'EXPENSE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING', 'AVAILABLE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'DISABLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "IntegrationRequestStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'RETRYING', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "NotificationEmailStatus" AS ENUM ('NONE', 'QUEUED', 'SENT', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ExportStatus" AS ENUM ('QUEUED', 'RUNNING', 'READY', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'XLSX', 'PDF'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ExportReportType" AS ENUM ('OUTSOURCE', 'TEAM_LEADER', 'ADMIN', 'FINANCE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. organizations
CREATE TABLE IF NOT EXISTS "organizations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "baseCurrency" VARCHAR(3) NOT NULL DEFAULT 'PKR',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);

-- 2. roles
CREATE TABLE IF NOT EXISTS "roles" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL
);

-- 3. permissions
CREATE TABLE IF NOT EXISTS "permissions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  "description" TEXT NOT NULL
);

-- 4. menus
CREATE TABLE IF NOT EXISTS "menus" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE
);

-- 5. role_permissions
CREATE TABLE IF NOT EXISTS "role_permissions" (
  "roleId" UUID NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "permissionId" UUID NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
  PRIMARY KEY ("roleId", "permissionId")
);

-- 6. role_menus
CREATE TABLE IF NOT EXISTS "role_menus" (
  "roleId" UUID NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
  "menuId" UUID NOT NULL REFERENCES "menus"("id") ON DELETE CASCADE,
  PRIMARY KEY ("roleId", "menuId")
);

-- 7. users
CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "email" TEXT NOT NULL UNIQUE,
  "fullName" TEXT NOT NULL,
  "phone" TEXT,
  "passwordHash" TEXT NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
  "roleId" UUID NOT NULL REFERENCES "roles"("id"),
  "isPrimarySuperAdmin" BOOLEAN NOT NULL DEFAULT false,
  "menusCustomized" BOOLEAN NOT NULL DEFAULT false,
  "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  "mfaSecretEnc" TEXT,
  "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMPTZ(3),
  "lastLoginAt" TIMESTAMPTZ(3),
  "passwordChangedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "users_org_status" ON "users" ("organizationId", "status");
CREATE INDEX IF NOT EXISTS "users_org_role" ON "users" ("organizationId", "roleId");
CREATE UNIQUE INDEX IF NOT EXISTS "users_one_psa_per_org" ON "users" ("organizationId") WHERE "isPrimarySuperAdmin";

-- 8. user_profiles
CREATE TABLE IF NOT EXISTS "user_profiles" (
  "userId" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "jobTitle" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "locale" TEXT NOT NULL DEFAULT 'en'
);

-- 9. user_permissions
CREATE TABLE IF NOT EXISTS "user_permissions" (
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "permissionId" UUID NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE,
  PRIMARY KEY ("userId", "permissionId")
);

-- 10. user_menus
CREATE TABLE IF NOT EXISTS "user_menus" (
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "menuId" UUID NOT NULL REFERENCES "menus"("id") ON DELETE CASCADE,
  PRIMARY KEY ("userId", "menuId")
);

-- 11. password_reset_tokens
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tokenHash" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "usedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "prt_user" ON "password_reset_tokens" ("userId");

-- 12. audit_logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "event" TEXT NOT NULL,
  "actorId" UUID,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "requestId" TEXT,
  "before" JSONB,
  "after" JSONB,
  "isProtected" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "audit_org_created" ON "audit_logs" ("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "audit_org_event" ON "audit_logs" ("organizationId", "event");
CREATE INDEX IF NOT EXISTS "audit_org_entity" ON "audit_logs" ("organizationId", "entityType", "entityId");

-- 13. security_events
CREATE TABLE IF NOT EXISTS "security_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID REFERENCES "organizations"("id"),
  "userId" UUID,
  "type" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "requestId" TEXT,
  "metadata" JSONB,
  "isProtected" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "secev_org_created" ON "security_events" ("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "secev_type_created" ON "security_events" ("type", "createdAt" DESC);

-- 14. system_settings
CREATE TABLE IF NOT EXISTS "system_settings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "key")
);

-- 15. customers
CREATE TABLE IF NOT EXISTS "customers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "dateOfBirth" DATE NOT NULL,
  "address" TEXT NOT NULL,
  "zipCode" TEXT NOT NULL,
  "extra" JSONB NOT NULL DEFAULT '{}',
  "createdById" UUID NOT NULL REFERENCES "users"("id"),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "phone")
);
CREATE INDEX IF NOT EXISTS "customers_org_name" ON "customers" ("organizationId", "lastName", "firstName");
CREATE INDEX IF NOT EXISTS "customers_org_created" ON "customers" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "customers_phone_trgm" ON "customers" USING gin ("phone" gin_trgm_ops);

-- 16. cases
CREATE TABLE IF NOT EXISTS "cases" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "customerId" UUID NOT NULL UNIQUE REFERENCES "customers"("id"),
  "status" "CaseStatus" NOT NULL DEFAULT 'SUBMITTED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "agentId" UUID NOT NULL REFERENCES "users"("id"),
  "teamLeaderId" UUID REFERENCES "users"("id"),
  "processedById" UUID REFERENCES "users"("id"),
  "processedAt" TIMESTAMPTZ(6),
  "rejectionReason" TEXT,
  "submittedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "cases_org_status_sub" ON "cases" ("organizationId", "status", "submittedAt");
CREATE INDEX IF NOT EXISTS "cases_org_agent_sub" ON "cases" ("organizationId", "agentId", "submittedAt");
CREATE INDEX IF NOT EXISTS "cases_org_tl_sub" ON "cases" ("organizationId", "teamLeaderId", "submittedAt");
CREATE INDEX IF NOT EXISTS "cases_org_proc_time" ON "cases" ("organizationId", "processedById", "processedAt");
CREATE INDEX IF NOT EXISTS "cases_org_submitted" ON "cases" ("organizationId", "submittedAt");
CREATE INDEX IF NOT EXISTS "cases_org_processed" ON "cases" ("organizationId", "processedAt");

-- 17. call_records
CREATE TABLE IF NOT EXISTS "call_records" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "caseId" UUID NOT NULL UNIQUE REFERENCES "cases"("id"),
  "durationSeconds" INTEGER NOT NULL,
  "setById" UUID NOT NULL REFERENCES "users"("id"),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "call_records_duration_nonneg" CHECK ("durationSeconds" >= 0)
);
CREATE INDEX IF NOT EXISTS "call_records_org_dur" ON "call_records" ("organizationId", "durationSeconds");

-- 18. case_assignments
CREATE TABLE IF NOT EXISTS "case_assignments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "caseId" UUID NOT NULL REFERENCES "cases"("id"),
  "userId" UUID NOT NULL REFERENCES "users"("id"),
  "role" "CaseAssignmentRole" NOT NULL,
  "assignedById" UUID REFERENCES "users"("id"),
  "assignedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "unassignedAt" TIMESTAMPTZ(6)
);
CREATE INDEX IF NOT EXISTS "case_assignments_case_role" ON "case_assignments" ("caseId", "role");
CREATE INDEX IF NOT EXISTS "case_assignments_org_user_role" ON "case_assignments" ("organizationId", "userId", "role");

-- 19. workflow_transitions
CREATE TABLE IF NOT EXISTS "workflow_transitions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "seq" BIGSERIAL,
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "caseId" UUID NOT NULL REFERENCES "cases"("id"),
  "fromStatus" "CaseStatus",
  "toStatus" "CaseStatus" NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" UUID REFERENCES "users"("id"),
  "reason" TEXT,
  "requestId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "workflow_trans_case_seq" ON "workflow_transitions" ("caseId", "seq");
CREATE INDEX IF NOT EXISTS "workflow_trans_org_created" ON "workflow_transitions" ("organizationId", "createdAt");

-- 20. accept_reject_actions
CREATE TABLE IF NOT EXISTS "accept_reject_actions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "caseId" UUID NOT NULL UNIQUE REFERENCES "cases"("id"),
  "decision" "CaseDecision" NOT NULL,
  "actorId" UUID NOT NULL REFERENCES "users"("id"),
  "reason" TEXT,
  "requestId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "accept_reject_org_actor_created" ON "accept_reject_actions" ("organizationId", "actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "accept_reject_org_dec_created" ON "accept_reject_actions" ("organizationId", "decision", "createdAt");

-- 21. case_revisions
CREATE TABLE IF NOT EXISTS "case_revisions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "seq" BIGSERIAL,
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "caseId" UUID NOT NULL REFERENCES "cases"("id"),
  "type" "CaseRevisionType" NOT NULL,
  "actorId" UUID NOT NULL REFERENCES "users"("id"),
  "reason" TEXT,
  "before" JSONB,
  "after" JSONB,
  "versionAfter" INTEGER NOT NULL,
  "requestId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "case_rev_case_seq" ON "case_revisions" ("caseId", "seq");
CREATE INDEX IF NOT EXISTS "case_rev_org_created" ON "case_revisions" ("organizationId", "createdAt");

-- 22. expense_heads
CREATE TABLE IF NOT EXISTS "expense_heads" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "name" VARCHAR(100) NOT NULL,
  "nameKey" VARCHAR(100) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "nameKey")
);
CREATE INDEX IF NOT EXISTS "expense_heads_org_active" ON "expense_heads" ("organizationId", "isActive");

-- 23. incomes
CREATE TABLE IF NOT EXISTS "incomes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "amount" NUMERIC(18, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "date" DATE NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "reference" VARCHAR(200),
  "description" TEXT,
  "relatedCaseId" UUID REFERENCES "cases"("id"),
  "status" "FinanceStatus" NOT NULL DEFAULT 'ACTIVE',
  "voidReason" TEXT,
  "voidedAt" TIMESTAMPTZ(6),
  "voidedById" UUID REFERENCES "users"("id"),
  "createdById" UUID NOT NULL REFERENCES "users"("id"),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "incomes_amount_positive" CHECK ("amount" > 0)
);
CREATE INDEX IF NOT EXISTS "incomes_org_date" ON "incomes" ("organizationId", "date");
CREATE INDEX IF NOT EXISTS "incomes_org_status_date" ON "incomes" ("organizationId", "status", "date");
CREATE INDEX IF NOT EXISTS "incomes_org_case" ON "incomes" ("organizationId", "relatedCaseId");

-- 24. expenses
CREATE TABLE IF NOT EXISTS "expenses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "expenseHeadId" UUID NOT NULL REFERENCES "expense_heads"("id"),
  "amount" NUMERIC(18, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "date" DATE NOT NULL,
  "payee" VARCHAR(200),
  "reference" VARCHAR(200),
  "description" TEXT,
  "status" "FinanceStatus" NOT NULL DEFAULT 'ACTIVE',
  "voidReason" TEXT,
  "voidedAt" TIMESTAMPTZ(6),
  "voidedById" UUID REFERENCES "users"("id"),
  "createdById" UUID NOT NULL REFERENCES "users"("id"),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "expenses_amount_positive" CHECK ("amount" > 0)
);
CREATE INDEX IF NOT EXISTS "expenses_org_date" ON "expenses" ("organizationId", "date");
CREATE INDEX IF NOT EXISTS "expenses_org_status_date" ON "expenses" ("organizationId", "status", "date");
CREATE INDEX IF NOT EXISTS "expenses_org_head" ON "expenses" ("organizationId", "expenseHeadId");

-- 25. payments
CREATE TABLE IF NOT EXISTS "payments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "incomeId" UUID REFERENCES "incomes"("id"),
  "expenseId" UUID REFERENCES "expenses"("id"),
  "method" VARCHAR(50) NOT NULL,
  "amount" NUMERIC(18, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "paidAt" TIMESTAMPTZ(6) NOT NULL,
  "integrationId" UUID,
  "externalId" VARCHAR(200),
  "createdById" UUID REFERENCES "users"("id"),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "integrationId", "externalId")
);
CREATE INDEX IF NOT EXISTS "payments_org_paid" ON "payments" ("organizationId", "paidAt");

-- 26. financial_transactions
CREATE TABLE IF NOT EXISTS "financial_transactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "type" "FinancialTransactionType" NOT NULL,
  "incomeId" UUID UNIQUE REFERENCES "incomes"("id"),
  "expenseId" UUID UNIQUE REFERENCES "expenses"("id"),
  "date" DATE NOT NULL,
  "amount" NUMERIC(18, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "reference" VARCHAR(200),
  "status" "FinanceStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "fin_tx_org_date" ON "financial_transactions" ("organizationId", "date");
CREATE INDEX IF NOT EXISTS "fin_tx_org_type_date" ON "financial_transactions" ("organizationId", "type", "date");

-- 27. attachments
CREATE TABLE IF NOT EXISTS "attachments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "uploadedById" UUID NOT NULL REFERENCES "users"("id"),
  "storageKey" VARCHAR(300) NOT NULL UNIQUE,
  "fileName" VARCHAR(200) NOT NULL,
  "mimeType" VARCHAR(100) NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "status" "AttachmentStatus" NOT NULL DEFAULT 'PENDING',
  "entityType" VARCHAR(50),
  "entityId" UUID,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "availableAt" TIMESTAMPTZ(6)
);
CREATE INDEX IF NOT EXISTS "attachments_org_uploader" ON "attachments" ("organizationId", "uploadedById");
CREATE INDEX IF NOT EXISTS "attachments_org_entity" ON "attachments" ("organizationId", "entityType", "entityId");

-- 28. attachment_access_logs
CREATE TABLE IF NOT EXISTS "attachment_access_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "attachmentId" UUID NOT NULL REFERENCES "attachments"("id"),
  "userId" UUID NOT NULL REFERENCES "users"("id"),
  "action" VARCHAR(40) NOT NULL,
  "requestId" VARCHAR(100),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "att_logs_org_att" ON "attachment_access_logs" ("organizationId", "attachmentId");
CREATE INDEX IF NOT EXISTS "att_logs_org_user_time" ON "attachment_access_logs" ("organizationId", "userId", "createdAt");

-- 29. notifications
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "userId" UUID NOT NULL REFERENCES "users"("id"),
  "type" VARCHAR(60) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "body" TEXT NOT NULL,
  "data" JSONB,
  "readAt" TIMESTAMPTZ(6),
  "emailStatus" "NotificationEmailStatus" NOT NULL DEFAULT 'NONE',
  "emailAttempts" INTEGER NOT NULL DEFAULT 0,
  "emailError" VARCHAR(500),
  "emailSentAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "notif_org_user_read" ON "notifications" ("organizationId", "userId", "readAt");
CREATE INDEX IF NOT EXISTS "notif_org_user_created" ON "notifications" ("organizationId", "userId", "createdAt");

-- 30. integrations
CREATE TABLE IF NOT EXISTS "integrations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "provider" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
  "secretRef" VARCHAR(100) NOT NULL,
  "config" JSONB,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  UNIQUE ("organizationId", "provider", "name")
);

-- 31. integration_requests
CREATE TABLE IF NOT EXISTS "integration_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "integrationId" UUID NOT NULL REFERENCES "integrations"("id"),
  "operation" VARCHAR(100) NOT NULL,
  "idempotencyKey" VARCHAR(200) NOT NULL,
  "status" "IntegrationRequestStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "requestPayload" JSONB NOT NULL,
  "responsePayload" JSONB,
  "httpStatus" INTEGER,
  "externalId" VARCHAR(200),
  "lastError" VARCHAR(500),
  "nextRetryAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "completedAt" TIMESTAMPTZ(6),
  UNIQUE ("integrationId", "idempotencyKey")
);
CREATE INDEX IF NOT EXISTS "int_req_org_status" ON "integration_requests" ("organizationId", "status");
CREATE INDEX IF NOT EXISTS "int_req_status_retry" ON "integration_requests" ("status", "nextRetryAt");

-- 32. webhook_events
CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "integrationId" UUID NOT NULL REFERENCES "integrations"("id"),
  "eventId" VARCHAR(200) NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "signatureTimestamp" TIMESTAMPTZ(6) NOT NULL,
  "payload" JSONB NOT NULL,
  "error" VARCHAR(500),
  "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "processedAt" TIMESTAMPTZ(6),
  UNIQUE ("integrationId", "eventId")
);
CREATE INDEX IF NOT EXISTS "wh_events_org_status" ON "webhook_events" ("organizationId", "status");

-- 33. report_exports
CREATE TABLE IF NOT EXISTS "report_exports" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL REFERENCES "organizations"("id"),
  "requestedById" UUID NOT NULL REFERENCES "users"("id"),
  "reportType" "ExportReportType" NOT NULL,
  "format" "ExportFormat" NOT NULL,
  "status" "ExportStatus" NOT NULL DEFAULT 'QUEUED',
  "filters" JSONB NOT NULL,
  "storageKey" TEXT,
  "rowCount" INTEGER,
  "fileSizeBytes" INTEGER,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "startedAt" TIMESTAMPTZ,
  "finishedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "rep_exp_org_user_created" ON "report_exports" ("organizationId", "requestedById", "createdAt");
CREATE INDEX IF NOT EXISTS "rep_exp_org_status" ON "report_exports" ("organizationId", "status");

-- 34. rate_limit_windows (Serverless Edge Function Atomic Rate Limiting)
CREATE TABLE IF NOT EXISTS "rate_limit_windows" (
  "key" TEXT PRIMARY KEY,
  "window_start" TIMESTAMPTZ NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0
);

-- Atomic Rate Limit increment function
CREATE OR REPLACE FUNCTION increment_rate_limit(p_key TEXT, p_window_start TIMESTAMPTZ, p_limit INT)
RETURNS INT LANGUAGE sql AS $$
  INSERT INTO rate_limit_windows(key, window_start, count)
  VALUES (p_key, p_window_start, 1)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE WHEN rate_limit_windows.window_start = p_window_start
                     THEN rate_limit_windows.count + 1
                     ELSE 1 END,
        window_start = p_window_start
  RETURNING count;
$$;

-- ==============================================================================
-- Triggers and Functions (Protection & Immutability)
-- ==============================================================================

-- 1. Primary Super Admin protection trigger
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

DROP TRIGGER IF EXISTS trg_guard_psa ON users;
CREATE TRIGGER trg_guard_psa BEFORE INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION guard_primary_super_admin();

-- 2. Per-user permission / menu overrides on the Primary Super Admin are forbidden
CREATE OR REPLACE FUNCTION guard_psa_overrides() RETURNS trigger AS $$
DECLARE uid uuid;
BEGIN
  uid := CASE WHEN TG_OP = 'DELETE' THEN OLD."userId" ELSE NEW."userId" END;
  IF EXISTS (SELECT 1 FROM users WHERE id = uid AND "isPrimarySuperAdmin") THEN
    RAISE EXCEPTION 'PROTECTED_USER: overrides on the Primary Super Admin are not allowed' USING ERRCODE = '42501';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_psa_perm ON user_permissions;
CREATE TRIGGER trg_guard_psa_perm BEFORE INSERT OR UPDATE OR DELETE ON user_permissions FOR EACH ROW EXECUTE FUNCTION guard_psa_overrides();

DROP TRIGGER IF EXISTS trg_guard_psa_menu ON user_menus;
CREATE TRIGGER trg_guard_psa_menu BEFORE INSERT OR UPDATE OR DELETE ON user_menus FOR EACH ROW EXECUTE FUNCTION guard_psa_overrides();

-- 3. Audit evidence is append-only: never updated, deleted or truncated
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'APPEND_ONLY: % on % is not allowed', TG_OP, TG_TABLE_NAME USING ERRCODE = '42501';
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_immutable ON audit_logs;
CREATE TRIGGER trg_audit_immutable BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

DROP TRIGGER IF EXISTS trg_audit_no_truncate ON audit_logs;
CREATE TRIGGER trg_audit_no_truncate BEFORE TRUNCATE ON audit_logs FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();

DROP TRIGGER IF EXISTS trg_secevent_immutable ON security_events;
CREATE TRIGGER trg_secevent_immutable BEFORE UPDATE OR DELETE ON security_events FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

DROP TRIGGER IF EXISTS trg_workflow_transitions_immutable ON workflow_transitions;
CREATE TRIGGER trg_workflow_transitions_immutable BEFORE UPDATE OR DELETE ON workflow_transitions FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

DROP TRIGGER IF EXISTS trg_accept_reject_actions_immutable ON accept_reject_actions;
CREATE TRIGGER trg_accept_reject_actions_immutable BEFORE UPDATE OR DELETE ON accept_reject_actions FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

DROP TRIGGER IF EXISTS trg_case_revisions_immutable ON case_revisions;
CREATE TRIGGER trg_case_revisions_immutable BEFORE UPDATE OR DELETE ON case_revisions FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

DROP TRIGGER IF EXISTS trg_financial_transactions_immutable ON financial_transactions;
CREATE TRIGGER trg_financial_transactions_immutable BEFORE UPDATE OR DELETE ON financial_transactions FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

DROP TRIGGER IF EXISTS trg_attachment_access_logs_immutable ON attachment_access_logs;
CREATE TRIGGER trg_attachment_access_logs_immutable BEFORE UPDATE OR DELETE ON attachment_access_logs FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- ==============================================================================
-- Row Level Security (RLS)
-- ==============================================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','audit_logs','security_events','system_settings',
    'customers','cases','call_records','case_assignments',
    'workflow_transitions','accept_reject_actions','case_revisions',
    'expense_heads','incomes','expenses','payments','financial_transactions',
    'attachments','attachment_access_logs','notifications',
    'integrations','integration_requests','webhook_events','report_exports'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($p$CREATE POLICY tenant_isolation ON %I USING (
        coalesce(current_setting('app.rls_bypass', true), '') = 'on'
        OR "organizationId"::text = current_setting('app.current_org', true)
        OR (auth.jwt() -> 'app_metadata' ->> 'organization_id')::text = "organizationId"::text
      ) WITH CHECK (
        coalesce(current_setting('app.rls_bypass', true), '') = 'on'
        OR "organizationId"::text = current_setting('app.current_org', true)
        OR (auth.jwt() -> 'app_metadata' ->> 'organization_id')::text = "organizationId"::text
      )$p$, t);
  END LOOP;
END $$;
`;

const root = resolve('.');
writeFileSync(resolve(root, 'prisma/migrations/20241006000000_init/migration.sql'), sql, 'utf8');
writeFileSync(resolve(root, 'supabase/migrations/20241006000000_init.sql'), sql, 'utf8');
console.log('Successfully wrote migration files!');
