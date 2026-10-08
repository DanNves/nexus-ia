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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          assignee_id: string | null
          context: string
          created_at: string
          demand_id: string | null
          description: string
          due_date: string | null
          id: string
          is_demo_seed: boolean
          objective: string | null
          priority: string
          requester_id: string | null
          solution_id: string | null
          status: string
          title: string
          updated_at: string
          version_id: string | null
        }
        Insert: {
          assignee_id?: string | null
          context?: string
          created_at?: string
          demand_id?: string | null
          description?: string
          due_date?: string | null
          id: string
          is_demo_seed?: boolean
          objective?: string | null
          priority: string
          requester_id?: string | null
          solution_id?: string | null
          status: string
          title: string
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          assignee_id?: string | null
          context?: string
          created_at?: string
          demand_id?: string | null
          description?: string
          due_date?: string | null
          id?: string
          is_demo_seed?: boolean
          objective?: string | null
          priority?: string
          requester_id?: string | null
          solution_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_suggestions: {
        Row: {
          category: string | null
          cause: string | null
          confidence: number | null
          created_at: string
          evidence: Json
          existing_knowledge_id: string | null
          existing_ticket_id: string | null
          human_note: string | null
          id: string
          procedure: Json
          status: string
          summary: string | null
          ticket_id: string
          validated_at: string | null
          validated_by: string | null
          was_edited: boolean
        }
        Insert: {
          category?: string | null
          cause?: string | null
          confidence?: number | null
          created_at?: string
          evidence?: Json
          existing_knowledge_id?: string | null
          existing_ticket_id?: string | null
          human_note?: string | null
          id?: string
          procedure?: Json
          status?: string
          summary?: string | null
          ticket_id: string
          validated_at?: string | null
          validated_by?: string | null
          was_edited?: boolean
        }
        Update: {
          category?: string | null
          cause?: string | null
          confidence?: number | null
          created_at?: string
          evidence?: Json
          existing_knowledge_id?: string | null
          existing_ticket_id?: string | null
          human_note?: string | null
          id?: string
          procedure?: Json
          status?: string
          summary?: string | null
          ticket_id?: string
          validated_at?: string | null
          validated_by?: string | null
          was_edited?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_suggestions_existing_ticket_id_fkey"
            columns: ["existing_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_suggestions_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          recipient_id: string | null
          record_id: string
          record_type: string
          text: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          recipient_id?: string | null
          record_id: string
          record_type: string
          text: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          recipient_id?: string | null
          record_id?: string
          record_type?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      demands: {
        Row: {
          assignee_id: string | null
          context: string
          created_at: string
          description: string
          due_date: string | null
          id: string
          is_demo_seed: boolean
          objective: string | null
          priority: string
          requester_id: string | null
          solution_id: string | null
          status: string
          title: string
          updated_at: string
          version_id: string | null
        }
        Insert: {
          assignee_id?: string | null
          context?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id: string
          is_demo_seed?: boolean
          objective?: string | null
          priority: string
          requester_id?: string | null
          solution_id?: string | null
          status: string
          title: string
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          assignee_id?: string | null
          context?: string
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          is_demo_seed?: boolean
          objective?: string | null
          priority?: string
          requester_id?: string | null
          solution_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demands_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge: {
        Row: {
          context: string
          created_at: string
          description: string
          id: string
          is_demo_seed: boolean
          procedure: Json
          reuse_count: number
          revision: number
          solution_id: string | null
          source_ticket_id: string | null
          status: string
          title: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          version_id: string | null
        }
        Insert: {
          context?: string
          created_at?: string
          description?: string
          id: string
          is_demo_seed?: boolean
          procedure?: Json
          reuse_count?: number
          revision?: number
          solution_id?: string | null
          source_ticket_id?: string | null
          status: string
          title: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          version_id?: string | null
        }
        Update: {
          context?: string
          created_at?: string
          description?: string
          id?: string
          is_demo_seed?: boolean
          procedure?: Json
          reuse_count?: number
          revision?: number
          solution_id?: string | null
          source_ticket_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_source_ticket_id_fkey"
            columns: ["source_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          auth_user_id: string | null
          email: string | null
          id: string
          kind: string
          name: string
          role: string
        }
        Insert: {
          auth_user_id?: string | null
          email?: string | null
          id: string
          kind?: string
          name: string
          role: string
        }
        Update: {
          auth_user_id?: string | null
          email?: string | null
          id?: string
          kind?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      record_links: {
        Row: {
          created_at: string
          id: string
          relation: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          relation: string
          source_id: string
          source_type: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          relation?: string
          source_id?: string
          source_type?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      requirements: {
        Row: {
          acceptance_criteria: Json
          assignee_id: string | null
          business_rules: Json
          context: string
          created_at: string
          demand_id: string | null
          description: string
          id: string
          is_demo_seed: boolean
          requester_id: string | null
          solution_id: string | null
          status: string
          title: string
          updated_at: string
          version_id: string | null
        }
        Insert: {
          acceptance_criteria?: Json
          assignee_id?: string | null
          business_rules?: Json
          context?: string
          created_at?: string
          demand_id?: string | null
          description?: string
          id: string
          is_demo_seed?: boolean
          requester_id?: string | null
          solution_id?: string | null
          status: string
          title: string
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          acceptance_criteria?: Json
          assignee_id?: string | null
          business_rules?: Json
          context?: string
          created_at?: string
          demand_id?: string | null
          description?: string
          id?: string
          is_demo_seed?: boolean
          requester_id?: string | null
          solution_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirements_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirements_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirements_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirements_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirements_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          activity_id: string | null
          ai_category: string | null
          ai_confidence: number | null
          ai_status: string | null
          ai_summary: string | null
          assignee_id: string | null
          context: string
          created_at: string
          demand_id: string | null
          description: string
          id: string
          is_demo_seed: boolean
          next_action: string | null
          next_action_hint: string | null
          priority: string
          requester_id: string | null
          solution_id: string | null
          status: string
          title: string
          updated_at: string
          version_id: string | null
        }
        Insert: {
          activity_id?: string | null
          ai_category?: string | null
          ai_confidence?: number | null
          ai_status?: string | null
          ai_summary?: string | null
          assignee_id?: string | null
          context?: string
          created_at?: string
          demand_id?: string | null
          description?: string
          id: string
          is_demo_seed?: boolean
          next_action?: string | null
          next_action_hint?: string | null
          priority: string
          requester_id?: string | null
          solution_id?: string | null
          status: string
          title: string
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          activity_id?: string | null
          ai_category?: string | null
          ai_confidence?: number | null
          ai_status?: string | null
          ai_summary?: string | null
          assignee_id?: string | null
          context?: string
          created_at?: string
          demand_id?: string | null
          description?: string
          id?: string
          is_demo_seed?: boolean
          next_action?: string | null
          next_action_hint?: string | null
          priority?: string
          requester_id?: string | null
          solution_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
        ]
      }
      versions: {
        Row: {
          created_at: string
          id: string
          label: string
          release_date: string | null
          solution_id: string
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id: string
          label: string
          release_date?: string | null
          solution_id: string
          status: string
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          release_date?: string | null
          solution_id?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "versions_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      nexus_can_complete_ticket: {
        Args: { p_ticket_id: string }
        Returns: boolean
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
