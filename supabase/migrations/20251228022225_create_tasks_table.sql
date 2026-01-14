/*
  # Create tasks management system

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `document_id` (uuid, nullable, references documents) - Links task to a document
      - `title` (text) - Task title
      - `description` (text) - Task description
      - `date_time` (timestamptz) - Task due date and time
      - `category` (text) - General, Project, Document Related
      - `status` (text) - Planned, In progress, Completed, Postponed
      - `priority` (text) - high, medium, low
      - `completed` (boolean) - Whether the task is completed
      - `file_name` (text, nullable) - Attached file name
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `tasks` table
    - Add policies for authenticated users to manage their own tasks
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  date_time timestamptz NOT NULL,
  category text NOT NULL CHECK (category IN ('General', 'Project', 'Document Related')),
  status text NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'In progress', 'Completed', 'Postponed')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  completed boolean DEFAULT false,
  file_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_document_id_idx ON tasks(document_id);
CREATE INDEX IF NOT EXISTS tasks_date_time_idx ON tasks(date_time);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_priority_idx ON tasks(priority);