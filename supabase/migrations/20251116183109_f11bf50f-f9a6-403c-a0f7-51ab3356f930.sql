-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE app_role AS ENUM ('admin', 'user');
CREATE TYPE source_type AS ENUM ('upload_csv', 'google_sheet', 'sample');
CREATE TYPE import_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE period_type AS ENUM ('weekly', 'monthly');
CREATE TYPE scope_type AS ENUM ('post', 'week', 'global');
CREATE TYPE project_role AS ENUM ('owner', 'editor', 'viewer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'user'
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create projects table (UMKM)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create project_members table for multi-user access
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_project project_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Create platforms table (master data)
CREATE TABLE public.platforms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#000000',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default platforms
INSERT INTO public.platforms (name, display_name, color) VALUES
  ('instagram', 'Instagram', '#E4405F'),
  ('tiktok', 'TikTok', '#000000'),
  ('youtube_short', 'YouTube Shorts', '#FF0000'),
  ('x', 'X (Twitter)', '#1DA1F2'),
  ('facebook', 'Facebook', '#1877F2');

-- Create content_types table
CREATE TABLE public.content_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default content types
INSERT INTO public.content_types (name, display_name) VALUES
  ('image', 'Gambar'),
  ('video', 'Video'),
  ('reel', 'Reel'),
  ('story', 'Story'),
  ('carousel', 'Carousel'),
  ('other', 'Lainnya');

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create kpi_targets table
CREATE TABLE public.kpi_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period_type period_type NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_avg_er NUMERIC,
  target_followers NUMERIC,
  target_total_reach NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create datasets table
CREATE TABLE public.datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type source_type NOT NULL DEFAULT 'upload_csv',
  storage_path TEXT,
  row_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create posts table (main transaction data)
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES public.platforms(id),
  content_type_id UUID NOT NULL REFERENCES public.content_types(id),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  post_id TEXT NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL,
  caption TEXT,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  saved INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  followers INTEGER NOT NULL DEFAULT 0,
  engagement INTEGER GENERATED ALWAYS AS (likes + comments + shares + saved) STORED,
  engagement_rate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN reach > 0 THEN (likes + comments + shares + saved)::decimal / reach * 100 ELSE 0 END
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for posts table
CREATE INDEX idx_posts_project_dataset ON public.posts(project_id, dataset_id);
CREATE INDEX idx_posts_posted_at ON public.posts(posted_at);
CREATE INDEX idx_posts_platform ON public.posts(platform_id);
CREATE INDEX idx_posts_content_type ON public.posts(content_type_id);
CREATE INDEX idx_posts_engagement_rate ON public.posts(engagement_rate);

-- Create imports_log table
CREATE TABLE public.imports_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  status import_status NOT NULL DEFAULT 'pending',
  message TEXT,
  invalid_rows_count INTEGER NOT NULL DEFAULT 0,
  missing_columns JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create saved_filters table
CREATE TABLE public.saved_filters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  page TEXT NOT NULL,
  filter_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_type scope_type NOT NULL,
  scope_key TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imports_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Helper function to check if user has access to project
CREATE OR REPLACE FUNCTION public.has_project_access(project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid()
    UNION
    SELECT 1 FROM public.project_members WHERE project_id = project_id AND user_id = auth.uid()
  );
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- RLS Policies for projects
CREATE POLICY "Users can view accessible projects"
  ON public.projects FOR SELECT
  USING (user_id = auth.uid() OR public.has_project_access(id));

CREATE POLICY "Users can create own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Project owners can update"
  ON public.projects FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Project owners can delete"
  ON public.projects FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for project_members
CREATE POLICY "Users can view project members for accessible projects"
  ON public.project_members FOR SELECT
  USING (public.has_project_access(project_id));

CREATE POLICY "Project owners can manage members"
  ON public.project_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_id AND user_id = auth.uid()
  ));

-- RLS Policies for platforms (all can read, only admin can modify)
CREATE POLICY "Everyone can view active platforms"
  ON public.platforms FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert platforms"
  ON public.platforms FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update platforms"
  ON public.platforms FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete platforms"
  ON public.platforms FOR DELETE
  USING (public.is_admin());

-- RLS Policies for content_types (all can read, only admin can modify)
CREATE POLICY "Everyone can view active content types"
  ON public.content_types FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert content types"
  ON public.content_types FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update content types"
  ON public.content_types FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete content types"
  ON public.content_types FOR DELETE
  USING (public.is_admin());

-- RLS Policies for campaigns
CREATE POLICY "Users can view campaigns for accessible projects"
  ON public.campaigns FOR SELECT
  USING (public.has_project_access(project_id));

CREATE POLICY "Users can manage campaigns for accessible projects"
  ON public.campaigns FOR ALL
  USING (public.has_project_access(project_id));

-- RLS Policies for kpi_targets
CREATE POLICY "Users can view KPI targets for accessible projects"
  ON public.kpi_targets FOR SELECT
  USING (public.has_project_access(project_id));

CREATE POLICY "Users can manage KPI targets for accessible projects"
  ON public.kpi_targets FOR ALL
  USING (public.has_project_access(project_id));

-- RLS Policies for datasets
CREATE POLICY "Users can view datasets for accessible projects"
  ON public.datasets FOR SELECT
  USING (public.has_project_access(project_id));

CREATE POLICY "Users can manage datasets for accessible projects"
  ON public.datasets FOR ALL
  USING (public.has_project_access(project_id));

-- RLS Policies for posts
CREATE POLICY "Users can view posts for accessible projects"
  ON public.posts FOR SELECT
  USING (public.has_project_access(project_id));

CREATE POLICY "Users can manage posts for accessible projects"
  ON public.posts FOR ALL
  USING (public.has_project_access(project_id));

-- RLS Policies for imports_log
CREATE POLICY "Users can view import logs for accessible datasets"
  ON public.imports_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.datasets WHERE id = dataset_id AND public.has_project_access(project_id)
  ));

CREATE POLICY "Users can create import logs for accessible datasets"
  ON public.imports_log FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.datasets WHERE id = dataset_id AND public.has_project_access(project_id)
  ));

-- RLS Policies for saved_filters
CREATE POLICY "Users can view own saved filters"
  ON public.saved_filters FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own saved filters"
  ON public.saved_filters FOR ALL
  USING (user_id = auth.uid());

-- RLS Policies for notes
CREATE POLICY "Users can view notes for accessible projects"
  ON public.notes FOR SELECT
  USING (public.has_project_access(project_id));

CREATE POLICY "Users can manage notes for accessible projects"
  ON public.notes FOR ALL
  USING (user_id = auth.uid() AND public.has_project_access(project_id));