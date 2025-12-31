/*
  # Create Subtasks Table

  1. New Tables
    - `subtasks`
      - `id` (uuid, primary key)
      - `parent_task_id` (uuid, foreign key to tasks)
      - `title` (text)
      - `description` (text, optional)
      - `assigned_type` (user/department/mixed)
      - `assigned_user_ids` (uuid array)
      - `assigned_department_ids` (uuid array)
      - `deadline` (timestamptz)
      - `priority` (high/medium/low)
      - `status` (pending/in_progress/completed)
      - `completion_id` (uuid, links to completions)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `created_by` (uuid, foreign key to users)

  2. Security
    - Enable RLS on `subtasks` table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_task_id uuid REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  assigned_type text DEFAULT 'user' CHECK (assigned_type IN ('user', 'department', 'mixed')),
  assigned_user_ids uuid[],
  assigned_department_ids uuid[],
  deadline timestamptz NOT NULL,
  priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completion_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subtasks assigned to them"
  ON subtasks FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by OR
    auth.uid() = ANY(assigned_user_ids) OR
    EXISTS (
      SELECT 1 FROM user_departments
      WHERE user_departments.user_id = auth.uid()
      AND user_departments.department_id = ANY(subtasks.assigned_department_ids)
    )
  );

CREATE POLICY "Admins and managers can insert subtasks"
  ON subtasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Assigned users can update their subtasks"
  ON subtasks FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = ANY(assigned_user_ids) OR
    EXISTS (
      SELECT 1 FROM user_departments
      WHERE user_departments.user_id = auth.uid()
      AND user_departments.department_id = ANY(subtasks.assigned_department_ids)
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can delete subtasks"
  ON subtasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_subtasks_parent_task_id ON subtasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_user_ids ON subtasks USING GIN(assigned_user_ids);
CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_department_ids ON subtasks USING GIN(assigned_department_ids);
CREATE INDEX IF NOT EXISTS idx_subtasks_deadline ON subtasks(deadline);
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON subtasks(status);
