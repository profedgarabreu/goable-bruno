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
      nf_perfis: {
        Row: {
          criado_em: string
          nome: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          nome?: string
          user_id: string
        }
        Update: {
          criado_em?: string
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      pend_arquivos: {
        Row: {
          campo_key: string
          enviado_em: string
          enviado_por_nome: string
          id: string
          item_id: string
          mime: string
          nome_original: string
          storage_path: string
          tamanho: number
        }
        Insert: {
          campo_key?: string
          enviado_em?: string
          enviado_por_nome: string
          id?: string
          item_id: string
          mime: string
          nome_original: string
          storage_path: string
          tamanho: number
        }
        Update: {
          campo_key?: string
          enviado_em?: string
          enviado_por_nome?: string
          id?: string
          item_id?: string
          mime?: string
          nome_original?: string
          storage_path?: string
          tamanho?: number
        }
        Relationships: [
          {
            foreignKeyName: "pend_arquivos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pend_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      pend_itens: {
        Row: {
          atualizado_em: string
          categoria: string
          comentario_goable: string
          config: Json
          criado_em: string
          descricao: string
          id: string
          link_id: string
          obrigatoria: boolean
          ordem: number
          prioridade: string
          status: string
          tipo: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          categoria?: string
          comentario_goable?: string
          config?: Json
          criado_em?: string
          descricao?: string
          id?: string
          link_id: string
          obrigatoria?: boolean
          ordem?: number
          prioridade: string
          status?: string
          tipo: string
          titulo: string
        }
        Update: {
          atualizado_em?: string
          categoria?: string
          comentario_goable?: string
          config?: Json
          criado_em?: string
          descricao?: string
          id?: string
          link_id?: string
          obrigatoria?: boolean
          ordem?: number
          prioridade?: string
          status?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pend_itens_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "pend_links"
            referencedColumns: ["id"]
          },
        ]
      }
      pend_links: {
        Row: {
          ativo: boolean
          criado_em: string
          expira_em: string | null
          id: string
          nome_cliente: string
          token: string
          ultimo_acesso_em: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          expira_em?: string | null
          id?: string
          nome_cliente: string
          token?: string
          ultimo_acesso_em?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          expira_em?: string | null
          id?: string
          nome_cliente?: string
          token?: string
          ultimo_acesso_em?: string | null
        }
        Relationships: []
      }
      pend_respostas: {
        Row: {
          id: string
          item_id: string
          respondido_em: string
          respondido_por_nome: string
          valor: Json
        }
        Insert: {
          id?: string
          item_id: string
          respondido_em?: string
          respondido_por_nome: string
          valor: Json
        }
        Update: {
          id?: string
          item_id?: string
          respondido_em?: string
          respondido_por_nome?: string
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pend_respostas_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "pend_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      pend_respostas_hist: {
        Row: {
          arquivado_em: string
          id: string
          item_id: string
          respondido_em: string
          respondido_por_nome: string
          valor: Json
        }
        Insert: {
          arquivado_em?: string
          id?: string
          item_id: string
          respondido_em: string
          respondido_por_nome: string
          valor: Json
        }
        Update: {
          arquivado_em?: string
          id?: string
          item_id?: string
          respondido_em?: string
          respondido_por_nome?: string
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pend_respostas_hist_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pend_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["nf_papel"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["nf_papel"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["nf_papel"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      nf_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["nf_papel"]
          _user_id: string
        }
        Returns: boolean
      }
      nf_signup_open: { Args: never; Returns: boolean }
      pend_register_file: {
        Args: {
          _autor: string
          _campo: string
          _item: string
          _max: number
          _mime: string
          _nome: string
          _path: string
          _tamanho: number
          _token: string
        }
        Returns: string
      }
      pend_remove_file: {
        Args: { _file: string; _item: string; _token: string }
        Returns: string
      }
      pend_submit: {
        Args: { _item: string; _nome: string; _token: string; _valor: Json }
        Returns: undefined
      }
      pend_submit_checked: {
        Args: {
          _config: Json
          _item: string
          _nome: string
          _obrigatoria: boolean
          _tipo: string
          _token: string
          _valor: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      nf_papel: "consultorio" | "admin_goable"
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
    Enums: {
      nf_papel: ["consultorio", "admin_goable"],
    },
  },
} as const
