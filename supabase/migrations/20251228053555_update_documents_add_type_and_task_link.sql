/*
  # Update Documents Table

  1. Changes
    - Add `document_type` column (хариутай/хариугүй)
    - Add `linked_task_id` to track created tasks

  2. Notes
    - Default type is 'хариугүй' (no response required)
    - linked_task_id is nullable
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'document_type'
  ) THEN
    ALTER TABLE documents ADD COLUMN document_type text DEFAULT 'хариугүй' CHECK (document_type IN ('хариутай', 'хариугүй'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'linked_task_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN linked_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
  END IF;
END $$;
