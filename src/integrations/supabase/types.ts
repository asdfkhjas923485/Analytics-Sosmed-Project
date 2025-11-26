export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      anggota_proyek: {
        Row: {
          created_at: string
          id: string
          id_pengguna: string
          id_proyek: string
          peran_dalam_proyek: Database["public"]["Enums"]["project_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          id_pengguna: string
          id_proyek: string
          peran_dalam_proyek?: Database["public"]["Enums"]["project_role"]
        }
        Update: {
          created_at?: string
          id?: string
          id_pengguna?: string
          id_proyek?: string
          peran_dalam_proyek?: Database["public"]["Enums"]["project_role"]
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["id_proyek"]
            isOneToOne: false
            referencedRelation: "proyek"
            referencedColumns: ["id"]
          },
        ]
      }
      catatan: {
        Row: {
          created_at: string
          id: string
          id_dataset: string | null
          id_pengguna: string
          id_proyek: string
          isi_catatan: string
          jenis_scope: Database["public"]["Enums"]["scope_type"]
          kunci_scope: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          id_dataset?: string | null
          id_pengguna: string
          id_proyek: string
          isi_catatan: string
          jenis_scope: Database["public"]["Enums"]["scope_type"]
          kunci_scope?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          id_dataset?: string | null
          id_pengguna?: string
          id_proyek?: string
          isi_catatan?: string
          jenis_scope?: Database["public"]["Enums"]["scope_type"]
          kunci_scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_dataset_id_fkey"
            columns: ["id_dataset"]
            isOneToOne: false
            referencedRelation: "dataset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["id_proyek"]
            isOneToOne: false
            referencedRelation: "proyek"
            referencedColumns: ["id"]
          },
        ]
      }
      data_kompetitor: {
        Row: {
          created_at: string
          id: string
          id_kompetitor: string
          jumlah_followers: number
          rata_rata_comments: number | null
          rata_rata_engagement_rate: number | null
          rata_rata_likes: number | null
          rata_rata_reach: number | null
          rata_rata_shares: number | null
          tanggal_data: string
          total_posts: number
        }
        Insert: {
          created_at?: string
          id?: string
          id_kompetitor: string
          jumlah_followers?: number
          rata_rata_comments?: number | null
          rata_rata_engagement_rate?: number | null
          rata_rata_likes?: number | null
          rata_rata_reach?: number | null
          rata_rata_shares?: number | null
          tanggal_data: string
          total_posts?: number
        }
        Update: {
          created_at?: string
          id?: string
          id_kompetitor?: string
          jumlah_followers?: number
          rata_rata_comments?: number | null
          rata_rata_engagement_rate?: number | null
          rata_rata_likes?: number | null
          rata_rata_reach?: number | null
          rata_rata_shares?: number | null
          tanggal_data?: string
          total_posts?: number
        }
        Relationships: [
          {
            foreignKeyName: "data_kompetitor_id_kompetitor_fkey"
            columns: ["id_kompetitor"]
            isOneToOne: false
            referencedRelation: "kompetitor"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset: {
        Row: {
          created_at: string
          dataset_aktif: boolean
          id: string
          id_proyek: string
          jenis_sumber_dataset: Database["public"]["Enums"]["source_type"]
          jumlah_baris_dataset: number
          lokasi_berkas_dataset: string | null
          nama_dataset: string
        }
        Insert: {
          created_at?: string
          dataset_aktif?: boolean
          id?: string
          id_proyek: string
          jenis_sumber_dataset?: Database["public"]["Enums"]["source_type"]
          jumlah_baris_dataset?: number
          lokasi_berkas_dataset?: string | null
          nama_dataset: string
        }
        Update: {
          created_at?: string
          dataset_aktif?: boolean
          id?: string
          id_proyek?: string
          jenis_sumber_dataset?: Database["public"]["Enums"]["source_type"]
          jumlah_baris_dataset?: number
          lokasi_berkas_dataset?: string | null
          nama_dataset?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets_project_id_fkey"
            columns: ["id_proyek"]
            isOneToOne: false
            referencedRelation: "proyek"
            referencedColumns: ["id"]
          },
        ]
      }
      filter_tersimpan: {
        Row: {
          created_at: string
          halaman: string
          id: string
          id_pengguna: string
          id_proyek: string
          nama_filter: string
          nilai_filter_json: Json
        }
        Insert: {
          created_at?: string
          halaman: string
          id?: string
          id_pengguna: string
          id_proyek: string
          nama_filter: string
          nilai_filter_json: Json
        }
        Update: {
          created_at?: string
          halaman?: string
          id?: string
          id_pengguna?: string
          id_proyek?: string
          nama_filter?: string
          nilai_filter_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "saved_filters_project_id_fkey"
            columns: ["id_proyek"]
            isOneToOne: false
            referencedRelation: "proyek"
            referencedColumns: ["id"]
          },
        ]
      }
      jenis_konten: {
        Row: {
          created_at: string
          id: string
          jenis_konten_aktif: boolean
          kode_jenis_konten: string
          nama_jenis_konten: string
        }
        Insert: {
          created_at?: string
          id?: string
          jenis_konten_aktif?: boolean
          kode_jenis_konten: string
          nama_jenis_konten: string
        }
        Update: {
          created_at?: string
          id?: string
          jenis_konten_aktif?: boolean
          kode_jenis_konten?: string
          nama_jenis_konten?: string
        }
        Relationships: []
      }
      kampanye: {
        Row: {
          catatan_kampanye: string | null
          created_at: string
          id: string
          id_proyek: string
          nama_kampanye: string
          tanggal_mulai_kampanye: string | null
          tanggal_selesai_kampanye: string | null
        }
        Insert: {
          catatan_kampanye?: string | null
          created_at?: string
          id?: string
          id_proyek: string
          nama_kampanye: string
          tanggal_mulai_kampanye?: string | null
          tanggal_selesai_kampanye?: string | null
        }
        Update: {
          catatan_kampanye?: string | null
          created_at?: string
          id?: string
          id_proyek?: string
          nama_kampanye?: string
          tanggal_mulai_kampanye?: string | null
          tanggal_selesai_kampanye?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_project_id_fkey"
            columns: ["id_proyek"]
            isOneToOne: false
            referencedRelation: "proyek"
            referencedColumns: ["id"]
          },
        ]
      }
      kompetitor: {
        Row: {
          created_at: string
          deskripsi_kompetitor: string | null
          handle_kompetitor: string | null
          id: string
          id_proyek: string
          nama_kompetitor: string
          platform_kompetitor: string
        }
        Insert: {
          created_at?: string
          deskripsi_kompetitor?: string | null
          handle_kompetitor?: string | null
          id?: string
          id_proyek: string
          nama_kompetitor: string
          platform_kompetitor: string
        }
        Update: {
          created_at?: string
          deskripsi_kompetitor?: string | null
          handle_kompetitor?: string | null
          id?: string
          id_proyek?: string
          nama_kompetitor?: string
          platform_kompetitor?: string
        }
        Relationships: [
          {
            foreignKeyName: "kompetitor_id_proyek_fkey"
            columns: ["id_proyek"]
            isOneToOne: false
            referencedRelation: "proyek"
            referencedColumns: ["id"]
          },
        ]
      }
      log_impor: {
        Row: {
          created_at: string
          id: string
          id_dataset: string
          jumlah_baris_tidak_valid: number
          kolom_hilang: Json | null
          pesan: string | null
          status_impor: Database["public"]["Enums"]["import_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          id_dataset: string
          jumlah_baris_tidak_valid?: number
          kolom_hilang?: Json | null
          pesan?: string | null
          status_impor?: Database["public"]["Enums"]["import_status"]
        }
        Update: {
          created_at?: string
          id?: string
          id_dataset?: string
          jumlah_baris_tidak_valid?: number
          kolom_hilang?: Json | null
          pesan?: string | null
          status_impor?: Database["public"]["Enums"]["import_status"]
        }
        Relationships: [
          {
            foreignKeyName: "imports_log_dataset_id_fkey"
            columns: ["id_dataset"]
            isOneToOne: false
            referencedRelation: "dataset"
            referencedColumns: ["id"]
          },
        ]
      }
      pertanyaan: {
        Row: {
          created_at: string
          dijawab_oleh: string | null
          id: string
          id_pengguna: string
          id_proyek: string
          isi_pertanyaan: string
          jawaban: string | null
          judul_pertanyaan: string
          komentar_rating: string | null
          rating: number | null
          rating_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dijawab_oleh?: string | null
          id?: string
          id_pengguna: string
          id_proyek: string
          isi_pertanyaan: string
          jawaban?: string | null
          judul_pertanyaan: string
          komentar_rating?: string | null
          rating?: number | null
          rating_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dijawab_oleh?: string | null
          id?: string
          id_pengguna?: string
          id_proyek?: string
          isi_pertanyaan?: string
          jawaban?: string | null
          judul_pertanyaan?: string
          komentar_rating?: string | null
          rating?: number | null
          rating_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pertanyaan_pengguna"
            columns: ["id_pengguna"]
            isOneToOne: false
            referencedRelation: "profil"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pertanyaan_pengguna"
            columns: ["id_pengguna"]
            isOneToOne: false
            referencedRelation: "user_display_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_proyek"
            columns: ["id_proyek"]
            isOneToOne: false
            referencedRelation: "proyek"
            referencedColumns: ["id"]
          },
        ]
      }
      platform: {
        Row: {
          created_at: string
          id: string
          kode_platform: string
          nama_platform: string
          platform_aktif: boolean
          warna_platform: string
        }
        Insert: {
          created_at?: string
          id?: string
          kode_platform: string
          nama_platform: string
          platform_aktif?: boolean
          warna_platform?: string
        }
        Update: {
          created_at?: string
          id?: string
          kode_platform?: string
          nama_platform?: string
          platform_aktif?: boolean
          warna_platform?: string
        }
        Relationships: []
      }
      postingan: {
        Row: {
          created_at: string
          engagement_rate_persen: number | null
          id: string
          id_dataset: string
          id_jenis_konten: string
          id_kampanye: string | null
          id_platform: string
          id_proyek: string
          jumlah_followers: number
          jumlah_komentar: number
          jumlah_likes: number
          jumlah_reach: number
          jumlah_saved: number
          jumlah_shares: number
          jumlah_views: number
          kode_postingan: string
          teks_caption: string | null
          total_engagement: number | null
          waktu_diposting: string
        }
        Insert: {
          created_at?: string
          engagement_rate_persen?: number | null
          id?: string
          id_dataset: string
          id_jenis_konten: string
          id_kampanye?: string | null
          id_platform: string
          id_proyek: string
          jumlah_followers?: number
          jumlah_komentar?: number
          jumlah_likes?: number
          jumlah_reach?: number
          jumlah_saved?: number
          jumlah_shares?: number
          jumlah_views?: number
          kode_postingan: string
          teks_caption?: string | null
          total_engagement?: number | null
          waktu_diposting: string
        }
        Update: {
          created_at?: string
          engagement_rate_persen?: number | null
          id?: string
          id_dataset?: string
          id_jenis_konten?: string
          id_kampanye?: string | null
          id_platform?: string
          id_proyek?: string
          jumlah_followers?: number
          jumlah_komentar?: number
          jumlah_likes?: number
          jumlah_reach?: number
          jumlah_saved?: number
          jumlah_shares?: number
          jumlah_views?: number
          kode_postingan?: string
          teks_caption?: string | null
          total_engagement?: number | null
          waktu_diposting?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_campaign_id_fkey"
            columns: ["id_kampanye"]
            isOneToOne: false
            referencedRelation: "kampanye"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_content_type_id_fkey"
            columns: ["id_jenis_konten"]
            isOneToOne: false
            referencedRelation: "jenis_konten"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_dataset_id_fkey"
            columns: ["id_dataset"]
            isOneToOne: false
            referencedRelation: "dataset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_platform_id_fkey"
            columns: ["id_platform"]
            isOneToOne: false
            referencedRelation: "platform"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_project_id_fkey"
            columns: ["id_proyek"]
            isOneToOne: false
            referencedRelation: "proyek"
            referencedColumns: ["id"]
          },
        ]
      }
      profil: {
        Row: {
          bahasa: string | null
          created_at: string
          foto_profil_url: string | null
          id: string
          nama_lengkap: string | null
          peran: Database["public"]["Enums"]["app_role"]
          preferensi_dashboard: Json | null
        }
        Insert: {
          bahasa?: string | null
          created_at?: string
          foto_profil_url?: string | null
          id: string
          nama_lengkap?: string | null
          peran?: Database["public"]["Enums"]["app_role"]
          preferensi_dashboard?: Json | null
        }
        Update: {
          bahasa?: string | null
          created_at?: string
          foto_profil_url?: string | null
          id?: string
          nama_lengkap?: string | null
          peran?: Database["public"]["Enums"]["app_role"]
          preferensi_dashboard?: Json | null
        }
        Relationships: []
      }
      proyek: {
        Row: {
          created_at: string
          deskripsi_proyek: string | null
          id: string
          id_pemilik: string
          nama_proyek: string
        }
        Insert: {
          created_at?: string
          deskripsi_proyek?: string | null
          id?: string
          id_pemilik: string
          nama_proyek: string
        }
        Update: {
          created_at?: string
          deskripsi_proyek?: string | null
          id?: string
          id_pemilik?: string
          nama_proyek?: string
        }
        Relationships: []
      }
      riwayat_export: {
        Row: {
          created_at: string
          filter_export: Json | null
          halaman_export: string
          id: string
          id_pengguna: string
          id_proyek: string
          jenis_export: string
          nama_file: string
        }
        Insert: {
          created_at?: string
          filter_export?: Json | null
          halaman_export: string
          id?: string
          id_pengguna: string
          id_proyek: string
          jenis_export: string
          nama_file: string
        }
        Update: {
          created_at?: string
          filter_export?: Json | null
          halaman_export?: string
          id?: string
          id_pengguna?: string
          id_proyek?: string
          jenis_export?: string
          nama_file?: string
        }
        Relationships: [
          {
            foreignKeyName: "riwayat_export_id_proyek_fkey"
            columns: ["id_proyek"]
            isOneToOne: false
            referencedRelation: "proyek"
            referencedColumns: ["id"]
          },
        ]
      }
      target_kpi: {
        Row: {
          created_at: string
          id: string
          id_proyek: string
          jenis_periode: Database["public"]["Enums"]["period_type"]
          tanggal_mulai_periode: string
          tanggal_selesai_periode: string
          target_jumlah_followers: number | null
          target_rata_rata_er: number | null
          target_total_jangkauan: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          id_proyek: string
          jenis_periode: Database["public"]["Enums"]["period_type"]
          tanggal_mulai_periode: string
          tanggal_selesai_periode: string
          target_jumlah_followers?: number | null
          target_rata_rata_er?: number | null
          target_total_jangkauan?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          id_proyek?: string
          jenis_periode?: Database["public"]["Enums"]["period_type"]
          tanggal_mulai_periode?: string
          tanggal_selesai_periode?: string
          target_jumlah_followers?: number | null
          target_rata_rata_er?: number | null
          target_total_jangkauan?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_targets_project_id_fkey"
            columns: ["id_proyek"]
            isOneToOne: false
            referencedRelation: "proyek"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_display_info: {
        Row: {
          created_at: string | null
          id: string | null
          nama_lengkap: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          nama_lengkap?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          nama_lengkap?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_display_name: { Args: { user_id: string }; Returns: string }
      has_project_access: { Args: { project_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      import_status: "pending" | "success" | "failed"
      period_type: "weekly" | "monthly"
      project_role: "owner" | "editor" | "viewer"
      scope_type: "post" | "week" | "global"
      source_type: "upload_csv" | "google_sheet" | "sample"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      import_status: ["pending", "success", "failed"],
      period_type: ["weekly", "monthly"],
      project_role: ["owner", "editor", "viewer"],
      scope_type: ["post", "week", "global"],
      source_type: ["upload_csv", "google_sheet", "sample"],
    },
  },
} as const
