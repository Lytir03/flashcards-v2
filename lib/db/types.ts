export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      card_states: {
        Row: {
          created_at: string
          deck_id: string
          due_on: string
          ease_factor: number
          flashcard_id: string
          id: string
          interval_days: number
          lapses: number
          last_reviewed_at: string | null
          repetitions: number
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          due_on?: string
          ease_factor?: number
          flashcard_id: string
          id?: string
          interval_days?: number
          lapses?: number
          last_reviewed_at?: string | null
          repetitions?: number
          state?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          due_on?: string
          ease_factor?: number
          flashcard_id?: string
          id?: string
          interval_days?: number
          lapses?: number
          last_reviewed_at?: string | null
          repetitions?: number
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_states_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_states_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_answers: {
        Row: {
          answered_at: string
          challenge_id: string
          id: string
          is_correct: boolean
          points: number
          question_id: string
          response_ms: number
          selected_index: number | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          challenge_id: string
          id?: string
          is_correct: boolean
          points?: number
          question_id: string
          response_ms: number
          selected_index?: number | null
          user_id: string
        }
        Update: {
          answered_at?: string
          challenge_id?: string
          id?: string
          is_correct?: boolean
          points?: number
          question_id?: string
          response_ms?: number
          selected_index?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_answers_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "challenge_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_questions: {
        Row: {
          challenge_id: string
          choices: Json
          correct_index: number
          flashcard_id: string | null
          id: string
          position: number
          question: string
        }
        Insert: {
          challenge_id: string
          choices: Json
          correct_index: number
          flashcard_id?: string | null
          id?: string
          position: number
          question: string
        }
        Update: {
          challenge_id?: string
          choices?: Json
          correct_index?: number
          flashcard_id?: string | null
          id?: string
          position?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_questions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_questions_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_results: {
        Row: {
          challenge_id: string
          correct_count: number
          created_at: string
          deck_id: string
          id: string
          outcome: string
          score: number
          total_time_ms: number
          user_id: string
        }
        Insert: {
          challenge_id: string
          correct_count?: number
          created_at?: string
          deck_id: string
          id?: string
          outcome: string
          score?: number
          total_time_ms?: number
          user_id: string
        }
        Update: {
          challenge_id?: string
          correct_count?: number
          created_at?: string
          deck_id?: string
          id?: string
          outcome?: string
          score?: number
          total_time_ms?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_results_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_results_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenger_id: string
          completed_at: string | null
          created_at: string
          deck_id: string
          expires_at: string
          id: string
          opponent_id: string | null
          question_count: number
          seconds_per_question: number
          started_at: string | null
          status: string
          winner_id: string | null
        }
        Insert: {
          challenger_id: string
          completed_at?: string | null
          created_at?: string
          deck_id: string
          expires_at?: string
          id?: string
          opponent_id?: string | null
          question_count?: number
          seconds_per_question?: number
          started_at?: string | null
          status?: string
          winner_id?: string | null
        }
        Update: {
          challenger_id?: string
          completed_at?: string | null
          created_at?: string
          deck_id?: string
          expires_at?: string
          id?: string
          opponent_id?: string | null
          question_count?: number
          seconds_per_question?: number
          started_at?: string | null
          status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_subscriptions: {
        Row: {
          created_at: string
          deck_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_subscriptions_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          card_count: number
          color: string
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          card_count?: number
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          card_count?: number
          color?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "decks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          answer: string
          created_at: string
          deck_id: string
          id: string
          origin: string
          owner_id: string
          question: string
          source_id: string | null
          source_page_number: number | null
          status: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          deck_id: string
          id?: string
          origin?: string
          owner_id: string
          question: string
          source_id?: string | null
          source_page_number?: number | null
          status?: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          deck_id?: string
          id?: string
          origin?: string
          owner_id?: string
          question?: string
          source_id?: string | null
          source_page_number?: number | null
          status?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bot_skill_level: string | null
          course_of_study: string | null
          created_at: string
          current_streak: number
          daily_email_enabled: boolean
          display_name: string
          id: string
          is_bot: boolean
          last_reminded_on: string | null
          last_studied_on: string | null
          longest_streak: number
          onboarded_at: string | null
          reminder_hour: number
          timezone: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bot_skill_level?: string | null
          course_of_study?: string | null
          created_at?: string
          current_streak?: number
          daily_email_enabled?: boolean
          display_name: string
          id: string
          is_bot?: boolean
          last_reminded_on?: string | null
          last_studied_on?: string | null
          longest_streak?: number
          onboarded_at?: string | null
          reminder_hour?: number
          timezone?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bot_skill_level?: string | null
          course_of_study?: string | null
          created_at?: string
          current_streak?: number
          daily_email_enabled?: boolean
          display_name?: string
          id?: string
          is_bot?: boolean
          last_reminded_on?: string | null
          last_studied_on?: string | null
          longest_streak?: number
          onboarded_at?: string | null
          reminder_hour?: number
          timezone?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_logs: {
        Row: {
          deck_id: string
          duration_ms: number | null
          flashcard_id: string
          id: string
          mode: string
          new_ease: number | null
          new_interval: number | null
          prev_ease: number | null
          prev_interval: number | null
          rating: string
          reviewed_at: string
          user_id: string
        }
        Insert: {
          deck_id: string
          duration_ms?: number | null
          flashcard_id: string
          id?: string
          mode?: string
          new_ease?: number | null
          new_interval?: number | null
          prev_ease?: number | null
          prev_interval?: number | null
          rating: string
          reviewed_at?: string
          user_id: string
        }
        Update: {
          deck_id?: string
          duration_ms?: number | null
          flashcard_id?: string
          id?: string
          mode?: string
          new_ease?: number | null
          new_interval?: number | null
          prev_ease?: number | null
          prev_interval?: number | null
          rating?: string
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_logs_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_logs_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      source_pages: {
        Row: {
          conflicts: Json | null
          created_at: string
          id: string
          model: string | null
          owner_id: string
          page_number: number
          source_id: string
          text: string | null
          text_layer: string | null
        }
        Insert: {
          conflicts?: Json | null
          created_at?: string
          id?: string
          model?: string | null
          owner_id: string
          page_number: number
          source_id: string
          text?: string | null
          text_layer?: string | null
        }
        Update: {
          conflicts?: Json | null
          created_at?: string
          id?: string
          model?: string | null
          owner_id?: string
          page_number?: number
          source_id?: string
          text?: string | null
          text_layer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_pages_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_pages_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          char_count: number | null
          created_at: string
          deck_id: string
          error_message: string | null
          extracted_text: string | null
          extraction_method: string | null
          filename: string
          id: string
          mime_type: string
          owner_id: string
          page_count: number | null
          quality_note: string | null
          size_bytes: number | null
          status: string
          storage_path: string
          text_layer: string | null
          updated_at: string
        }
        Insert: {
          char_count?: number | null
          created_at?: string
          deck_id: string
          error_message?: string | null
          extracted_text?: string | null
          extraction_method?: string | null
          filename: string
          id?: string
          mime_type: string
          owner_id: string
          page_count?: number | null
          quality_note?: string | null
          size_bytes?: number | null
          status?: string
          storage_path: string
          text_layer?: string | null
          updated_at?: string
        }
        Update: {
          char_count?: number | null
          created_at?: string
          deck_id?: string
          error_message?: string | null
          extracted_text?: string | null
          extraction_method?: string | null
          filename?: string
          id?: string
          mime_type?: string
          owner_id?: string
          page_count?: number | null
          quality_note?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string
          text_layer?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sources_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      weekly_leaderboard: {
        Row: {
          avatar_url: string | null
          deck_id: string | null
          display_name: string | null
          matches_played: number | null
          total_score: number | null
          user_id: string | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_results_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

