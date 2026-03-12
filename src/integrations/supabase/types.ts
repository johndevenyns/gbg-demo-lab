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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_resource_ids: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          resource_id: string
          type_key: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          resource_id: string
          type_key: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          resource_id?: string
          type_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      demo_environments: {
        Row: {
          approved_url: string | null
          button_color: string | null
          created_at: string | null
          created_by: string | null
          created_by_email: string | null
          customer_name: string
          customer_site_url: string | null
          form_steps: Json | null
          form_style: Json | null
          header_bg_color: string | null
          header_cta_selector: string | null
          header_cta_use_case_id: string | null
          header_text_color: string | null
          id: string
          include_address_verification: boolean | null
          include_qr: boolean | null
          industry_template: Database["public"]["Enums"]["industry_template"]
          is_active: boolean | null
          logo_url: string | null
          mirror_active_method: string
          mirror_html_css: string | null
          mirror_html_footer_html: string | null
          mirror_html_header_html: string | null
          mirror_screenshot_css: string | null
          mirror_screenshot_footer_html: string | null
          mirror_screenshot_header_html: string | null
          reference_id_prefix: string | null
          rejected_url: string | null
          resource_id: string | null
          resource_id_databio: string | null
          resource_id_dataonly: string | null
          resource_id_docbio: string | null
          return_url: string | null
          scraped_css: string | null
          scraped_footer_html: string | null
          scraped_header_html: string | null
          slug: string
          stored_test_data: Json | null
          updated_at: string | null
          uploaded_logo_url: string | null
          use_uploaded_logo: boolean | null
          verification_type: Database["public"]["Enums"]["verification_type"]
        }
        Insert: {
          approved_url?: string | null
          button_color?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_email?: string | null
          customer_name: string
          customer_site_url?: string | null
          form_steps?: Json | null
          form_style?: Json | null
          header_bg_color?: string | null
          header_cta_selector?: string | null
          header_cta_use_case_id?: string | null
          header_text_color?: string | null
          id?: string
          include_address_verification?: boolean | null
          include_qr?: boolean | null
          industry_template?: Database["public"]["Enums"]["industry_template"]
          is_active?: boolean | null
          logo_url?: string | null
          mirror_active_method?: string
          mirror_html_css?: string | null
          mirror_html_footer_html?: string | null
          mirror_html_header_html?: string | null
          mirror_screenshot_css?: string | null
          mirror_screenshot_footer_html?: string | null
          mirror_screenshot_header_html?: string | null
          reference_id_prefix?: string | null
          rejected_url?: string | null
          resource_id?: string | null
          resource_id_databio?: string | null
          resource_id_dataonly?: string | null
          resource_id_docbio?: string | null
          return_url?: string | null
          scraped_css?: string | null
          scraped_footer_html?: string | null
          scraped_header_html?: string | null
          slug: string
          stored_test_data?: Json | null
          updated_at?: string | null
          uploaded_logo_url?: string | null
          use_uploaded_logo?: boolean | null
          verification_type?: Database["public"]["Enums"]["verification_type"]
        }
        Update: {
          approved_url?: string | null
          button_color?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_email?: string | null
          customer_name?: string
          customer_site_url?: string | null
          form_steps?: Json | null
          form_style?: Json | null
          header_bg_color?: string | null
          header_cta_selector?: string | null
          header_cta_use_case_id?: string | null
          header_text_color?: string | null
          id?: string
          include_address_verification?: boolean | null
          include_qr?: boolean | null
          industry_template?: Database["public"]["Enums"]["industry_template"]
          is_active?: boolean | null
          logo_url?: string | null
          mirror_active_method?: string
          mirror_html_css?: string | null
          mirror_html_footer_html?: string | null
          mirror_html_header_html?: string | null
          mirror_screenshot_css?: string | null
          mirror_screenshot_footer_html?: string | null
          mirror_screenshot_header_html?: string | null
          reference_id_prefix?: string | null
          rejected_url?: string | null
          resource_id?: string | null
          resource_id_databio?: string | null
          resource_id_dataonly?: string | null
          resource_id_docbio?: string | null
          return_url?: string | null
          scraped_css?: string | null
          scraped_footer_html?: string | null
          scraped_header_html?: string | null
          slug?: string
          stored_test_data?: Json | null
          updated_at?: string | null
          uploaded_logo_url?: string | null
          use_uploaded_logo?: boolean | null
          verification_type?: Database["public"]["Enums"]["verification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "demo_environments_header_cta_use_case_id_fkey"
            columns: ["header_cta_use_case_id"]
            isOneToOne: false
            referencedRelation: "global_use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_use_case_links: {
        Row: {
          created_at: string
          demo_id: string
          display_order: number
          form_steps_override: Json | null
          id: string
          is_enabled: boolean
          page_content_override: Json | null
          updated_at: string
          use_case_id: string
          verification_type_override: string | null
        }
        Insert: {
          created_at?: string
          demo_id: string
          display_order?: number
          form_steps_override?: Json | null
          id?: string
          is_enabled?: boolean
          page_content_override?: Json | null
          updated_at?: string
          use_case_id: string
          verification_type_override?: string | null
        }
        Update: {
          created_at?: string
          demo_id?: string
          display_order?: number
          form_steps_override?: Json | null
          id?: string
          is_enabled?: boolean
          page_content_override?: Json | null
          updated_at?: string
          use_case_id?: string
          verification_type_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_use_case_links_demo_id_fkey"
            columns: ["demo_id"]
            isOneToOne: false
            referencedRelation: "demo_environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_use_case_links_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "global_use_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_users: {
        Row: {
          created_at: string
          created_by: string | null
          demo_id: string
          email: string
          id: string
          is_active: boolean
          password: string
          profile_data: Json | null
          registration_code: string | null
          registration_code_expires_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          demo_id: string
          email: string
          id?: string
          is_active?: boolean
          password: string
          profile_data?: Json | null
          registration_code?: string | null
          registration_code_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          demo_id?: string
          email?: string
          id?: string
          is_active?: boolean
          password?: string
          profile_data?: Json | null
          registration_code?: string | null
          registration_code_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_users_demo_id_fkey"
            columns: ["demo_id"]
            isOneToOne: false
            referencedRelation: "demo_environments"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          form_steps: Json
          form_style: Json | null
          id: string
          name: string
          show_fill_fail: boolean
          show_fill_pass: boolean
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          form_steps?: Json
          form_style?: Json | null
          id?: string
          name: string
          show_fill_fail?: boolean
          show_fill_pass?: boolean
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          form_steps?: Json
          form_style?: Json | null
          id?: string
          name?: string
          show_fill_fail?: boolean
          show_fill_pass?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      global_field_configs: {
        Row: {
          api_name: string
          category: string
          created_at: string
          display_name: string
          display_order: number
          field_type: string
          id: string
          is_api_field: boolean
          placeholder: string | null
          required_by_default: boolean
          updated_at: string
        }
        Insert: {
          api_name?: string
          category?: string
          created_at?: string
          display_name: string
          display_order?: number
          field_type: string
          id?: string
          is_api_field?: boolean
          placeholder?: string | null
          required_by_default?: boolean
          updated_at?: string
        }
        Update: {
          api_name?: string
          category?: string
          created_at?: string
          display_name?: string
          display_order?: number
          field_type?: string
          id?: string
          is_api_field?: boolean
          placeholder?: string | null
          required_by_default?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      global_use_cases: {
        Row: {
          created_at: string
          default_form_steps: Json | null
          default_page_content: Json | null
          default_verification_type: string | null
          description: string | null
          display_order: number
          icon_name: string | null
          id: string
          is_enabled: boolean
          show_fill_fail: boolean
          show_fill_pass: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_form_steps?: Json | null
          default_page_content?: Json | null
          default_verification_type?: string | null
          description?: string | null
          display_order?: number
          icon_name?: string | null
          id?: string
          is_enabled?: boolean
          show_fill_fail?: boolean
          show_fill_pass?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_form_steps?: Json | null
          default_page_content?: Json | null
          default_verification_type?: string | null
          description?: string | null
          display_order?: number
          icon_name?: string | null
          id?: string
          is_enabled?: boolean
          show_fill_fail?: boolean
          show_fill_pass?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mdl_providers: {
        Row: {
          config_options: Json | null
          country_code: string | null
          created_at: string
          description: string | null
          display_name: string
          display_order: number
          domain: string | null
          id: string
          is_enabled: boolean
          logo_url: string | null
          provider_key: string
          scope: string[] | null
          updated_at: string
        }
        Insert: {
          config_options?: Json | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          display_order?: number
          domain?: string | null
          id?: string
          is_enabled?: boolean
          logo_url?: string | null
          provider_key: string
          scope?: string[] | null
          updated_at?: string
        }
        Update: {
          config_options?: Json | null
          country_code?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          display_order?: number
          domain?: string | null
          id?: string
          is_enabled?: boolean
          logo_url?: string | null
          provider_key?: string
          scope?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      test_user_profiles: {
        Row: {
          created_at: string
          field_data: Json
          id: string
          profile_name: string
          profile_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_data?: Json
          id?: string
          profile_name: string
          profile_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_data?: Json
          id?: string
          profile_name?: string
          profile_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          theme?: string
          updated_at?: string
          user_id?: string
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
      verification_type_configs: {
        Row: {
          config_schema: Json | null
          created_at: string
          default_resource_id: string | null
          description: string | null
          display_name: string
          display_order: number
          icon_name: string | null
          id: string
          is_enabled: boolean
          requires_biometric: boolean
          requires_document: boolean
          supports_qr_code: boolean
          type_key: string
          updated_at: string
        }
        Insert: {
          config_schema?: Json | null
          created_at?: string
          default_resource_id?: string | null
          description?: string | null
          display_name: string
          display_order?: number
          icon_name?: string | null
          id?: string
          is_enabled?: boolean
          requires_biometric?: boolean
          requires_document?: boolean
          supports_qr_code?: boolean
          type_key: string
          updated_at?: string
        }
        Update: {
          config_schema?: Json | null
          created_at?: string
          default_resource_id?: string | null
          description?: string | null
          display_name?: string
          display_order?: number
          icon_name?: string | null
          id?: string
          is_enabled?: boolean
          requires_biometric?: boolean
          requires_document?: boolean
          supports_qr_code?: boolean
          type_key?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_first_admin: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_global_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "global_admin"
      industry_template:
        | "bank"
        | "rental_car"
        | "online_gambling"
        | "healthcare"
        | "insurance"
        | "retail"
        | "custom"
      verification_type: "docBio" | "dataBio" | "dataOnly"
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
      app_role: ["admin", "global_admin"],
      industry_template: [
        "bank",
        "rental_car",
        "online_gambling",
        "healthcare",
        "insurance",
        "retail",
        "custom",
      ],
      verification_type: ["docBio", "dataBio", "dataOnly"],
    },
  },
} as const
