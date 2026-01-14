/*
  # Create Proposals Table

  1. New Tables
    - `proposals`
      - `id` (uuid, primary key)
      - `user_id` (uuid, required) - References user_profiles
      - `title` (text, required) - Proposal title
      - `objective` (text, required) - Project objective (200+ chars)
      - `expected_result` (text) - Expected results
      - `start_date` (date, required) - Project start date
      - `end_date` (date, required) - Project end date
      - `budget` (numeric) - Budget amount
      - `required_resources` (text) - Required resources
      - `status` (text, required) - draft/submitted/under_review/approved/rejected
      - `priority` (text) - high/medium/low (set on approval)
      - `submitted_at` (timestamptz) - When submitted
      - `reviewed_at` (timestamptz) - When reviewed
      - `reviewed_by` (uuid) - References user_profiles
      - `review_comments` (text) - Reviewer comments
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `proposals` table
    - Add policy for users to view their own proposals
    - Add policy for users to create/update their own draft proposals
    - Add policy for admins/managers to view all proposals
    - Add policy for admins/managers to update proposal status
*/

CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  objective text NOT NULL,
  expected_result text DEFAULT '',
  start_date date NOT NULL,
  end_date date NOT NULL,
  budget numeric,
  required_resources text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  priority text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  review_comments text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
  CONSTRAINT valid_priority CHECK (priority IS NULL OR priority IN ('high', 'medium', 'low')),
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own proposals"
  ON proposals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can view all proposals"
  ON proposals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can create proposals"
  ON proposals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft proposals"
  ON proposals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'draft')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and managers can update proposals"
  ON proposals FOR UPDATE
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

CREATE POLICY "Users can delete their own draft proposals"
  ON proposals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'draft');

CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_submitted ON proposals(submitted_at);
