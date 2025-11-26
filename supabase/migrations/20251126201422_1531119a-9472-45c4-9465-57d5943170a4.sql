-- Create competitor table
CREATE TABLE public.kompetitor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_proyek UUID NOT NULL REFERENCES public.proyek(id) ON DELETE CASCADE,
  nama_kompetitor TEXT NOT NULL,
  deskripsi_kompetitor TEXT,
  platform_kompetitor TEXT NOT NULL,
  handle_kompetitor TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kompetitor ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage competitors for accessible projects"
ON public.kompetitor
FOR ALL
USING (has_project_access(id_proyek));

CREATE POLICY "Users can view competitors for accessible projects"
ON public.kompetitor
FOR SELECT
USING (has_project_access(id_proyek));

-- Create competitor data table
CREATE TABLE public.data_kompetitor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_kompetitor UUID NOT NULL REFERENCES public.kompetitor(id) ON DELETE CASCADE,
  tanggal_data DATE NOT NULL,
  jumlah_followers INTEGER NOT NULL DEFAULT 0,
  rata_rata_engagement_rate NUMERIC,
  total_posts INTEGER NOT NULL DEFAULT 0,
  rata_rata_likes NUMERIC,
  rata_rata_comments NUMERIC,
  rata_rata_shares NUMERIC,
  rata_rata_reach NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(id_kompetitor, tanggal_data)
);

-- Enable RLS
ALTER TABLE public.data_kompetitor ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage competitor data for accessible projects"
ON public.data_kompetitor
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.kompetitor
  WHERE kompetitor.id = data_kompetitor.id_kompetitor
  AND has_project_access(kompetitor.id_proyek)
));

CREATE POLICY "Users can view competitor data for accessible projects"
ON public.data_kompetitor
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.kompetitor
  WHERE kompetitor.id = data_kompetitor.id_kompetitor
  AND has_project_access(kompetitor.id_proyek)
));

-- Create export history table
CREATE TABLE public.riwayat_export (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_proyek UUID NOT NULL REFERENCES public.proyek(id) ON DELETE CASCADE,
  id_pengguna UUID NOT NULL,
  jenis_export TEXT NOT NULL,
  nama_file TEXT NOT NULL,
  halaman_export TEXT NOT NULL,
  filter_export JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.riwayat_export ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create export history for accessible projects"
ON public.riwayat_export
FOR INSERT
WITH CHECK (id_pengguna = auth.uid() AND has_project_access(id_proyek));

CREATE POLICY "Users can view export history for accessible projects"
ON public.riwayat_export
FOR SELECT
USING (has_project_access(id_proyek));

-- Create indexes
CREATE INDEX idx_kompetitor_proyek ON public.kompetitor(id_proyek);
CREATE INDEX idx_data_kompetitor_kompetitor ON public.data_kompetitor(id_kompetitor);
CREATE INDEX idx_data_kompetitor_tanggal ON public.data_kompetitor(tanggal_data);
CREATE INDEX idx_riwayat_export_proyek ON public.riwayat_export(id_proyek);
CREATE INDEX idx_riwayat_export_pengguna ON public.riwayat_export(id_pengguna);