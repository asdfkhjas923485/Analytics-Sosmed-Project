-- Allow all authenticated users to view all questions (public FAQ style)
DROP POLICY IF EXISTS "Users can view own or project questions" ON public.pertanyaan;
DROP POLICY IF EXISTS "Users can view own questions" ON public.pertanyaan;

CREATE POLICY "All users can view all questions"
ON public.pertanyaan
FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own questions (for rating)
CREATE POLICY "Users can rate answered questions"
ON public.pertanyaan
FOR UPDATE
TO authenticated
USING (auth.uid() = id_pengguna)
WITH CHECK (auth.uid() = id_pengguna);