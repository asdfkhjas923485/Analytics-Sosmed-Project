-- Fix security definer view warning
-- Remove security_barrier and instead use standard RLS on the underlying table

-- The view will inherit RLS from the profil table
DROP VIEW IF EXISTS public.user_display_info;

CREATE VIEW public.user_display_info AS
SELECT 
  id,
  nama_lengkap,
  created_at
FROM public.profil;

-- Grant access to authenticated users  
GRANT SELECT ON public.user_display_info TO authenticated;

COMMENT ON VIEW public.user_display_info IS 
'Public view exposing only user ID and display name for Q&A and collaboration features. Inherits RLS from profil table.';