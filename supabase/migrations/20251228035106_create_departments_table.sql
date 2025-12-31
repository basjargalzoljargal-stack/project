/*
  # Create Departments Table

  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `name` (text, required) - Department name
      - `description` (text) - Department description
      - `color` (text) - Color indicator for UI (red, blue, green, yellow, purple)
      - `parent_department_id` (uuid, nullable) - For hierarchical structure
      - `department_head_id` (uuid, nullable) - References user who is head
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `departments` table
    - Add policy for authenticated users to read departments
    - Add policy for admin users to manage departments
*/

CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  color text DEFAULT 'blue',
  parent_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  department_head_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert departments"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update departments"
  ON departments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete departments"
  ON departments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_departments_parent ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_head ON departments(department_head_id);

INSERT INTO departments (name, description, color) VALUES
  ('Захиргаа', 'Захиргааны алба', 'blue'),
  ('Борлуулалт', 'Борлуулалтын хэлтэс', 'green'),
  ('Технологи', 'Мэдээллийн технологийн хэлтэс', 'purple')
ON CONFLICT DO NOTHING;
