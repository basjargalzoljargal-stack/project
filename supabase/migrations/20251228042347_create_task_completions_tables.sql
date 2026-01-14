/*
  # Create Task Completions Tables

  1. New Tables
    - `task_completions`
      - `id` (uuid, primary key)
      - `assignment_id` (uuid, required) - References task_assignments
      - `user_id` (uuid, required) - References user_profiles
      - `progress_percentage` (integer) - 0-100
      - `is_fully_completed` (boolean) - Completion checkbox status
      - `work_description` (text) - What was done (rich text HTML)
      - `challenges` (text) - Issues encountered
      - `next_steps` (text) - What needs to be done next
      - `status` (text) - draft/submitted/under_review/approved/revision_requested/rejected
      - `submitted_at` (timestamptz) - When submitted
      - `reviewed_at` (timestamptz) - When reviewed
      - `reviewed_by` (uuid) - References user_profiles (reviewer)
      - `reviewer_comment` (text) - Admin/manager feedback
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `completion_files`
      - `id` (uuid, primary key)
      - `completion_id` (uuid, required) - References task_completions
      - `file_name` (text, required) - Original file name
      - `file_path` (text, required) - Storage path
      - `file_type` (text, required) - MIME type
      - `file_size` (bigint, required) - Size in bytes
      - `file_category` (text) - before_after/report/screenshot/video/other
      - `uploaded_at` (timestamptz) - Upload timestamp
      - `created_at` (timestamptz) - Creation timestamp
  
  2. Storage Setup
    - Create 'task-completions' bucket for file uploads
    - Enable public access for file downloads
    - Set file size limits and allowed types
  
  3. Security
    - Enable RLS on all tables
    - Users can create/update their own completions
    - Users can upload files to their own completions
    - Admins/managers can view all completions and files
    - Admins/managers can review and comment
*/

CREATE TABLE IF NOT EXISTS task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  progress_percentage integer NOT NULL DEFAULT 0,
  is_fully_completed boolean DEFAULT false,
  work_description text NOT NULL DEFAULT '',
  challenges text DEFAULT '',
  next_steps text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewer_comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'revision_requested', 'rejected'))
);

CREATE TABLE IF NOT EXISTS completion_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  completion_id uuid NOT NULL REFERENCES task_completions(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  file_category text DEFAULT 'other',
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_file_category CHECK (file_category IN ('before_after', 'report', 'screenshot', 'video', 'other'))
);

ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE completion_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own completions"
  ON task_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can view all completions"
  ON task_completions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can create their own completions"
  ON task_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft completions"
  ON task_completions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'draft')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own submitted completions for revision"
  ON task_completions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'revision_requested')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and managers can update all completions"
  ON task_completions FOR UPDATE
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

CREATE POLICY "Users can delete their own draft completions"
  ON task_completions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'draft');

CREATE POLICY "Users can view files of their own completions"
  ON completion_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_completions
      WHERE task_completions.id = completion_files.completion_id
      AND task_completions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can view all completion files"
  ON completion_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can upload files to their own completions"
  ON completion_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM task_completions
      WHERE task_completions.id = completion_files.completion_id
      AND task_completions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete files from their own draft completions"
  ON completion_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM task_completions
      WHERE task_completions.id = completion_files.completion_id
      AND task_completions.user_id = auth.uid()
      AND task_completions.status IN ('draft', 'revision_requested')
    )
  );

CREATE INDEX IF NOT EXISTS idx_task_completions_assignment ON task_completions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_status ON task_completions(status);
CREATE INDEX IF NOT EXISTS idx_task_completions_reviewed_by ON task_completions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_completion_files_completion ON completion_files(completion_id);

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('task-completions', 'task-completions', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

CREATE POLICY "Users can upload to task-completions bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-completions');

CREATE POLICY "Users can view task-completions files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'task-completions');

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'task-completions' AND auth.uid()::text = (storage.foldername(name))[1]);
