/*
  # Create Chat System Tables

  1. New Tables
    - `chat_rooms` - Chat rooms for departments, projects, and direct messages
    - `chat_members` - Room membership with roles and settings
    - `chat_messages` - Messages with mentions, replies, and pins
    - `chat_files` - File attachments
    - `chat_reactions` - Message reactions
    - `chat_typing_indicators` - Real-time typing status
  
  2. Security
    - Full RLS policies for member-based access control
    - Admins can manage rooms and pin messages
    - Announcement-only mode support
  
  3. Automation
    - Auto-create department chats when department is created
    - Auto-sync members when department membership changes
*/

CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'custom',
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  project_id uuid REFERENCES proposals(id) ON DELETE CASCADE,
  avatar_url text,
  color text DEFAULT '#3B82F6',
  description text DEFAULT '',
  is_announcement_only boolean DEFAULT false,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_room_type CHECK (type IN ('department', 'project', 'direct', 'custom'))
);

CREATE TABLE IF NOT EXISTS chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  is_pinned boolean DEFAULT false,
  notification_setting text DEFAULT 'all',
  last_read_at timestamptz DEFAULT now(),
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_member_role CHECK (role IN ('admin', 'member')),
  CONSTRAINT valid_notification_setting CHECK (notification_setting IN ('all', 'mentions', 'mute')),
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  reply_to_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  mentions text[] DEFAULT '{}',
  is_pinned boolean DEFAULT false,
  is_edited boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_message_type CHECK (message_type IN ('text', 'file', 'system'))
);

CREATE TABLE IF NOT EXISTS chat_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS chat_typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rooms they are members of"
  ON chat_rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_rooms.id
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create custom rooms"
  ON chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by AND type = 'custom');

CREATE POLICY "Admins can update rooms"
  ON chat_rooms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_rooms.id
      AND chat_members.user_id = auth.uid()
      AND chat_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_rooms.id
      AND chat_members.user_id = auth.uid()
      AND chat_members.role = 'admin'
    )
  );

CREATE POLICY "Users can view their memberships"
  ON chat_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM chat_members cm
    WHERE cm.room_id = chat_members.room_id
    AND cm.user_id = auth.uid()
  ));

CREATE POLICY "Admins can add members"
  ON chat_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = room_id
      AND chat_members.user_id = auth.uid()
      AND chat_members.role = 'admin'
    )
  );

CREATE POLICY "Users can update their own membership settings"
  ON chat_members FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update member roles"
  ON chat_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members cm
      WHERE cm.room_id = chat_members.room_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_members cm
      WHERE cm.room_id = chat_members.room_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
    )
  );

CREATE POLICY "Members can view messages in their rooms"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_messages.room_id
      AND chat_members.user_id = auth.uid()
    )
    AND is_deleted = false
  );

CREATE POLICY "Members can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = room_id
      AND chat_members.user_id = auth.uid()
    )
    AND (
      NOT EXISTS (
        SELECT 1 FROM chat_rooms
        WHERE chat_rooms.id = room_id
        AND chat_rooms.is_announcement_only = true
      )
      OR EXISTS (
        SELECT 1 FROM chat_members
        WHERE chat_members.room_id = room_id
        AND chat_members.user_id = auth.uid()
        AND chat_members.role = 'admin'
      )
    )
  );

CREATE POLICY "Users can update their own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can pin messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_messages.room_id
      AND chat_members.user_id = auth.uid()
      AND chat_members.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_messages.room_id
      AND chat_members.user_id = auth.uid()
      AND chat_members.role = 'admin'
    )
  );

CREATE POLICY "Members can view files in their rooms"
  ON chat_files FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages
      JOIN chat_members ON chat_members.room_id = chat_messages.room_id
      WHERE chat_messages.id = chat_files.message_id
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload files with their messages"
  ON chat_files FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_messages
      WHERE chat_messages.id = message_id
      AND chat_messages.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view reactions in their rooms"
  ON chat_reactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages
      JOIN chat_members ON chat_members.room_id = chat_messages.room_id
      WHERE chat_messages.id = chat_reactions.message_id
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add reactions"
  ON chat_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM chat_messages
      JOIN chat_members ON chat_members.room_id = chat_messages.room_id
      WHERE chat_messages.id = message_id
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove their own reactions"
  ON chat_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Members can view typing indicators in their rooms"
  ON chat_typing_indicators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.room_id = chat_typing_indicators.room_id
      AND chat_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their typing status"
  ON chat_typing_indicators FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own typing status"
  ON chat_typing_indicators FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_department ON chat_rooms(department_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_project ON chat_rooms(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_room ON chat_members(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_files_message ON chat_files(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON chat_reactions(message_id);

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('chat-files', 'chat-files', true)
  ON CONFLICT (id) DO NOTHING;
END $$;

CREATE POLICY "Members can upload to chat-files bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-files');

CREATE POLICY "Members can view chat-files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-files');

CREATE POLICY "Users can delete their own chat files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE OR REPLACE FUNCTION create_department_chat()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO chat_rooms (name, type, department_id, color, created_by)
  VALUES (
    NEW.name || ' чат',
    'department',
    NEW.id,
    COALESCE(NEW.color, '#3B82F6'),
    NEW.head_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_department_chat ON departments;
CREATE TRIGGER trigger_create_department_chat
  AFTER INSERT ON departments
  FOR EACH ROW
  EXECUTE FUNCTION create_department_chat();

CREATE OR REPLACE FUNCTION sync_department_chat_members()
RETURNS TRIGGER AS $$
DECLARE
  chat_room_id uuid;
  is_head boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT id INTO chat_room_id
    FROM chat_rooms
    WHERE department_id = NEW.department_id AND type = 'department';
    
    IF chat_room_id IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM departments
        WHERE id = NEW.department_id AND head_id = NEW.user_id
      ) INTO is_head;
      
      INSERT INTO chat_members (room_id, user_id, role)
      VALUES (chat_room_id, NEW.user_id, CASE WHEN is_head THEN 'admin' ELSE 'member' END)
      ON CONFLICT (room_id, user_id) DO NOTHING;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    SELECT id INTO chat_room_id
    FROM chat_rooms
    WHERE department_id = OLD.department_id AND type = 'department';
    
    IF chat_room_id IS NOT NULL THEN
      DELETE FROM chat_members
      WHERE room_id = chat_room_id AND user_id = OLD.user_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_department_chat_members ON user_departments;
CREATE TRIGGER trigger_sync_department_chat_members
  AFTER INSERT OR DELETE ON user_departments
  FOR EACH ROW
  EXECUTE FUNCTION sync_department_chat_members();
