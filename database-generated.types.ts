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
      analytics: {
        Row: {
          created_at: string
          id: number
          songId: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          songId?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          songId?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_value_fkey"
            columns: ["songId"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      leader_position: {
        Row: {
          created_at: string
          leader_id: string
          setlist_item: number | null
          song: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          leader_id: string
          setlist_item?: number | null
          song?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          leader_id?: string
          setlist_item?: number | null
          song?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leader_position_setlist_item_fkey"
            columns: ["setlist_item"]
            isOneToOne: false
            referencedRelation: "setlist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leader_position_song_fkey"
            columns: ["song"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      setlist_items: {
        Row: {
          id: number
          position: number
          setlist_id: number
          song_id: number | null
          text: string | null
          text_id: number | null
        }
        Insert: {
          id?: number
          position?: number
          setlist_id: number
          song_id?: number | null
          text?: string | null
          text_id?: number | null
        }
        Update: {
          id?: number
          position?: number
          setlist_id?: number
          song_id?: number | null
          text?: string | null
          text_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "setlist_items_setlist_id_fkey"
            columns: ["setlist_id"]
            isOneToOne: false
            referencedRelation: "setlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_items_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "setlist_items_text_id_fkey"
            columns: ["text_id"]
            isOneToOne: false
            referencedRelation: "texts"
            referencedColumns: ["id"]
          },
        ]
      }
      setlists: {
        Row: {
          id: number
          name: string | null
        }
        Insert: {
          id?: number
          name?: string | null
        }
        Update: {
          id?: number
          name?: string | null
        }
        Relationships: []
      }
      slideshow_position: {
        Row: {
          created_at: string
          slideshow_id: string
          song: number | null
          step: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          slideshow_id: string
          song?: number | null
          step?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          slideshow_id?: string
          song?: number | null
          step?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slideshow_position_song_fkey"
            columns: ["song"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
        ]
      }
      song_requests: {
        Row: {
          created_at: string
          id: number
          is_done: boolean
          title: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_done?: boolean
          title: string
        }
        Update: {
          created_at?: string
          id?: number
          is_done?: boolean
          title?: string
        }
        Relationships: []
      }
      song_tag: {
        Row: {
          song_id: number
          tag_id: number
        }
        Insert: {
          song_id: number
          tag_id: number
        }
        Update: {
          song_id?: number
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "song_tag_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_tag_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          id: number
          sheet_music_url: string | null
          strophes: Json[] | null
          title: string
        }
        Insert: {
          id?: number
          sheet_music_url?: string | null
          strophes?: Json[] | null
          title: string
        }
        Update: {
          id?: number
          sheet_music_url?: string | null
          strophes?: Json[] | null
          title?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          id: number
          name: string | null
          svg: string | null
        }
        Insert: {
          color?: string | null
          id?: number
          name?: string | null
          svg?: string | null
        }
        Update: {
          color?: string | null
          id?: number
          name?: string | null
          svg?: string | null
        }
        Relationships: []
      }
      texts: {
        Row: {
          content: string
          created_at: string
          id: number
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: number
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: number
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_popular_songs: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          count: number
          title: string
        }[]
      }
    }
    Enums: {
      event_type: "get_song"
      strophe_quality: "VERSE" | "BRIDGE" | "CHORUS"
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
      event_type: ["get_song"],
      strophe_quality: ["VERSE", "BRIDGE", "CHORUS"],
    },
  },
} as const
