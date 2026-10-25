export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      folder_items: {
        Row: {
          added_at: string;
          folder_id: string;
          item_id: string;
        };
        ComputedFields: never;
        Insert: {
          added_at?: string;
          folder_id: string;
          item_id: string;
        };
        Update: {
          added_at?: string;
          folder_id?: string;
          item_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'folder_items_folder_id_fkey';
            columns: ['folder_id'];
            isOneToOne: false;
            referencedRelation: 'folders';
            referencedColumns: ['id'];
          },
        ];
      };
      folders: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          kind: Database['public']['Enums']['folder_kind'];
          name: string;
          system_key: string | null;
          topic_id: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          color: string;
          created_at?: string;
          id?: string;
          kind: Database['public']['Enums']['folder_kind'];
          name: string;
          system_key?: string | null;
          topic_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['folder_kind'];
          name?: string;
          system_key?: string | null;
          topic_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'folders_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      lesson_progress: {
        Row: {
          best_accuracy: number | null;
          completed_at: string | null;
          created_at: string;
          lesson_id: string;
          status: Database['public']['Enums']['lesson_status'];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          best_accuracy?: number | null;
          completed_at?: string | null;
          created_at?: string;
          lesson_id: string;
          status?: Database['public']['Enums']['lesson_status'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          best_accuracy?: number | null;
          completed_at?: string | null;
          created_at?: string;
          lesson_id?: string;
          status?: Database['public']['Enums']['lesson_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'lesson_progress_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          daily_minutes: number;
          display_name: string | null;
          goal: Database['public']['Enums']['learning_goal'] | null;
          id: string;
          level: Database['public']['Enums']['cefr_level'];
          spanish_variant: Database['public']['Enums']['spanish_variant'];
          timezone: string;
          ui_language: Database['public']['Enums']['ui_language'] | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          daily_minutes?: number;
          display_name?: string | null;
          goal?: Database['public']['Enums']['learning_goal'] | null;
          id: string;
          level?: Database['public']['Enums']['cefr_level'];
          spanish_variant?: Database['public']['Enums']['spanish_variant'];
          timezone?: string;
          ui_language?: Database['public']['Enums']['ui_language'] | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          daily_minutes?: number;
          display_name?: string | null;
          goal?: Database['public']['Enums']['learning_goal'] | null;
          id?: string;
          level?: Database['public']['Enums']['cefr_level'];
          spanish_variant?: Database['public']['Enums']['spanish_variant'];
          timezone?: string;
          ui_language?: Database['public']['Enums']['ui_language'] | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      review_cards: {
        Row: {
          created_at: string;
          difficulty: number;
          direction: string;
          due: string;
          elapsed_days: number;
          id: string;
          item_id: string;
          lapses: number;
          last_review: string | null;
          learning_steps: number;
          reps: number;
          scheduled_days: number;
          stability: number;
          state: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          difficulty?: number;
          direction?: string;
          due?: string;
          elapsed_days?: number;
          id?: string;
          item_id: string;
          lapses?: number;
          last_review?: string | null;
          learning_steps?: number;
          reps?: number;
          scheduled_days?: number;
          stability?: number;
          state?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          difficulty?: number;
          direction?: string;
          due?: string;
          elapsed_days?: number;
          id?: string;
          item_id?: string;
          lapses?: number;
          last_review?: string | null;
          learning_steps?: number;
          reps?: number;
          scheduled_days?: number;
          stability?: number;
          state?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'review_cards_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      review_logs: {
        Row: {
          card_id: string;
          client_id: string;
          created_at: string;
          elapsed_days: number;
          id: string;
          rating: number;
          reviewed_at: string;
          scheduled_days: number;
          state: number;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          card_id: string;
          client_id: string;
          created_at?: string;
          elapsed_days: number;
          id?: string;
          rating: number;
          reviewed_at: string;
          scheduled_days: number;
          state: number;
          user_id: string;
        };
        Update: {
          card_id?: string;
          client_id?: string;
          created_at?: string;
          elapsed_days?: number;
          id?: string;
          rating?: number;
          reviewed_at?: string;
          scheduled_days?: number;
          state?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'review_logs_card_user_fkey';
            columns: ['card_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'review_cards';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'review_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      streaks: {
        Row: {
          current: number;
          freezes: number;
          last_active_date: string | null;
          longest: number;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          current?: number;
          freezes?: number;
          last_active_date?: string | null;
          longest?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          current?: number;
          freezes?: number;
          last_active_date?: string | null;
          longest?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'streaks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      xp_events: {
        Row: {
          amount: number;
          client_id: string | null;
          created_at: string;
          id: number;
          ref_id: string | null;
          source: Database['public']['Enums']['xp_source'];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          client_id?: string | null;
          created_at?: string;
          id?: never;
          ref_id?: string | null;
          source: Database['public']['Enums']['xp_source'];
          user_id: string;
        };
        Update: {
          amount?: number;
          client_id?: string | null;
          created_at?: string;
          id?: never;
          ref_id?: string | null;
          source?: Database['public']['Enums']['xp_source'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'xp_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      difficult_item_ids: {
        Args: { p_now?: string; p_user_id: string };
        Returns: {
          item_id: string;
        }[];
      };
      remap_content_v2_ids: { Args: Record<PropertyKey, never>; Returns: undefined };
      save_lesson_progress: {
        Args: { p_best_accuracy: number; p_completed_at: string; p_lesson_id: string };
        Returns: {
          best_accuracy: number | null;
          completed_at: string | null;
          created_at: string;
          lesson_id: string;
          status: Database['public']['Enums']['lesson_status'];
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'lesson_progress';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      cefr_level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
      folder_kind: 'system' | 'custom';
      learning_goal: 'travel' | 'work' | 'relocation' | 'dele';
      lesson_status: 'in_progress' | 'completed';
      spanish_variant: 'spain' | 'latam';
      ui_language: 'ru' | 'uk' | 'en';
      xp_source: 'lesson' | 'review' | 'streak_bonus' | 'chat' | 'other';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      cefr_level: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
      folder_kind: ['system', 'custom'],
      learning_goal: ['travel', 'work', 'relocation', 'dele'],
      lesson_status: ['in_progress', 'completed'],
      spanish_variant: ['spain', 'latam'],
      ui_language: ['ru', 'uk', 'en'],
      xp_source: ['lesson', 'review', 'streak_bonus', 'chat', 'other'],
    },
  },
} as const;
