/*
  # Update Task Completions for Subtask Linking

  1. Changes
    - Add `subtask_id` to link completions to subtasks
    - Add `task_id` for parent task reference
    - Add `document_id` for original document reference

  2. Notes
    - Completions now link to subtasks instead of tasks directly
    - Keep parent references for easy filtering and reporting
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_completions' AND column_name = 'subtask_id'
  ) THEN
    ALTER TABLE task_completions ADD COLUMN subtask_id uuid REFERENCES subtasks(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_completions' AND column_name = 'task_id'
  ) THEN
    ALTER TABLE task_completions ADD COLUMN task_id uuid REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'task_completions' AND column_name = 'document_id'
  ) THEN
    ALTER TABLE task_completions ADD COLUMN document_id uuid REFERENCES documents(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_task_completions_subtask_id ON task_completions(subtask_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_id ON task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_document_id ON task_completions(document_id);
