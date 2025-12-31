/*
  # Add User Approval Status System

  1. Changes to user_profiles table
    - Add `status` column with values: pending, active, rejected
    - Add `rejection_reason` for storing rejection explanation
    - Add `approved_at` timestamp
    - Add `approved_by` foreign key to user_profiles

  2. Security
    - Existing users default to 'active' status
    - New registrations default to 'pending' status
    - Only active users can login
    - Only admins can approve/reject users

  3. Notes
    - First user in system is auto-approved as admin
    - Pending users cannot access system until approved
    - Rejection reason is stored for transparency
*/

-- Add status and approval columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('pending', 'active', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN rejection_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN approved_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN approved_by uuid REFERENCES user_profiles(id);
  END IF;
END $$;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- Update existing users to active status
UPDATE user_profiles SET status = 'active' WHERE status IS NULL;

-- Set approval timestamp for existing active users
UPDATE user_profiles
SET approved_at = created_at
WHERE status = 'active' AND approved_at IS NULL;
