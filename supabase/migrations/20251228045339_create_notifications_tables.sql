/*
  # Create Notifications System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `type` (text) - notification type
      - `title` (text) - notification title
      - `message` (text) - notification message
      - `actor_id` (uuid) - who triggered it
      - `actor_name` (text) - actor display name
      - `link` (text) - navigation URL
      - `related_type` (text) - task, proposal, completion, chat
      - `related_id` (uuid) - related entity ID
      - `is_read` (boolean) - read status
      - `created_at` (timestamptz)

    - `notification_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique)
      - `email_notifications` (boolean)
      - `push_notifications` (boolean)
      - `task_assigned` (boolean)
      - `task_due_soon` (boolean)
      - `task_overdue` (boolean)
      - `task_completed` (boolean)
      - `chat_messages` (boolean)
      - `chat_mentions_only` (boolean)
      - `proposal_reviewed` (boolean)
      - `completion_reviewed` (boolean)
      - `quiet_hours_enabled` (boolean)
      - `quiet_hours_start` (text) - HH:MM format
      - `quiet_hours_end` (text) - HH:MM format
      - `weekend_mode` (boolean)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only see their own notifications
    - Users can only update their own settings
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  link text,
  related_type text,
  related_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT false,
  task_assigned boolean DEFAULT true,
  task_due_soon boolean DEFAULT true,
  task_overdue boolean DEFAULT true,
  task_completed boolean DEFAULT false,
  chat_messages boolean DEFAULT false,
  chat_mentions_only boolean DEFAULT true,
  proposal_reviewed boolean DEFAULT true,
  completion_reviewed boolean DEFAULT true,
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start text DEFAULT '22:00',
  quiet_hours_end text DEFAULT '08:00',
  weekend_mode boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Notification settings policies
CREATE POLICY "Users can view own settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON notification_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON notification_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- Function to auto-create notification settings for new users
CREATE OR REPLACE FUNCTION create_notification_settings_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create settings when user signs up
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'create_notification_settings_trigger'
  ) THEN
    CREATE TRIGGER create_notification_settings_trigger
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_notification_settings_for_user();
  END IF;
END $$;
