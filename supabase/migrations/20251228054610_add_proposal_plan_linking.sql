/*
  # Add Proposal-Plan Linking

  1. Changes
    - Add `linked_plan_id` to proposals table for tracking created plans
    - Add `source_proposal_id` to tasks table for tracking source proposal
    - Add indexes for efficient lookups

  2. Notes
    - When a proposal is approved, it can optionally create a plan
    - Plans created from proposals link back to the source proposal
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'proposals' AND column_name = 'linked_plan_id'
  ) THEN
    ALTER TABLE proposals ADD COLUMN linked_plan_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'source_proposal_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN source_proposal_id uuid REFERENCES proposals(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proposals_linked_plan_id ON proposals(linked_plan_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source_proposal_id ON tasks(source_proposal_id);
