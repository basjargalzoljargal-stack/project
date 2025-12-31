/*
  # Rename date_time to due_date for clarity

  1. Changes
    - Rename the `date_time` column to `due_date` in the tasks table
    - This clarifies that the column represents when the task is due, not when it was created
    - The `created_at` column already tracks task creation time

  2. Notes
    - This is a non-destructive change that preserves all existing data
    - All existing tasks will have their due dates preserved
    - Indexes on the column are automatically updated
*/

ALTER TABLE tasks
RENAME COLUMN date_time TO due_date;