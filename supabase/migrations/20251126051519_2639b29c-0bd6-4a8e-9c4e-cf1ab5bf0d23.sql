-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Update the notification function to use proper environment variables
CREATE OR REPLACE FUNCTION notify_admin_new_question()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nama_penanya text;
  v_nama_proyek text;
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  -- Get Supabase configuration from vault or use defaults
  SELECT decrypted_secret INTO v_supabase_url 
  FROM vault.decrypted_secrets 
  WHERE name = 'SUPABASE_URL' 
  LIMIT 1;
  
  SELECT decrypted_secret INTO v_service_role_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' 
  LIMIT 1;

  -- Fallback to environment if not in vault
  IF v_supabase_url IS NULL THEN
    v_supabase_url := current_setting('app.settings.supabase_url', true);
  END IF;
  
  IF v_service_role_key IS NULL THEN
    v_service_role_key := current_setting('app.settings.service_role_key', true);
  END IF;

  -- Get the question asker's name
  SELECT COALESCE(nama_lengkap, 'Unknown') INTO v_nama_penanya
  FROM profil
  WHERE id = NEW.id_pengguna;

  -- Get the project name
  SELECT nama_proyek INTO v_nama_proyek
  FROM proyek
  WHERE id = NEW.id_proyek;

  -- Call the edge function to send email notification using pg_net
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/notify-admin-new-question',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'question_id', NEW.id,
      'judul_pertanyaan', NEW.judul_pertanyaan,
      'isi_pertanyaan', NEW.isi_pertanyaan,
      'nama_penanya', v_nama_penanya,
      'nama_proyek', v_nama_proyek
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't prevent question creation
  RAISE WARNING 'Failed to send admin notification: %', SQLERRM;
  RETURN NEW;
END;
$$;
