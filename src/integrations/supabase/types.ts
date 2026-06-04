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
      bookings: {
        Row: {
          business_id: string
          created_at: string
          deposit_amount: number | null
          event_date: string | null
          id: string
          is_demo: boolean
          lead_id: string | null
          notes: string | null
          status: string
          total_amount: number | null
        }
        Insert: {
          business_id: string
          created_at?: string
          deposit_amount?: number | null
          event_date?: string | null
          id?: string
          is_demo?: boolean
          lead_id?: string | null
          notes?: string | null
          status?: string
          total_amount?: number | null
        }
        Update: {
          business_id?: string
          created_at?: string
          deposit_amount?: number | null
          event_date?: string | null
          id?: string
          is_demo?: boolean
          lead_id?: string | null
          notes?: string | null
          status?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      business_admin_metadata: {
        Row: {
          business_id: string
          created_at: string
          internal_notes: string | null
          outreach_email: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          internal_notes?: string | null
          outreach_email?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          internal_notes?: string | null
          outreach_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_admin_metadata_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      business_events: {
        Row: {
          business_id: string
          created_at: string
          end_time: string | null
          event_date: string | null
          id: string
          is_demo: boolean
          is_public: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          latitude: number | null
          location: string | null
          longitude: number | null
          notes: string | null
          start_time: string | null
          tag: string | null
          title: string
          weekday: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          end_time?: string | null
          event_date?: string | null
          id?: string
          is_demo?: boolean
          is_public?: boolean
          kind?: Database["public"]["Enums"]["event_kind"]
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          notes?: string | null
          start_time?: string | null
          tag?: string | null
          title: string
          weekday?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          end_time?: string | null
          event_date?: string | null
          id?: string
          is_demo?: boolean
          is_public?: boolean
          kind?: Database["public"]["Enums"]["event_kind"]
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          notes?: string | null
          start_time?: string | null
          tag?: string | null
          title?: string
          weekday?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_photos: {
        Row: {
          business_id: string
          caption: string | null
          created_at: string
          id: string
          is_demo: boolean
          sort_order: number
          url: string
        }
        Insert: {
          business_id: string
          caption?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          sort_order?: number
          url: string
        }
        Update: {
          business_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          is_demo?: boolean
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_photos_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_subcategories: {
        Row: {
          business_id: string
          category_id: string
          created_at: string
          id: string
        }
        Insert: {
          business_id: string
          category_id: string
          created_at?: string
          id?: string
        }
        Update: {
          business_id?: string
          category_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          booking_inquiry_enabled: boolean
          category_id: string | null
          catering_available: boolean
          city: string | null
          contact_name: string | null
          created_at: string
          cuisine: string | null
          current_address: string | null
          current_latitude: number | null
          current_longitude: number | null
          description: string | null
          email: string | null
          emoji: string | null
          facebook: string | null
          hero_image_url: string | null
          id: string
          instagram: string | null
          internal_notes: string | null
          is_demo: boolean
          is_featured: boolean
          is_published: boolean
          listing_status: Database["public"]["Enums"]["listing_status"]
          logo_url: string | null
          name: string
          online_ordering_url: string | null
          order_button_label: string | null
          ordering_enabled: boolean
          outreach_email: string | null
          owner_id: string | null
          phone: string | null
          region: string | null
          service_area: string | null
          slug: string
          status: Database["public"]["Enums"]["business_status"]
          tagline: string | null
          today_hours: string | null
          today_latitude: number | null
          today_location: string | null
          today_longitude: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          booking_inquiry_enabled?: boolean
          category_id?: string | null
          catering_available?: boolean
          city?: string | null
          contact_name?: string | null
          created_at?: string
          cuisine?: string | null
          current_address?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          description?: string | null
          email?: string | null
          emoji?: string | null
          facebook?: string | null
          hero_image_url?: string | null
          id?: string
          instagram?: string | null
          internal_notes?: string | null
          is_demo?: boolean
          is_featured?: boolean
          is_published?: boolean
          listing_status?: Database["public"]["Enums"]["listing_status"]
          logo_url?: string | null
          name: string
          online_ordering_url?: string | null
          order_button_label?: string | null
          ordering_enabled?: boolean
          outreach_email?: string | null
          owner_id?: string | null
          phone?: string | null
          region?: string | null
          service_area?: string | null
          slug: string
          status?: Database["public"]["Enums"]["business_status"]
          tagline?: string | null
          today_hours?: string | null
          today_latitude?: number | null
          today_location?: string | null
          today_longitude?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          booking_inquiry_enabled?: boolean
          category_id?: string | null
          catering_available?: boolean
          city?: string | null
          contact_name?: string | null
          created_at?: string
          cuisine?: string | null
          current_address?: string | null
          current_latitude?: number | null
          current_longitude?: number | null
          description?: string | null
          email?: string | null
          emoji?: string | null
          facebook?: string | null
          hero_image_url?: string | null
          id?: string
          instagram?: string | null
          internal_notes?: string | null
          is_demo?: boolean
          is_featured?: boolean
          is_published?: boolean
          listing_status?: Database["public"]["Enums"]["listing_status"]
          logo_url?: string | null
          name?: string
          online_ordering_url?: string | null
          order_button_label?: string | null
          ordering_enabled?: boolean
          outreach_email?: string | null
          owner_id?: string | null
          phone?: string | null
          region?: string | null
          service_area?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["business_status"]
          tagline?: string | null
          today_hours?: string | null
          today_latitude?: number | null
          today_location?: string | null
          today_longitude?: number | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_requests: {
        Row: {
          amount_total: number | null
          booking_id: string | null
          business_id: string
          checkout_url: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          deposit_amount: number
          deposit_percentage: number
          due_date: string | null
          id: string
          is_demo: boolean
          lead_id: string | null
          notes: string | null
          paid_at: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount_total?: number | null
          booking_id?: string | null
          business_id: string
          checkout_url?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          deposit_amount: number
          deposit_percentage?: number
          due_date?: string | null
          id?: string
          is_demo?: boolean
          lead_id?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_total?: number | null
          booking_id?: string | null
          business_id?: string
          checkout_url?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          deposit_amount?: number
          deposit_percentage?: number
          due_date?: string | null
          id?: string
          is_demo?: boolean
          lead_id?: string | null
          notes?: string | null
          paid_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_demo: boolean
          lead_id: string
          sender_role: string
          sender_user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_demo?: boolean
          lead_id: string
          sender_role: string
          sender_user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          lead_id?: string
          sender_role?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          business_id: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          estimated_value: number | null
          event_date: string | null
          event_type: string | null
          guest_count: string | null
          id: string
          internal_notes: string | null
          is_archived: boolean
          is_demo: boolean
          is_spam: boolean
          message: string | null
          source: string | null
          stage: Database["public"]["Enums"]["lead_stage"]
          updated_at: string
        }
        Insert: {
          business_id: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          estimated_value?: number | null
          event_date?: string | null
          event_type?: string | null
          guest_count?: string | null
          id?: string
          internal_notes?: string | null
          is_archived?: boolean
          is_demo?: boolean
          is_spam?: boolean
          message?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
        }
        Update: {
          business_id?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          estimated_value?: number | null
          event_date?: string | null
          event_type?: string | null
          guest_count?: string | null
          id?: string
          internal_notes?: string | null
          is_archived?: boolean
          is_demo?: boolean
          is_spam?: boolean
          message?: string | null
          source?: string | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_demo: boolean
          name: string
          sort_order: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          business_id: string
          category_id: string
          created_at: string
          description: string | null
          dietary_tags: string[] | null
          id: string
          is_available: boolean
          is_demo: boolean
          is_featured: boolean
          name: string
          price: string | null
          sort_order: number
        }
        Insert: {
          business_id: string
          category_id: string
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          is_available?: boolean
          is_demo?: boolean
          is_featured?: boolean
          name: string
          price?: string | null
          sort_order?: number
        }
        Update: {
          business_id?: string
          category_id?: string
          created_at?: string
          description?: string | null
          dietary_tags?: string[] | null
          id?: string
          is_available?: boolean
          is_demo?: boolean
          is_featured?: boolean
          name?: string
          price?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_preferences: {
        Row: {
          business_id: string
          created_at: string
          deposit_percentage: number
          email_notifications_enabled: boolean
          external_payment_url: string | null
          id: string
          is_demo: boolean
          manual_deposit_instructions: string | null
          new_lead_notifications_enabled: boolean
          owner_reply_notifications_enabled: boolean
          payment_mode: string
          sms_notifications_enabled: boolean
          stripe_deposits_enabled: boolean
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          deposit_percentage?: number
          email_notifications_enabled?: boolean
          external_payment_url?: string | null
          id?: string
          is_demo?: boolean
          manual_deposit_instructions?: string | null
          new_lead_notifications_enabled?: boolean
          owner_reply_notifications_enabled?: boolean
          payment_mode?: string
          sms_notifications_enabled?: boolean
          stripe_deposits_enabled?: boolean
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          deposit_percentage?: number
          email_notifications_enabled?: boolean
          external_payment_url?: string | null
          id?: string
          is_demo?: boolean
          manual_deposit_instructions?: string | null
          new_lead_notifications_enabled?: boolean
          owner_reply_notifications_enabled?: boolean
          payment_mode?: string
          sms_notifications_enabled?: boolean
          stripe_deposits_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          owner_title: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          owner_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          owner_title?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_locations: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          end_time: string | null
          id: string
          is_demo: boolean
          is_recurring: boolean
          label: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          sort_order: number
          start_time: string | null
          updated_at: string
          weekday: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_demo?: boolean
          is_recurring?: boolean
          label: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          sort_order?: number
          start_time?: string | null
          updated_at?: string
          weekday?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          end_time?: string | null
          id?: string
          is_demo?: boolean
          is_recurring?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          sort_order?: number
          start_time?: string | null
          updated_at?: string
          weekday?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_business: {
        Args: { _business_id: string }
        Returns: {
          booking_inquiry_enabled: boolean
          category_id: string | null
          catering_available: boolean
          city: string | null
          contact_name: string | null
          created_at: string
          cuisine: string | null
          current_address: string | null
          current_latitude: number | null
          current_longitude: number | null
          description: string | null
          email: string | null
          emoji: string | null
          facebook: string | null
          hero_image_url: string | null
          id: string
          instagram: string | null
          internal_notes: string | null
          is_demo: boolean
          is_featured: boolean
          is_published: boolean
          listing_status: Database["public"]["Enums"]["listing_status"]
          logo_url: string | null
          name: string
          online_ordering_url: string | null
          order_button_label: string | null
          ordering_enabled: boolean
          outreach_email: string | null
          owner_id: string | null
          phone: string | null
          region: string | null
          service_area: string | null
          slug: string
          status: Database["public"]["Enums"]["business_status"]
          tagline: string | null
          today_hours: string | null
          today_latitude: number | null
          today_location: string | null
          today_longitude: number | null
          updated_at: string
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "businesses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      owns_business: {
        Args: { _business_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "owner"
      business_status: "open" | "soon" | "closed"
      event_kind: "weekly" | "one_off"
      lead_stage:
        | "new"
        | "contacted"
        | "quote_sent"
        | "pending"
        | "booked"
        | "completed"
        | "lost"
      listing_status:
        | "draft"
        | "unclaimed"
        | "claimed_free"
        | "premium"
        | "archived"
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
      app_role: ["admin", "owner"],
      business_status: ["open", "soon", "closed"],
      event_kind: ["weekly", "one_off"],
      lead_stage: [
        "new",
        "contacted",
        "quote_sent",
        "pending",
        "booked",
        "completed",
        "lost",
      ],
      listing_status: [
        "draft",
        "unclaimed",
        "claimed_free",
        "premium",
        "archived",
      ],
    },
  },
} as const
