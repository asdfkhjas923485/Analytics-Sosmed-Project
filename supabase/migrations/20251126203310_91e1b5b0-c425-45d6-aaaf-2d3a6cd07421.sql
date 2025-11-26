-- Add profile preferences columns
ALTER TABLE profil
ADD COLUMN IF NOT EXISTS foto_profil_url TEXT,
ADD COLUMN IF NOT EXISTS bahasa VARCHAR(10) DEFAULT 'id',
ADD COLUMN IF NOT EXISTS preferensi_dashboard JSONB DEFAULT '{"widgets": ["kpi", "trends", "platforms", "content_types", "insights"], "layout": "default"}'::jsonb;

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile photos
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);