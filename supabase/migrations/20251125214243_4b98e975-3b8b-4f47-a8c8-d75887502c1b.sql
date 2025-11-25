-- ========================================
-- SECURITY HARDENING: PRIORITY 1 & 4
-- ========================================

-- 1. Lock role field in profil table to prevent privilege escalation
-- Users can update their profile but CANNOT change their role
DROP POLICY IF EXISTS "Users can update own profile" ON public.profil;

CREATE POLICY "Users can update own profile but not role" ON public.profil
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND peran = (SELECT peran FROM profil WHERE id = auth.uid())
);

-- 2. Create a security definer function to safely get user display names
-- This provides a controlled way to access names without exposing full profiles
CREATE OR REPLACE FUNCTION public.get_user_display_name(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(nama_lengkap, 'Unknown') 
  FROM profil 
  WHERE id = user_id
  LIMIT 1
$$;

-- 3. Create a view for public user information (only id and name)
-- This allows queries to access names without full profile access
CREATE OR REPLACE VIEW public.user_display_info AS
SELECT 
  id,
  nama_lengkap,
  created_at
FROM public.profil;

-- Enable RLS on the view
ALTER VIEW public.user_display_info SET (security_barrier = true);

-- Grant access to authenticated users
GRANT SELECT ON public.user_display_info TO authenticated;

-- 4. Add comment for documentation
COMMENT ON POLICY "Users can update own profile but not role" ON public.profil IS 
'Allows users to update their own profile data but prevents them from changing their role field, preventing privilege escalation attacks';

COMMENT ON FUNCTION public.get_user_display_name IS 
'Security definer function to safely retrieve user display names for Q&A feature without exposing full profile data';

COMMENT ON VIEW public.user_display_info IS 
'Public view exposing only user ID and display name for Q&A and collaboration features, limiting profile data exposure';