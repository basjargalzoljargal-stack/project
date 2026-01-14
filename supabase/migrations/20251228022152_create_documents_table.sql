/*
  # Create documents management system

  1. New Tables
    - `documents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `received_date` (date) - When the document was received
      - `sender` (text) - Who sent the document
      - `document_number` (text) - Official document number
      - `summary` (text) - Brief summary of the document
      - `category` (text) - Response required, Informational, Instruction, Organizational
      - `file_url` (text) - URL to the uploaded file in storage
      - `file_name` (text) - Original filename
      - `file_type` (text) - MIME type of the file
      - `deadline` (date, nullable) - Response deadline if applicable
      - `responsible_person` (text, nullable) - Person responsible for response
      - `status` (text) - Pending, In Progress, Completed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `documents` table
    - Add policies for authenticated users to manage their own documents
*/

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  sender text NOT NULL,
  document_number text NOT NULL,
  summary text NOT NULL,
  category text NOT NULL CHECK (category IN ('Response required', 'Informational', 'Instruction', 'Organizational')),
  file_url text,
  file_name text,
  file_type text,
  deadline date,
  responsible_person text,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents(user_id);
CREATE INDEX IF NOT EXISTS documents_received_date_idx ON documents(received_date);
CREATE INDEX IF NOT EXISTS documents_category_idx ON documents(category);
CREATE INDEX IF NOT EXISTS documents_status_idx ON documents(status);