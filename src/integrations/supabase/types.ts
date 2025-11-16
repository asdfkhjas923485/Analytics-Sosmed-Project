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
      campaigns: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          name: string
          notes: string | null
          project_id: string
          start_date: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          project_id: string
          start_date?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_types: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      datasets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          project_id: string
          row_count: number
          source_type: Database["public"]["Enums"]["source_type"]
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          project_id: string
          row_count?: number
          source_type?: Database["public"]["Enums"]["source_type"]
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          project_id?: string
          row_count?: number
          source_type?: Database["public"]["Enums"]["source_type"]
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "datasets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      imports_log: {
        Row: {
          created_at: string
          dataset_id: string
          id: string
          invalid_rows_count: number
          message: string | null
          missing_columns: Json | null
          status: Database["public"]["Enums"]["import_status"]
        }
        Insert: {
          created_at?: string
          dataset_id: string
          id?: string
          invalid_rows_count?: number
          message?: string | null
          missing_columns?: Json | null
          status?: Database["public"]["Enums"]["import_status"]
        }
        Update: {
          created_at?: string
          dataset_id?: string
          id?: string
          invalid_rows_count?: number
          message?: string | null
          missing_columns?: Json | null
          status?: Database["public"]["Enums"]["import_status"]
        }
        Relationships: [
          {
            foreignKeyName: "imports_log_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_targets: {
        Row: {
          created_at: string
          id: string
          period_end: string
          period_start: string
          period_type: Database["public"]["Enums"]["period_type"]
          project_id: string
          target_avg_er: number | null
          target_followers: number | null
          target_total_reach: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          period_type: Database["public"]["Enums"]["period_type"]
          project_id: string
          target_avg_er?: number | null
          target_followers?: number | null
          target_total_reach?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          period_type?: Database["public"]["Enums"]["period_type"]
          project_id?: string
          target_avg_er?: number | null
          target_followers?: number | null
          target_total_reach?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_targets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          dataset_id: string | null
          id: string
          project_id: string
          scope_key: string | null
          scope_type: Database["public"]["Enums"]["scope_type"]
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          dataset_id?: string | null
          id?: string
          project_id: string
          scope_key?: string | null
          scope_type: Database["public"]["Enums"]["scope_type"]
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          dataset_id?: string | null
          id?: string
          project_id?: string
          scope_key?: string | null
          scope_type?: Database["public"]["Enums"]["scope_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      platforms: {
        Row: {
          color: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          campaign_id: string | null
          caption: string | null
          comments: number
          content_type_id: string
          created_at: string
          dataset_id: string
          engagement: number | null
          engagement_rate: number | null
          followers: number
          id: string
          likes: number
          platform_id: string
          post_id: string
          posted_at: string
          project_id: string
          reach: number
          saved: number
          shares: number
          views: number
        }
        Insert: {
          campaign_id?: string | null
          caption?: string | null
          comments?: number
          content_type_id: string
          created_at?: string
          dataset_id: string
          engagement?: number | null
          engagement_rate?: number | null
          followers?: number
          id?: string
          likes?: number
          platform_id: string
          post_id: string
          posted_at: string
          project_id: string
          reach?: number
          saved?: number
          shares?: number
          views?: number
        }
        Update: {
          campaign_id?: string | null
          caption?: string | null
          comments?: number
          content_type_id?: string
          created_at?: string
          dataset_id?: string
          engagement?: number | null
          engagement_rate?: number | null
          followers?: number
          id?: string
          likes?: number
          platform_id?: string
          post_id?: string
          posted_at?: string
          project_id?: string
          reach?: number
          saved?: number
          shares?: number
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_content_type_id_fkey"
            columns: ["content_type_id"]
            isOneToOne: false
            referencedRelation: "content_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role_in_project: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role_in_project?: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role_in_project?: Database["public"]["Enums"]["project_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_filters: {
        Row: {
          created_at: string
          filter_json: Json
          id: string
          name: string
          page: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filter_json: Json
          id?: string
          name: string
          page: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          filter_json?: Json
          id?: string
          name?: string
          page?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_filters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
