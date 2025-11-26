CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: import_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.import_status AS ENUM (
    'pending',
    'success',
    'failed'
);


--
-- Name: period_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.period_type AS ENUM (
    'weekly',
    'monthly'
);


--
-- Name: project_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_role AS ENUM (
    'owner',
    'editor',
    'viewer'
);


--
-- Name: scope_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.scope_type AS ENUM (
    'post',
    'week',
    'global'
);


--
-- Name: source_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.source_type AS ENUM (
    'upload_csv',
    'google_sheet',
    'sample'
);


--
-- Name: get_user_display_name(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_display_name(user_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(nama_lengkap, 'Unknown') 
  FROM profil 
  WHERE id = user_id
  LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profil (id, nama_lengkap, peran)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'user'
  );
  RETURN new;
END;
$$;


--
-- Name: has_project_access(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_project_access(project_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.proyek WHERE id = project_id AND id_pemilik = auth.uid()
    UNION
    SELECT 1 FROM public.anggota_proyek WHERE id_proyek = project_id AND id_pengguna = auth.uid()
  );
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profil WHERE id = auth.uid() AND peran = 'admin'
  );
$$;


--
-- Name: notify_admin_new_question(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_admin_new_question() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


SET default_table_access_method = heap;

--
-- Name: anggota_proyek; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.anggota_proyek (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    id_proyek uuid NOT NULL,
    id_pengguna uuid NOT NULL,
    peran_dalam_proyek public.project_role DEFAULT 'viewer'::public.project_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: catatan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catatan (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    id_proyek uuid NOT NULL,
    id_dataset uuid,
    id_pengguna uuid NOT NULL,
    jenis_scope public.scope_type NOT NULL,
    kunci_scope text,
    isi_catatan text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: dataset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dataset (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    id_proyek uuid NOT NULL,
    nama_dataset text NOT NULL,
    jenis_sumber_dataset public.source_type DEFAULT 'upload_csv'::public.source_type NOT NULL,
    lokasi_berkas_dataset text,
    jumlah_baris_dataset integer DEFAULT 0 NOT NULL,
    dataset_aktif boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: filter_tersimpan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.filter_tersimpan (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    id_pengguna uuid NOT NULL,
    id_proyek uuid NOT NULL,
    nama_filter text NOT NULL,
    halaman text NOT NULL,
    nilai_filter_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: jenis_konten; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jenis_konten (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    kode_jenis_konten text NOT NULL,
    nama_jenis_konten text NOT NULL,
    jenis_konten_aktif boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kampanye; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kampanye (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    id_proyek uuid NOT NULL,
    nama_kampanye text NOT NULL,
    tanggal_mulai_kampanye date,
    tanggal_selesai_kampanye date,
    catatan_kampanye text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: log_impor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_impor (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    id_dataset uuid NOT NULL,
    status_impor public.import_status DEFAULT 'pending'::public.import_status NOT NULL,
    pesan text,
    jumlah_baris_tidak_valid integer DEFAULT 0 NOT NULL,
    kolom_hilang jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pertanyaan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pertanyaan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_pengguna uuid NOT NULL,
    id_proyek uuid NOT NULL,
    judul_pertanyaan text NOT NULL,
    isi_pertanyaan text NOT NULL,
    jawaban text,
    status text DEFAULT 'menunggu'::text NOT NULL,
    dijawab_oleh uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rating integer,
    komentar_rating text,
    rating_at timestamp with time zone,
    CONSTRAINT pertanyaan_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT pertanyaan_status_check CHECK ((status = ANY (ARRAY['menunggu'::text, 'dijawab'::text])))
);


--
-- Name: platform; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    kode_platform text NOT NULL,
    nama_platform text NOT NULL,
    warna_platform text DEFAULT '#000000'::text NOT NULL,
    platform_aktif boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: postingan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.postingan (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    id_proyek uuid NOT NULL,
    id_dataset uuid NOT NULL,
    id_platform uuid NOT NULL,
    id_jenis_konten uuid NOT NULL,
    id_kampanye uuid,
    kode_postingan text NOT NULL,
    waktu_diposting timestamp with time zone NOT NULL,
    teks_caption text,
    jumlah_likes integer DEFAULT 0 NOT NULL,
    jumlah_komentar integer DEFAULT 0 NOT NULL,
    jumlah_shares integer DEFAULT 0 NOT NULL,
    jumlah_saved integer DEFAULT 0 NOT NULL,
    jumlah_views integer DEFAULT 0 NOT NULL,
    jumlah_reach integer DEFAULT 0 NOT NULL,
    jumlah_followers integer DEFAULT 0 NOT NULL,
    total_engagement integer GENERATED ALWAYS AS ((((jumlah_likes + jumlah_komentar) + jumlah_shares) + jumlah_saved)) STORED,
    engagement_rate_persen numeric GENERATED ALWAYS AS (
CASE
    WHEN (jumlah_reach > 0) THEN ((((((jumlah_likes + jumlah_komentar) + jumlah_shares) + jumlah_saved))::numeric / (jumlah_reach)::numeric) * (100)::numeric)
    ELSE (0)::numeric
END) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profil; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profil (
    id uuid NOT NULL,
    nama_lengkap text,
    peran public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: proyek; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proyek (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    id_pemilik uuid NOT NULL,
    nama_proyek text NOT NULL,
    deskripsi_proyek text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: target_kpi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.target_kpi (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    id_proyek uuid NOT NULL,
    jenis_periode public.period_type NOT NULL,
    tanggal_mulai_periode date NOT NULL,
    tanggal_selesai_periode date NOT NULL,
    target_rata_rata_er numeric,
    target_jumlah_followers numeric,
    target_total_jangkauan numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_display_info; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_display_info AS
 SELECT id,
    nama_lengkap,
    created_at
   FROM public.profil;


--
-- Name: kampanye campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kampanye
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: jenis_konten content_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jenis_konten
    ADD CONSTRAINT content_types_name_key UNIQUE (kode_jenis_konten);


--
-- Name: jenis_konten content_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jenis_konten
    ADD CONSTRAINT content_types_pkey PRIMARY KEY (id);


--
-- Name: dataset datasets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dataset
    ADD CONSTRAINT datasets_pkey PRIMARY KEY (id);


--
-- Name: log_impor imports_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_impor
    ADD CONSTRAINT imports_log_pkey PRIMARY KEY (id);


--
-- Name: target_kpi kpi_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_kpi
    ADD CONSTRAINT kpi_targets_pkey PRIMARY KEY (id);


--
-- Name: catatan notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catatan
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: pertanyaan pertanyaan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pertanyaan
    ADD CONSTRAINT pertanyaan_pkey PRIMARY KEY (id);


--
-- Name: platform platforms_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform
    ADD CONSTRAINT platforms_name_key UNIQUE (kode_platform);


--
-- Name: platform platforms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform
    ADD CONSTRAINT platforms_pkey PRIMARY KEY (id);


--
-- Name: postingan posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postingan
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: profil profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profil
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: anggota_proyek project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anggota_proyek
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- Name: anggota_proyek project_members_project_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anggota_proyek
    ADD CONSTRAINT project_members_project_id_user_id_key UNIQUE (id_proyek, id_pengguna);


--
-- Name: proyek projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyek
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: filter_tersimpan saved_filters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filter_tersimpan
    ADD CONSTRAINT saved_filters_pkey PRIMARY KEY (id);


--
-- Name: idx_posts_content_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_content_type ON public.postingan USING btree (id_jenis_konten);


--
-- Name: idx_posts_engagement_rate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_engagement_rate ON public.postingan USING btree (engagement_rate_persen);


--
-- Name: idx_posts_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_platform ON public.postingan USING btree (id_platform);


--
-- Name: idx_posts_posted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_posted_at ON public.postingan USING btree (waktu_diposting);


--
-- Name: idx_posts_project_dataset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_project_dataset ON public.postingan USING btree (id_proyek, id_dataset);


--
-- Name: pertanyaan trigger_notify_admin_new_question; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_admin_new_question AFTER INSERT ON public.pertanyaan FOR EACH ROW WHEN ((new.status = 'menunggu'::text)) EXECUTE FUNCTION public.notify_admin_new_question();


--
-- Name: kampanye campaigns_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kampanye
    ADD CONSTRAINT campaigns_project_id_fkey FOREIGN KEY (id_proyek) REFERENCES public.proyek(id) ON DELETE CASCADE;


--
-- Name: dataset datasets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dataset
    ADD CONSTRAINT datasets_project_id_fkey FOREIGN KEY (id_proyek) REFERENCES public.proyek(id) ON DELETE CASCADE;


--
-- Name: pertanyaan fk_pertanyaan_pengguna; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pertanyaan
    ADD CONSTRAINT fk_pertanyaan_pengguna FOREIGN KEY (id_pengguna) REFERENCES public.profil(id) ON DELETE CASCADE;


--
-- Name: pertanyaan fk_proyek; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pertanyaan
    ADD CONSTRAINT fk_proyek FOREIGN KEY (id_proyek) REFERENCES public.proyek(id) ON DELETE CASCADE;


--
-- Name: log_impor imports_log_dataset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_impor
    ADD CONSTRAINT imports_log_dataset_id_fkey FOREIGN KEY (id_dataset) REFERENCES public.dataset(id) ON DELETE CASCADE;


--
-- Name: target_kpi kpi_targets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_kpi
    ADD CONSTRAINT kpi_targets_project_id_fkey FOREIGN KEY (id_proyek) REFERENCES public.proyek(id) ON DELETE CASCADE;


--
-- Name: catatan notes_dataset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catatan
    ADD CONSTRAINT notes_dataset_id_fkey FOREIGN KEY (id_dataset) REFERENCES public.dataset(id) ON DELETE CASCADE;


--
-- Name: catatan notes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catatan
    ADD CONSTRAINT notes_project_id_fkey FOREIGN KEY (id_proyek) REFERENCES public.proyek(id) ON DELETE CASCADE;


--
-- Name: catatan notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catatan
    ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (id_pengguna) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pertanyaan pertanyaan_dijawab_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pertanyaan
    ADD CONSTRAINT pertanyaan_dijawab_oleh_fkey FOREIGN KEY (dijawab_oleh) REFERENCES auth.users(id);


--
-- Name: pertanyaan pertanyaan_id_pengguna_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pertanyaan
    ADD CONSTRAINT pertanyaan_id_pengguna_fkey FOREIGN KEY (id_pengguna) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: postingan posts_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postingan
    ADD CONSTRAINT posts_campaign_id_fkey FOREIGN KEY (id_kampanye) REFERENCES public.kampanye(id) ON DELETE SET NULL;


--
-- Name: postingan posts_content_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postingan
    ADD CONSTRAINT posts_content_type_id_fkey FOREIGN KEY (id_jenis_konten) REFERENCES public.jenis_konten(id);


--
-- Name: postingan posts_dataset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postingan
    ADD CONSTRAINT posts_dataset_id_fkey FOREIGN KEY (id_dataset) REFERENCES public.dataset(id) ON DELETE CASCADE;


--
-- Name: postingan posts_platform_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postingan
    ADD CONSTRAINT posts_platform_id_fkey FOREIGN KEY (id_platform) REFERENCES public.platform(id);


--
-- Name: postingan posts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postingan
    ADD CONSTRAINT posts_project_id_fkey FOREIGN KEY (id_proyek) REFERENCES public.proyek(id) ON DELETE CASCADE;


--
-- Name: profil profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profil
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: anggota_proyek project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anggota_proyek
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (id_proyek) REFERENCES public.proyek(id) ON DELETE CASCADE;


--
-- Name: anggota_proyek project_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.anggota_proyek
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (id_pengguna) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: proyek projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyek
    ADD CONSTRAINT projects_user_id_fkey FOREIGN KEY (id_pemilik) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: filter_tersimpan saved_filters_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filter_tersimpan
    ADD CONSTRAINT saved_filters_project_id_fkey FOREIGN KEY (id_proyek) REFERENCES public.proyek(id) ON DELETE CASCADE;


--
-- Name: filter_tersimpan saved_filters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.filter_tersimpan
    ADD CONSTRAINT saved_filters_user_id_fkey FOREIGN KEY (id_pengguna) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pertanyaan Admins can answer questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can answer questions" ON public.pertanyaan FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());


--
-- Name: jenis_konten Admins can delete content types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete content types" ON public.jenis_konten FOR DELETE USING (public.is_admin());


--
-- Name: platform Admins can delete platforms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete platforms" ON public.platform FOR DELETE USING (public.is_admin());


--
-- Name: jenis_konten Admins can insert content types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert content types" ON public.jenis_konten FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: platform Admins can insert platforms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert platforms" ON public.platform FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: jenis_konten Admins can update content types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update content types" ON public.jenis_konten FOR UPDATE USING (public.is_admin());


--
-- Name: platform Admins can update platforms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update platforms" ON public.platform FOR UPDATE USING (public.is_admin());


--
-- Name: pertanyaan Admins can view all questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all questions" ON public.pertanyaan FOR SELECT USING (public.is_admin());


--
-- Name: pertanyaan All users can view all questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All users can view all questions" ON public.pertanyaan FOR SELECT TO authenticated USING (true);


--
-- Name: profil Authenticated users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view all profiles" ON public.profil FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: jenis_konten Everyone can view active content types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active content types" ON public.jenis_konten FOR SELECT USING (true);


--
-- Name: platform Everyone can view active platforms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active platforms" ON public.platform FOR SELECT USING (true);


--
-- Name: proyek Project owners can delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project owners can delete" ON public.proyek FOR DELETE USING ((id_pemilik = auth.uid()));


--
-- Name: anggota_proyek Project owners can manage members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project owners can manage members" ON public.anggota_proyek USING ((EXISTS ( SELECT 1
   FROM public.proyek
  WHERE ((proyek.id = anggota_proyek.id_proyek) AND (proyek.id_pemilik = auth.uid())))));


--
-- Name: proyek Project owners can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project owners can update" ON public.proyek FOR UPDATE USING ((id_pemilik = auth.uid()));


--
-- Name: log_impor Users can create import logs for accessible datasets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create import logs for accessible datasets" ON public.log_impor FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.dataset
  WHERE ((dataset.id = log_impor.id_dataset) AND public.has_project_access(dataset.id_proyek)))));


--
-- Name: proyek Users can create own projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own projects" ON public.proyek FOR INSERT WITH CHECK ((auth.uid() = id_pemilik));


--
-- Name: pertanyaan Users can create questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create questions" ON public.pertanyaan FOR INSERT WITH CHECK (((auth.uid() = id_pengguna) AND public.has_project_access(id_proyek)));


--
-- Name: target_kpi Users can manage KPI targets for accessible projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage KPI targets for accessible projects" ON public.target_kpi USING (public.has_project_access(id_proyek));


--
-- Name: kampanye Users can manage campaigns for accessible projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage campaigns for accessible projects" ON public.kampanye USING (public.has_project_access(id_proyek));


--
-- Name: dataset Users can manage datasets for accessible projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage datasets for accessible projects" ON public.dataset USING (public.has_project_access(id_proyek));


--
-- Name: catatan Users can manage notes for accessible projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage notes for accessible projects" ON public.catatan USING (((id_pengguna = auth.uid()) AND public.has_project_access(id_proyek)));


--
-- Name: filter_tersimpan Users can manage own saved filters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own saved filters" ON public.filter_tersimpan USING ((id_pengguna = auth.uid()));


--
-- Name: postingan Users can manage posts for accessible projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage posts for accessible projects" ON public.postingan USING (public.has_project_access(id_proyek));


--
-- Name: pertanyaan Users can rate answered questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can rate answered questions" ON public.pertanyaan FOR UPDATE TO authenticated USING ((auth.uid() = id_pengguna)) WITH CHECK ((auth.uid() = id_pengguna));


--
-- Name: profil Users can update own profile but not role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile but not role" ON public.profil FOR UPDATE USING ((auth.uid() = id)) WITH CHECK (((auth.uid() = id) AND (peran = ( SELECT profil_1.peran
   FROM public.profil profil_1
  WHERE (profil_1.id = auth.uid())))));


--
-- Name: target_kpi Users can view KPI targets for accessible projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view KPI targets for accessible projects" ON public.target_kpi FOR SELECT USING (public.has_project_access(id_proyek));


--
-- Name: proyek Users can view accessible projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view accessible projects" ON public.proyek FOR SELECT USING (((id_pemilik = auth.uid()) OR public.has_project_access(id)));


--
-- Name: kampanye Users can view campaigns for accessible projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view campaigns for accessible projects" ON public.kampanye FOR SELECT USING (public.has_project_access(id_proyek));


--
-- Name: dataset Users can view datasets for accessible projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view datasets for accessible projects" ON public.dataset FOR SELECT USING (public.has_project_access(id_proyek));


--
-- Name: log_impor Users can view import logs for accessible datasets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view import logs for accessible datasets" ON public.log_impor FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.dataset
  WHERE ((dataset.id = log_impor.id_dataset) AND public.has_project_access(dataset.id_proyek)))));


--
-- Name: catatan Users can view notes for accessible projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view notes for accessible projects" ON public.catatan FOR SELECT USING (public.has_project_access(id_proyek));


--
-- Name: filter_tersimpan Users can view own saved filters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own saved filters" ON public.filter_tersimpan FOR SELECT USING ((id_pengguna = auth.uid()));


--
-- Name: postingan Users can view posts for accessible projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view posts for accessible projects" ON public.postingan FOR SELECT USING (public.has_project_access(id_proyek));


--
-- Name: anggota_proyek Users can view project members for accessible projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view project members for accessible projects" ON public.anggota_proyek FOR SELECT USING (public.has_project_access(id_proyek));


--
-- Name: anggota_proyek; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.anggota_proyek ENABLE ROW LEVEL SECURITY;

--
-- Name: catatan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.catatan ENABLE ROW LEVEL SECURITY;

--
-- Name: dataset; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dataset ENABLE ROW LEVEL SECURITY;

--
-- Name: filter_tersimpan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.filter_tersimpan ENABLE ROW LEVEL SECURITY;

--
-- Name: jenis_konten; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jenis_konten ENABLE ROW LEVEL SECURITY;

--
-- Name: kampanye; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kampanye ENABLE ROW LEVEL SECURITY;

--
-- Name: log_impor; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.log_impor ENABLE ROW LEVEL SECURITY;

--
-- Name: pertanyaan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pertanyaan ENABLE ROW LEVEL SECURITY;

--
-- Name: platform; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform ENABLE ROW LEVEL SECURITY;

--
-- Name: postingan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.postingan ENABLE ROW LEVEL SECURITY;

--
-- Name: profil; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profil ENABLE ROW LEVEL SECURITY;

--
-- Name: proyek; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proyek ENABLE ROW LEVEL SECURITY;

--
-- Name: target_kpi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.target_kpi ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


