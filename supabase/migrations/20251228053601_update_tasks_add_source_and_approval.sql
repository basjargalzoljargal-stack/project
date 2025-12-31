/*
  # Update Tasks Table for Simplified Workflow

  1. Changes
    - Add `source_type` (document/manual)
    - Add `source_document_id` to link back to documents
    - Update `status` to include approval states
    - Add `approved_by` and `approved_at`
    - Add `signed_file_url` for approved documents
    - Add `start_date` and `end_date` for planning

  2. Notes
    - Tasks can be created from documents or manually
    - Status flow: draft → pending_approval → approved → in_progress → completed
    - Only admins/managers can approve
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE tasks ADD COLUMN source_type text DEFAULT 'manual' CHECK (source_type IN ('document', 'manual'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'source_document_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN source_document_id uuid REFERENCES documents(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'status'
  ) THEN
    ALTER TABLE tasks ADD COLUMN status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'in_progress', 'completed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE tasks ADD COLUMN approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'signed_file_url'
  ) THEN
    ALTER TABLE tasks ADD COLUMN signed_file_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE tasks ADD COLUMN start_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE tasks ADD COLUMN end_date timestamptz;
  END IF;
END $$;
