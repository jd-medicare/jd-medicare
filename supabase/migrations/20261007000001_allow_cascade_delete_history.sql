-- Migration: Allow cascade deletion of case history while preserving append-only immutability for UPDATEs.
-- workflow_transitions, accept_reject_actions, and case_revisions cannot be edited (UPDATE is forbidden),
-- but can be cascade-deleted when their parent case/customer is deleted.

DROP TRIGGER IF EXISTS trg_workflow_transitions_immutable ON workflow_transitions;
CREATE TRIGGER trg_workflow_transitions_immutable 
  BEFORE UPDATE ON workflow_transitions 
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

DROP TRIGGER IF EXISTS trg_accept_reject_actions_immutable ON accept_reject_actions;
CREATE TRIGGER trg_accept_reject_actions_immutable 
  BEFORE UPDATE ON accept_reject_actions 
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

DROP TRIGGER IF EXISTS trg_case_revisions_immutable ON case_revisions;
CREATE TRIGGER trg_case_revisions_immutable 
  BEFORE UPDATE ON case_revisions 
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
