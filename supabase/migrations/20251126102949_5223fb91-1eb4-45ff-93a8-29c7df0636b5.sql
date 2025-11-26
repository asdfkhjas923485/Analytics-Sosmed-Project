-- Allow users to update their own pending questions
CREATE POLICY "Users can update own pending questions"
ON pertanyaan
FOR UPDATE
USING (auth.uid() = id_pengguna AND status = 'menunggu')
WITH CHECK (auth.uid() = id_pengguna AND status = 'menunggu');

-- Allow users to delete their own pending questions
CREATE POLICY "Users can delete own pending questions"
ON pertanyaan
FOR DELETE
USING (auth.uid() = id_pengguna AND status = 'menunggu');

-- Create function to notify user when question is answered
CREATE OR REPLACE FUNCTION notify_user_question_answered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_user_email text;
  v_nama_penanya text;
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  -- Only trigger if status changed to answered and answer was added
  IF NEW.status = 'dijawab' AND NEW.jawaban IS NOT NULL AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.jawaban IS DISTINCT FROM NEW.jawaban) THEN
    -- Get user email from auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = NEW.id_pengguna;
    
    -- Get user name from profil
    SELECT COALESCE(nama_lengkap, 'User') INTO v_nama_penanya
    FROM profil
    WHERE id = NEW.id_pengguna;

    -- Get Supabase configuration
    SELECT decrypted_secret INTO v_supabase_url 
    FROM vault.decrypted_secrets 
    WHERE name = 'SUPABASE_URL' 
    LIMIT 1;
    
    SELECT decrypted_secret INTO v_service_role_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' 
    LIMIT 1;

    -- Call edge function to send email
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/notify-user-question-answered',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := jsonb_build_object(
        'user_email', v_user_email,
        'nama_penanya', v_nama_penanya,
        'judul_pertanyaan', NEW.judul_pertanyaan,
        'isi_pertanyaan', NEW.isi_pertanyaan,
        'jawaban', NEW.jawaban
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to send user notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger for question answered notifications
DROP TRIGGER IF EXISTS on_question_answered ON pertanyaan;
CREATE TRIGGER on_question_answered
  AFTER UPDATE ON pertanyaan
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_question_answered();