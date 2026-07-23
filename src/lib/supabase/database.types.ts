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
      mecanismos_entrega: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          politica_revocacion_acceso: string | null
          tipo: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          politica_revocacion_acceso?: string | null
          tipo: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          politica_revocacion_acceso?: string | null
          tipo?: string
        }
        Relationships: []
      }
      modalidades: {
        Row: {
          activa: boolean
          alcance_asignacion: string
          created_at: string
          id: string
          nombre: string
          periodicidad_predeterminada: string
          plataforma_id: string
          tipo_modalidad: string
        }
        Insert: {
          activa?: boolean
          alcance_asignacion: string
          created_at?: string
          id?: string
          nombre: string
          periodicidad_predeterminada?: string
          plataforma_id: string
          tipo_modalidad: string
        }
        Update: {
          activa?: boolean
          alcance_asignacion?: string
          created_at?: string
          id?: string
          nombre?: string
          periodicidad_predeterminada?: string
          plataforma_id?: string
          tipo_modalidad?: string
        }
        Relationships: [
          {
            foreignKeyName: "modalidades_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "plataformas"
            referencedColumns: ["id"]
          },
        ]
      }
      plataformas: {
        Row: {
          activa: boolean
          created_at: string
          icono_url: string | null
          id: string
          nombre: string
          slug: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          icono_url?: string | null
          id?: string
          nombre: string
          slug: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          icono_url?: string | null
          id?: string
          nombre?: string
          slug?: string
        }
        Relationships: []
      }
      producto_modalidades: {
        Row: {
          activa: boolean
          archived_at: string | null
          created_at: string
          id: string
          mecanismo_entrega_id: string | null
          modalidad_id: string
          producto_plataforma_id: string
        }
        Insert: {
          activa?: boolean
          archived_at?: string | null
          created_at?: string
          id?: string
          mecanismo_entrega_id?: string | null
          modalidad_id: string
          producto_plataforma_id: string
        }
        Update: {
          activa?: boolean
          archived_at?: string | null
          created_at?: string
          id?: string
          mecanismo_entrega_id?: string | null
          modalidad_id?: string
          producto_plataforma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_modalidades_mecanismo_entrega_id_fkey"
            columns: ["mecanismo_entrega_id"]
            isOneToOne: false
            referencedRelation: "mecanismos_entrega"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_modalidades_modalidad_id_fkey"
            columns: ["modalidad_id"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producto_modalidades_producto_plataforma_id_fkey"
            columns: ["producto_plataforma_id"]
            isOneToOne: false
            referencedRelation: "productos_plataforma"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_plataforma: {
        Row: {
          activo: boolean
          archived_at: string | null
          capacidad_fija: number | null
          capacidad_max: number | null
          capacidad_min: number | null
          capacidad_vendible_predeterminada: number | null
          codigo: string
          created_at: string
          descripcion_operativa: string | null
          estado_comercial: string
          id: string
          nombre: string
          permite_renovaciones: boolean
          plataforma_id: string
          regla_capacidad: string
          reutilizable_predeterminado: boolean
          tipo_inventario: string
          tipo_unidad_fisica: string | null
          titularidad_predeterminada: string
        }
        Insert: {
          activo?: boolean
          archived_at?: string | null
          capacidad_fija?: number | null
          capacidad_max?: number | null
          capacidad_min?: number | null
          capacidad_vendible_predeterminada?: number | null
          codigo: string
          created_at?: string
          descripcion_operativa?: string | null
          estado_comercial?: string
          id?: string
          nombre: string
          permite_renovaciones?: boolean
          plataforma_id: string
          regla_capacidad: string
          reutilizable_predeterminado?: boolean
          tipo_inventario: string
          tipo_unidad_fisica?: string | null
          titularidad_predeterminada?: string
        }
        Update: {
          activo?: boolean
          archived_at?: string | null
          capacidad_fija?: number | null
          capacidad_max?: number | null
          capacidad_min?: number | null
          capacidad_vendible_predeterminada?: number | null
          codigo?: string
          created_at?: string
          descripcion_operativa?: string | null
          estado_comercial?: string
          id?: string
          nombre?: string
          permite_renovaciones?: boolean
          plataforma_id?: string
          regla_capacidad?: string
          reutilizable_predeterminado?: boolean
          tipo_inventario?: string
          tipo_unidad_fisica?: string | null
          titularidad_predeterminada?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_plataforma_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "plataformas"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre_o_alias: string | null
          notas: string | null
          telefono_normalizado: string | null
          telefono_original: string | null
          tipo: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre_o_alias?: string | null
          notas?: string | null
          telefono_normalizado?: string | null
          telefono_original?: string | null
          tipo?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre_o_alias?: string | null
          notas?: string | null
          telefono_normalizado?: string | null
          telefono_original?: string | null
          tipo?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          rol: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id: string
          nombre: string
          rol?: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          rol?: string
          updated_at?: string
        }
        Relationships: []
      }
      vendedores: {
        Row: {
          activo: boolean
          alias: string | null
          created_at: string
          id: string
          nombre: string
          usuario_id: string | null
        }
        Insert: {
          activo?: boolean
          alias?: string | null
          created_at?: string
          id?: string
          nombre: string
          usuario_id?: string | null
        }
        Update: {
          activo?: boolean
          alias?: string | null
          created_at?: string
          id?: string
          nombre?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendedores_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      es_admin: { Args: never; Returns: boolean }
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

