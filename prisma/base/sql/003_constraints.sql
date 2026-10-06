-- Merge constraints: foreign keys that the Prisma fragments leave as plain UUID columns, CHECKs, append-only triggers, trigram index.
-- Idempotent. Statements are separated by lines containing only "-- @@". Runs after 001/002 (needs forbid_mutation()).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_customers_organizationId') THEN
    ALTER TABLE "customers" ADD CONSTRAINT "fk_customers_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_customers_createdById') THEN
    ALTER TABLE "customers" ADD CONSTRAINT "fk_customers_createdById" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cases_organizationId') THEN
    ALTER TABLE "cases" ADD CONSTRAINT "fk_cases_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cases_customerId') THEN
    ALTER TABLE "cases" ADD CONSTRAINT "fk_cases_customerId" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cases_agentId') THEN
    ALTER TABLE "cases" ADD CONSTRAINT "fk_cases_agentId" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cases_teamLeaderId') THEN
    ALTER TABLE "cases" ADD CONSTRAINT "fk_cases_teamLeaderId" FOREIGN KEY ("teamLeaderId") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cases_processedById') THEN
    ALTER TABLE "cases" ADD CONSTRAINT "fk_cases_processedById" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_call_records_organizationId') THEN
    ALTER TABLE "call_records" ADD CONSTRAINT "fk_call_records_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_call_records_caseId') THEN
    ALTER TABLE "call_records" ADD CONSTRAINT "fk_call_records_caseId" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_call_records_setById') THEN
    ALTER TABLE "call_records" ADD CONSTRAINT "fk_call_records_setById" FOREIGN KEY ("setById") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_case_assignments_organizationId') THEN
    ALTER TABLE "case_assignments" ADD CONSTRAINT "fk_case_assignments_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_case_assignments_caseId') THEN
    ALTER TABLE "case_assignments" ADD CONSTRAINT "fk_case_assignments_caseId" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_case_assignments_userId') THEN
    ALTER TABLE "case_assignments" ADD CONSTRAINT "fk_case_assignments_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_case_assignments_assignedById') THEN
    ALTER TABLE "case_assignments" ADD CONSTRAINT "fk_case_assignments_assignedById" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_transitions_organizationId') THEN
    ALTER TABLE "workflow_transitions" ADD CONSTRAINT "fk_workflow_transitions_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_transitions_caseId') THEN
    ALTER TABLE "workflow_transitions" ADD CONSTRAINT "fk_workflow_transitions_caseId" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workflow_transitions_actorId') THEN
    ALTER TABLE "workflow_transitions" ADD CONSTRAINT "fk_workflow_transitions_actorId" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_accept_reject_actions_organizationId') THEN
    ALTER TABLE "accept_reject_actions" ADD CONSTRAINT "fk_accept_reject_actions_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_accept_reject_actions_caseId') THEN
    ALTER TABLE "accept_reject_actions" ADD CONSTRAINT "fk_accept_reject_actions_caseId" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_accept_reject_actions_actorId') THEN
    ALTER TABLE "accept_reject_actions" ADD CONSTRAINT "fk_accept_reject_actions_actorId" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_case_revisions_organizationId') THEN
    ALTER TABLE "case_revisions" ADD CONSTRAINT "fk_case_revisions_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_case_revisions_caseId') THEN
    ALTER TABLE "case_revisions" ADD CONSTRAINT "fk_case_revisions_caseId" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_case_revisions_actorId') THEN
    ALTER TABLE "case_revisions" ADD CONSTRAINT "fk_case_revisions_actorId" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expense_heads_organizationId') THEN
    ALTER TABLE "expense_heads" ADD CONSTRAINT "fk_expense_heads_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_incomes_organizationId') THEN
    ALTER TABLE "incomes" ADD CONSTRAINT "fk_incomes_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_incomes_relatedCaseId') THEN
    ALTER TABLE "incomes" ADD CONSTRAINT "fk_incomes_relatedCaseId" FOREIGN KEY ("relatedCaseId") REFERENCES "cases"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_incomes_voidedById') THEN
    ALTER TABLE "incomes" ADD CONSTRAINT "fk_incomes_voidedById" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_incomes_createdById') THEN
    ALTER TABLE "incomes" ADD CONSTRAINT "fk_incomes_createdById" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_organizationId') THEN
    ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_expenseHeadId') THEN
    ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_expenseHeadId" FOREIGN KEY ("expenseHeadId") REFERENCES "expense_heads"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_voidedById') THEN
    ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_voidedById" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_expenses_createdById') THEN
    ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_createdById" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_organizationId') THEN
    ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_incomeId') THEN
    ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_incomeId" FOREIGN KEY ("incomeId") REFERENCES "incomes"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_expenseId') THEN
    ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_expenseId" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_integrationId') THEN
    ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_integrationId" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_createdById') THEN
    ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_createdById" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_financial_transactions_organizationId') THEN
    ALTER TABLE "financial_transactions" ADD CONSTRAINT "fk_financial_transactions_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_financial_transactions_incomeId') THEN
    ALTER TABLE "financial_transactions" ADD CONSTRAINT "fk_financial_transactions_incomeId" FOREIGN KEY ("incomeId") REFERENCES "incomes"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_financial_transactions_expenseId') THEN
    ALTER TABLE "financial_transactions" ADD CONSTRAINT "fk_financial_transactions_expenseId" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attachments_organizationId') THEN
    ALTER TABLE "attachments" ADD CONSTRAINT "fk_attachments_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attachments_uploadedById') THEN
    ALTER TABLE "attachments" ADD CONSTRAINT "fk_attachments_uploadedById" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attachment_access_logs_organizationId') THEN
    ALTER TABLE "attachment_access_logs" ADD CONSTRAINT "fk_attachment_access_logs_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attachment_access_logs_attachmentId') THEN
    ALTER TABLE "attachment_access_logs" ADD CONSTRAINT "fk_attachment_access_logs_attachmentId" FOREIGN KEY ("attachmentId") REFERENCES "attachments"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attachment_access_logs_userId') THEN
    ALTER TABLE "attachment_access_logs" ADD CONSTRAINT "fk_attachment_access_logs_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_organizationId') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_userId') THEN
    ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_integrations_organizationId') THEN
    ALTER TABLE "integrations" ADD CONSTRAINT "fk_integrations_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_integration_requests_organizationId') THEN
    ALTER TABLE "integration_requests" ADD CONSTRAINT "fk_integration_requests_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_integration_requests_integrationId') THEN
    ALTER TABLE "integration_requests" ADD CONSTRAINT "fk_integration_requests_integrationId" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_webhook_events_organizationId') THEN
    ALTER TABLE "webhook_events" ADD CONSTRAINT "fk_webhook_events_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_webhook_events_integrationId') THEN
    ALTER TABLE "webhook_events" ADD CONSTRAINT "fk_webhook_events_integrationId" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_report_exports_organizationId') THEN
    ALTER TABLE "report_exports" ADD CONSTRAINT "fk_report_exports_organizationId" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_report_exports_requestedById') THEN
    ALTER TABLE "report_exports" ADD CONSTRAINT "fk_report_exports_requestedById" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT;
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'incomes_amount_positive') THEN
    ALTER TABLE "incomes" ADD CONSTRAINT "incomes_amount_positive" CHECK ("amount" > 0);
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_amount_positive') THEN
    ALTER TABLE "expenses" ADD CONSTRAINT "expenses_amount_positive" CHECK ("amount" > 0);
  END IF;
END $$;
-- @@
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'call_records_duration_nonneg') THEN
    ALTER TABLE "call_records" ADD CONSTRAINT "call_records_duration_nonneg" CHECK ("durationSeconds" >= 0);
  END IF;
END $$;
-- @@
DROP TRIGGER IF EXISTS trg_workflow_transitions_immutable ON "workflow_transitions";
-- @@
CREATE TRIGGER trg_workflow_transitions_immutable BEFORE UPDATE OR DELETE ON "workflow_transitions" FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
-- @@
DROP TRIGGER IF EXISTS trg_accept_reject_actions_immutable ON "accept_reject_actions";
-- @@
CREATE TRIGGER trg_accept_reject_actions_immutable BEFORE UPDATE OR DELETE ON "accept_reject_actions" FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
-- @@
DROP TRIGGER IF EXISTS trg_case_revisions_immutable ON "case_revisions";
-- @@
CREATE TRIGGER trg_case_revisions_immutable BEFORE UPDATE OR DELETE ON "case_revisions" FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
-- @@
DROP TRIGGER IF EXISTS trg_financial_transactions_immutable ON "financial_transactions";
-- @@
CREATE TRIGGER trg_financial_transactions_immutable BEFORE UPDATE OR DELETE ON "financial_transactions" FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
-- @@
DROP TRIGGER IF EXISTS trg_attachment_access_logs_immutable ON "attachment_access_logs";
-- @@
CREATE TRIGGER trg_attachment_access_logs_immutable BEFORE UPDATE OR DELETE ON "attachment_access_logs" FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
-- @@
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- @@
CREATE INDEX IF NOT EXISTS customers_phone_trgm ON "customers" USING gin ("phone" gin_trgm_ops);
