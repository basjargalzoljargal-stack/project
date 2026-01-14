/*
  # Create Task Assignments Tables

  1. New Tables
    - `task_assignments`
      - `id` (uuid, primary key)
      - `task_id` (uuid, required) - References tasks
      - `user_id` (uuid, required) - References user_profiles
      - `assigned_by` (uuid, required) - References user_profiles (who assigned)
      - `is_primary` (boolean) - Is this the primary assignee
      - `assignment_type` (text) - individual/department/mixed
      - `department_id` (uuid) - References departments (for dept assignments)
      - `status` (text) - pending/accepted/in_progress/completed/declined
      - `priority` (text) - high/medium/low
      - `deadline` (timestamptz) - Assignment deadline
      - `notes` (text) - Additional assignment notes
      - `notified` (boolean) - Was notification sent
      - `accepted_at` (timestamptz) - When accepted
      - `completed_at` (timestamptz) - When completed
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `assignment_notifications`
      - `id` (uuid, primary key)
      - `assignment_id` (uuid, required) - References task_assignments
      - `user_id` (uuid, required) - References user_profiles
      - `notification_type` (text) - email/in_app/both
      - `subject` (text) - Notification subject
      - `message` (text) - Notification message
      - `is_read` (boolean) - Has user read notification
      - `sent_at` (timestamptz) - When notification was sent
      - `read_at` (timestamptz) - When notification was read
      - `created_at` (timestamptz) - Creation timestamp
  
  2. Security
    - Enable RLS on all tables
    - Add policies for users to view their own assignments
    - Add policies for admins/managers to manage all assignments
*/

CREATE TABLE IF NOT EXISTS task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  assignment_type text NOT NULL DEFAULT 'individual',
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  deadline timestamptz,
  notes text DEFAULT '',
  notified boolean DEFAULT false,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_assignment_type CHECK (assignment_type IN ('individual', 'department', 'mixed')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'declined')),
  CONSTRAINT valid_priority CHECK (priority IN ('high', 'medium', 'low'))
);

CREATE TABLE IF NOT EXISTS assignment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL DEFAULT 'in_app',
  subject text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  sent_at timestamptz DEFAULT now(),
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_notification_type CHECK (notification_type IN ('email', 'in_app', 'both'))
);

ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assignments"
  ON task_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users who assigned can view their assignments"
  ON task_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = assigned_by);

CREATE POLICY "Admins and managers can view all assignments"
  ON task_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can create assignments"
  ON task_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can update their own assignment status"
  ON task_assignments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and managers can update all assignments"
  ON task_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can delete assignments"
  ON task_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can view their own notifications"
  ON assignment_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can view all notifications"
  ON assignment_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can create notifications"
  ON assignment_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can update their own notifications"
  ON assignment_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user ON task_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_by ON task_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_task_assignments_department ON task_assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON task_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignment_notifications_assignment ON assignment_notifications(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_notifications_user ON assignment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_notifications_read ON assignment_notifications(is_read);
