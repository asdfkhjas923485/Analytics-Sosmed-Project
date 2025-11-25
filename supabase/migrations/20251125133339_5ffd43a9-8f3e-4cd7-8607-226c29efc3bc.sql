-- Create Q&A table
CREATE TABLE public.pertanyaan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_pengguna UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  id_proyek UUID NOT NULL,
  judul_pertanyaan TEXT NOT NULL,
  isi_pertanyaan TEXT NOT NULL,
  jawaban TEXT,
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'dijawab')),
  dijawab_oleh UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_proyek FOREIGN KEY (id_proyek) REFERENCES public.proyek(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.pertanyaan ENABLE ROW LEVEL SECURITY;

-- Users can view their own questions
CREATE POLICY "Users can view own questions"
ON public.pertanyaan
FOR SELECT
USING (auth.uid() = id_pengguna OR has_project_access(id_proyek));

-- Users can insert their own questions
CREATE POLICY "Users can create questions"
ON public.pertanyaan
FOR INSERT
WITH CHECK (auth.uid() = id_pengguna AND has_project_access(id_proyek));

-- Admins can update (answer) questions
CREATE POLICY "Admins can answer questions"
ON public.pertanyaan
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- Users can view questions for their projects
CREATE POLICY "Project members can view questions"
ON public.pertanyaan
FOR SELECT
USING (has_project_access(id_proyek));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pertanyaan;