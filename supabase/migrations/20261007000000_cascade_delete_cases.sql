-- Migration: Add ON DELETE CASCADE to foreign keys referencing customers and cases
-- This allows deleting a customer without violating foreign key constraints.

-- 1. cases -> customers (deleting customer deletes associated case)
ALTER TABLE IF EXISTS "cases" DROP CONSTRAINT IF EXISTS "cases_customerId_fkey";
ALTER TABLE IF EXISTS "cases" DROP CONSTRAINT IF EXISTS "fk_cases_customerId";
ALTER TABLE IF EXISTS "cases" ADD CONSTRAINT "cases_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE;

-- 2. call_records -> cases (deleting case deletes call record)
ALTER TABLE IF EXISTS "call_records" DROP CONSTRAINT IF EXISTS "call_records_caseId_fkey";
ALTER TABLE IF EXISTS "call_records" DROP CONSTRAINT IF EXISTS "fk_call_records_caseId";
ALTER TABLE IF EXISTS "call_records" ADD CONSTRAINT "call_records_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE;

-- 3. case_assignments -> cases (deleting case deletes assignments)
ALTER TABLE IF EXISTS "case_assignments" DROP CONSTRAINT IF EXISTS "case_assignments_caseId_fkey";
ALTER TABLE IF EXISTS "case_assignments" DROP CONSTRAINT IF EXISTS "fk_case_assignments_caseId";
ALTER TABLE IF EXISTS "case_assignments" ADD CONSTRAINT "case_assignments_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE;

-- 4. workflow_transitions -> cases (deleting case deletes history transitions)
ALTER TABLE IF EXISTS "workflow_transitions" DROP CONSTRAINT IF EXISTS "workflow_transitions_caseId_fkey";
ALTER TABLE IF EXISTS "workflow_transitions" DROP CONSTRAINT IF EXISTS "fk_workflow_transitions_caseId";
ALTER TABLE IF EXISTS "workflow_transitions" ADD CONSTRAINT "workflow_transitions_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE;

-- 5. accept_reject_actions -> cases (deleting case deletes decisions)
ALTER TABLE IF EXISTS "accept_reject_actions" DROP CONSTRAINT IF EXISTS "accept_reject_actions_caseId_fkey";
ALTER TABLE IF EXISTS "accept_reject_actions" DROP CONSTRAINT IF EXISTS "fk_accept_reject_actions_caseId";
ALTER TABLE IF EXISTS "accept_reject_actions" ADD CONSTRAINT "accept_reject_actions_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE;

-- 6. case_revisions -> cases (deleting case deletes revisions)
ALTER TABLE IF EXISTS "case_revisions" DROP CONSTRAINT IF EXISTS "case_revisions_caseId_fkey";
ALTER TABLE IF EXISTS "case_revisions" DROP CONSTRAINT IF EXISTS "fk_case_revisions_caseId";
ALTER TABLE IF EXISTS "case_revisions" ADD CONSTRAINT "case_revisions_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE;

-- 7. incomes -> cases (deleting case retains income record but clears case reference)
ALTER TABLE IF EXISTS "incomes" DROP CONSTRAINT IF EXISTS "incomes_relatedCaseId_fkey";
ALTER TABLE IF EXISTS "incomes" DROP CONSTRAINT IF EXISTS "fk_incomes_relatedCaseId";
ALTER TABLE IF EXISTS "incomes" ADD CONSTRAINT "incomes_relatedCaseId_fkey"
  FOREIGN KEY ("relatedCaseId") REFERENCES "cases"("id") ON DELETE SET NULL;
