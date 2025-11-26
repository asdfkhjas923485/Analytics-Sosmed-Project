-- Add more content types to support various social media formats
INSERT INTO public.jenis_konten (kode_jenis_konten, nama_jenis_konten, jenis_konten_aktif) 
VALUES 
  ('reel', 'Reel', true),
  ('short', 'Short', true),
  ('igtv', 'IGTV', true),
  ('live', 'Live', true),
  ('guide', 'Guide', true),
  ('story_highlight', 'Story Highlight', true),
  ('tiktok', 'TikTok', true),
  ('youtube_short', 'YouTube Short', true),
  ('tweet', 'Tweet', true),
  ('thread', 'Thread', true),
  ('linkedin_post', 'LinkedIn Post', true),
  ('linkedin_article', 'LinkedIn Article', true)
ON CONFLICT (kode_jenis_konten) DO UPDATE 
SET 
  nama_jenis_konten = EXCLUDED.nama_jenis_konten,
  jenis_konten_aktif = EXCLUDED.jenis_konten_aktif;