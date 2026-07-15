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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      media_items: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string | null
          external_id: string | null
          id: string
          metadata: Json
          overview: string | null
          title: string
          type: Database["public"]["Enums"]["media_type"]
          updated_at: string
          year: number | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json
          overview?: string | null
          title: string
          type: Database["public"]["Enums"]["media_type"]
          updated_at?: string
          year?: number | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json
          overview?: string | null
          title?: string
          type?: Database["public"]["Enums"]["media_type"]
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      media_tags: {
        Row: {
          media_id: string
          tag_id: string
          weight: number
        }
        Insert: {
          media_id: string
          tag_id: string
          weight?: number
        }
        Update: {
          media_id?: string
          tag_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_tags_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          consumed_on: string | null
          created_at: string
          id: string
          media_id: string
          rating: number
          updated_at: string
          user_id: string
          vibe_quote: string | null
        }
        Insert: {
          body?: string | null
          consumed_on?: string | null
          created_at?: string
          id?: string
          media_id: string
          rating: number
          updated_at?: string
          user_id: string
          vibe_quote?: string | null
        }
        Update: {
          body?: string | null
          consumed_on?: string | null
          created_at?: string
          id?: string
          media_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
          vibe_quote?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
        ]
      }
      shelf_items: {
        Row: {
          column_key: Database["public"]["Enums"]["shelf_column"]
          id: string
          media_id: string
          note: string | null
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          column_key?: Database["public"]["Enums"]["shelf_column"]
          id?: string
          media_id: string
          note?: string | null
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          column_key?: Database["public"]["Enums"]["shelf_column"]
          id?: string
          media_id?: string
          note?: string | null
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelf_items_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["tag_kind"]
          label: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["tag_kind"]
          label: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["tag_kind"]
          label?: string
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tag_preferences: {
        Row: {
          affinity: number
          tag_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affinity?: number
          tag_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          affinity?: number
          tag_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tag_preferences_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      pair_cross_media: {
        Args: { _limit?: number; _source_id: string }
        Returns: {
          media_id: string
          score: number
          shared_vibes: number
        }[]
      }
      recommend_media: {
        Args: {
          _limit?: number
          _type: Database["public"]["Enums"]["media_type"]
          _user_id: string
        }
        Returns: {
          media_id: string
          score: number
          shared_vibes: number
        }[]
      }
      recompute_user_tag_preferences: {
        Args: { _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      media_type: "book" | "movie" | "tv"
      shelf_column: "priority" | "later" | "reading" | "done"
      tag_kind: "vibe" | "genre"
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
      media_type: ["book", "movie", "tv"],
      shelf_column: ["priority", "later", "reading", "done"],
      tag_kind: ["vibe", "genre"],
    },
  },
} as const
