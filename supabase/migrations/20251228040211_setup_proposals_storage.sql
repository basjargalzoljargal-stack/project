/*
  # Setup Proposals Storage Bucket

  1. Create Storage Bucket
    - Create 'proposals' bucket for proposal attachments
    - Set to private (only accessible by authenticated users)
    - Max file size: 25MB
  
  2. Storage Policies
    - Users can upload files to their own proposals
    - Users can view files for their own proposals
    - Admins and managers can view all proposal files
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'proposals',
  'proposals',
  false,
  26214400,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload files to their own proposals"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'proposals'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own proposal files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'proposals'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins and managers can view all proposal files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'proposals'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can delete their own proposal files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proposals'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
