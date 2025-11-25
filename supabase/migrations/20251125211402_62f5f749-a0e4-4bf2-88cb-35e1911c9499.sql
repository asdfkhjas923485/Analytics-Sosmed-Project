-- Drop the restrictive RLS policy that only allows users to view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profil;

-- Create a new policy that allows all authenticated users to view all profiles
-- This enables the Q&A system to display names of question askers and raters
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profil 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Keep the update policy restrictive (users can only update their own profile)
-- This policy already exists, just documenting it here for clarity