/*
  # Add recurring task support

  1. Changes to tasks table
    - Add `recurrence_type` (text) - Type of recurrence: 'Нэг удаагийн', '7 хоног бүр', 'Сар бүр', 'Улирал бүр', 'Жил бүр'
    - Add `is_recurring` (boolean) - Whether this task is a recurring task
    - Add `parent_task_id` (uuid) - Reference to the original recurring task
    - Add `recurrence_data` (jsonb) - Store additional recurrence metadata (day of week, day of month, etc.)

  2. Notes
    - Default recurrence_type is 'Нэг удаагийн' for backward compatibility
    - parent_task_id links generated tasks to their source
*/

DO $$
BEGIN
  -- Add recurrence_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'recurrence_type'
  ) THEN
    ALTER TABLE tasks ADD COLUMN recurrence_type text DEFAULT 'Нэг удаагийн';
  END IF;

  -- Add is_recurring column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'is_recurring'
  ) THEN
    ALTER TABLE tasks ADD COLUMN is_recurring boolean DEFAULT false;
  END IF;

  -- Add parent_task_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'parent_task_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;

  -- Add recurrence_data column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'recurrence_data'
  ) THEN
    ALTER TABLE tasks ADD COLUMN recurrence_data jsonb;
  END IF;
END $$;