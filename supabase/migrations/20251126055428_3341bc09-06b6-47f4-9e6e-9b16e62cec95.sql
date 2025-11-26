-- Insert default content types if they don't exist
INSERT INTO public.jenis_konten (kode_jenis_konten, nama_jenis_konten, jenis_konten_aktif)
VALUES 
  ('photo', 'Photo', true),
  ('video', 'Video', true),
  ('carousel', 'Carousel', true),
  ('reels', 'Reels', true),
  ('story', 'Story', true)
ON CONFLICT (kode_jenis_konten) DO UPDATE 
SET jenis_konten_aktif = true;