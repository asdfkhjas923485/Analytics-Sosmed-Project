-- Update has_project_access function to use new Indonesian table names
CREATE OR REPLACE FUNCTION public.has_project_access(project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proyek WHERE id = project_id AND id_pemilik = auth.uid()
    UNION
    SELECT 1 FROM public.anggota_proyek WHERE id_proyek = project_id AND id_pengguna = auth.uid()
  );
$$;