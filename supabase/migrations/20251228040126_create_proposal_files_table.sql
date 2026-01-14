/*
  # Create Proposal Files Table

  1. New Tables
    - `proposal_files`
      - `id` (uuid, primary key)
      - `proposal_id` (uuid, required) - References proposals
      - `file_name` (text, required) - Original file name
      - `file_path` (text, required) - Storage path
      - `file_size` (bigint, required) - File size in bytes
      - `file_type` (text, required) - MIME type
      - `uploaded_at` (timestamptz) - Upload timestamp
  
  2. Security
    - Enable RLS on `proposal_files` table
    - Add policy for users to manage files for their own proposals
    - Add policy for admins/managers to view all proposal files
*/

CREATE TABLE IF NOT EXISTS proposal_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE proposal_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view files for their own proposals"
  ON proposal_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_files.proposal_id
      AND proposals.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can view all proposal files"
  ON proposal_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can insert files for their own proposals"
  ON proposal_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_files.proposal_id
      AND proposals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete files for their own draft proposals"
  ON proposal_files FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_files.proposal_id
      AND proposals.user_id = auth.uid()
      AND proposals.status = 'draft'
    )
  );

CREATE INDEX IF NOT EXISTS idx_proposal_files_proposal ON proposal_files(proposal_id);
