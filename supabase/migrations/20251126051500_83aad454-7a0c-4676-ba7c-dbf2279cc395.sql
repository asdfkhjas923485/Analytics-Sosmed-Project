-- Create a function to notify admin when new question is created
CREATE OR REPLACE FUNCTION notify_admin_new_question()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nama_penanya text;
  v_nama_proyek text;
BEGIN
  -- Get the question asker's name
  SELECT COALESCE(nama_lengkap, 'Unknown') INTO v_nama_penanya
  FROM profil
  WHERE id = NEW.id_pengguna;

  -- Get the project name
  SELECT nama_proyek INTO v_nama_proyek
  FROM proyek
  WHERE id = NEW.id_proyek;

  -- Call the edge function to send email notification
  PERFORM net.http_post(
    url := (SELECT CONCAT(current_setting('app.settings.supabase_url'), '/functions/v1/notify-admin-new-question')),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', CONCAT('Bearer ', current_setting('app.settings.service_role_key'))
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

-- Create trigger on pertanyaan table
DROP TRIGGER IF EXISTS trigger_notify_admin_new_question ON public.pertanyaan;

CREATE TRIGGER trigger_notify_admin_new_question
AFTER INSERT ON public.pertanyaan
FOR EACH ROW
WHEN (NEW.status = 'menunggu')
EXECUTE FUNCTION notify_admin_new_question();

COMMENT ON FUNCTION notify_admin_new_question IS 
'Sends email notification to admin when a new question is created with status menunggu';

COMMENT ON TRIGGER trigger_notify_admin_new_question ON public.pertanyaan IS
'Triggers email notification to admin when new question needs to be answered';
