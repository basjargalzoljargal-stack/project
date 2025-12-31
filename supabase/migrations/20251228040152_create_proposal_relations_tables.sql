/*
  # Create Proposal Relations Tables

  1. New Tables
    - `proposal_comments`
      - `id` (uuid, primary key)
      - `proposal_id` (uuid, required) - References proposals
      - `user_id` (uuid, required) - References user_profiles
      - `comment` (text, required) - Comment text
      - `created_at` (timestamptz) - Creation timestamp
    
    - `proposal_departments`
      - `id` (uuid, primary key)
      - `proposal_id` (uuid, required) - References proposals
      - `department_id` (uuid, required) - References departments
      - `created_at` (timestamptz) - Creation timestamp
    
    - `proposal_assignees`
      - `id` (uuid, primary key)
      - `proposal_id` (uuid, required) - References proposals
      - `user_id` (uuid, required) - References user_profiles
      - `created_at` (timestamptz) - Creation timestamp
  
  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for viewing and managing
*/

CREATE TABLE IF NOT EXISTS proposal_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposal_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(proposal_id, department_id)
);

CREATE TABLE IF NOT EXISTS proposal_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(proposal_id, user_id)
);

ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their proposals"
  ON proposal_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_comments.proposal_id
      AND proposals.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can view all comments"
  ON proposal_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can insert comments"
  ON proposal_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can view departments on their proposals"
  ON proposal_departments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_departments.proposal_id
      AND proposals.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can view all proposal departments"
  ON proposal_departments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can manage departments on their draft proposals"
  ON proposal_departments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_departments.proposal_id
      AND proposals.user_id = auth.uid()
      AND proposals.status = 'draft'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_departments.proposal_id
      AND proposals.user_id = auth.uid()
      AND proposals.status = 'draft'
    )
  );

CREATE POLICY "Users can view assignees on their proposals"
  ON proposal_assignees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_assignees.proposal_id
      AND proposals.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can view all assignees"
  ON proposal_assignees FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can manage assignees"
  ON proposal_assignees FOR ALL
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

CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal ON proposal_comments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_departments_proposal ON proposal_departments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_departments_department ON proposal_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_proposal_assignees_proposal ON proposal_assignees(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_assignees_user ON proposal_assignees(user_id);
