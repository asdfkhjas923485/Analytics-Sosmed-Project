-- Add foreign key from pertanyaan to profil
ALTER TABLE public.pertanyaan
ADD CONSTRAINT fk_pertanyaan_pengguna 
FOREIGN KEY (id_pengguna) 
REFERENCES public.profil(id) 
ON DELETE CASCADE;

-- Update RLS policy for admin to view all questions
DROP POLICY IF EXISTS "Project members can view questions" ON public.pertanyaan;

CREATE POLICY "Admins can view all questions"
ON public.pertanyaan
FOR SELECT
USING (is_admin());

CREATE POLICY "Users can view own or project questions"
ON public.pertanyaan
FOR SELECT
USING (auth.uid() = id_pengguna OR has_project_access(id_proyek));

-- Add rating columns to pertanyaan table
ALTER TABLE public.pertanyaan
ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN komentar_rating text,
ADD COLUMN rating_at timestamp with time zone;