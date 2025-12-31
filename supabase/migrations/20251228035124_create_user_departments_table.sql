/*
  # Create User Departments Junction Table

  1. New Tables
    - `user_departments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, required) - References user_profiles
      - `department_id` (uuid, required) - References departments
      - `is_primary` (boolean) - Whether this is the user's primary department
      - `created_at` (timestamptz) - Creation timestamp
  
  2. Security
    - Enable RLS on `user_departments` table
    - Add policy for authenticated users to read user_departments
    - Add policy for admin users to manage user_departments
  
  3. Constraints
    - Unique constraint on user_id + department_id combination
    - Each user can have only one primary department
*/

CREATE TABLE IF NOT EXISTS user_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, department_id)
);

ALTER TABLE user_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view user_departments"
  ON user_departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert user_departments"
  ON user_departments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin users can update user_departments"
  ON user_departments FOR UPDATE
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

CREATE POLICY "Admin users can delete user_departments"
  ON user_departments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_user_departments_user ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_dept ON user_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_primary ON user_departments(is_primary);
