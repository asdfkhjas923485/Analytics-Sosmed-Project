-- Fix is_admin function to use correct table name (profil instead of profiles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profil WHERE id = auth.uid() AND peran = 'admin'
  );
$$;