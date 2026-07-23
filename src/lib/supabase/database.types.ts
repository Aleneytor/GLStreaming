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
      asignaciones_inventario: {
        Row: {
          alcance: string
          capacidad_fisica_snapshot: number | null
          capacidad_vendible_consumida_snapshot: number | null
          consume_capacidad: boolean
          created_by: string | null
          cuenta_id: string
          estado_cierre: string
          fin: string | null
          id: string
          inicio: string
          modalidad_id: string
          motivo_fin: string | null
          producto_plataforma_id: string
          suscripcion_id: string
          unidad_id: string | null
        }
        Insert: {
          alcance: string
          capacidad_fisica_snapshot?: number | null
          capacidad_vendible_consumida_snapshot?: number | null
          consume_capacidad?: boolean
          created_by?: string | null
          cuenta_id: string
          estado_cierre?: string
          fin?: string | null
          id?: string
          inicio?: string
          modalidad_id: string
          motivo_fin?: string | null
          producto_plataforma_id: string
          suscripcion_id: string
          unidad_id?: string | null
        }
        Update: {
          alcance?: string
          capacidad_fisica_snapshot?: number | null
          capacidad_vendible_consumida_snapshot?: number | null
          consume_capacidad?: boolean
          created_by?: string | null
          cuenta_id?: string
          estado_cierre?: string
          fin?: string | null
          id?: string
          inicio?: string
          modalidad_id?: string
          motivo_fin?: string | null
          producto_plataforma_id?: string
          suscripcion_id?: string
          unidad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_inventario_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_inventario_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_inventario_modalidad_id_fkey"
            columns: ["modalidad_id"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_inventario_producto_plataforma_id_fkey"
            columns: ["producto_plataforma_id"]
            isOneToOne: false
            referencedRelation: "productos_plataforma"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_inventario_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "suscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asignaciones_inventario_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades_inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          nombre: string
          notas: string | null
          whatsapp_normalizado: string | null
          whatsapp_original: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nombre: string
          notas?: string | null
          whatsapp_normalizado?: string | null
          whatsapp_original?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nombre?: string
          notas?: string | null
          whatsapp_normalizado?: string | null
          whatsapp_original?: string | null
        }
        Relationships: []
      }
      contactos_comerciales: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          nombre: string
          notas: string | null
          whatsapp_normalizado: string | null
          whatsapp_original: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nombre: string
          notas?: string | null
          whatsapp_normalizado?: string | null
          whatsapp_original?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          nombre?: string
          notas?: string | null
          whatsapp_normalizado?: string | null
          whatsapp_original?: string | null
        }
        Relationships: []
      }
      credenciales_cuenta: {
        Row: {
          cliente_titular_id: string | null
          contrasena_cifrada: string | null
          created_at: string
          cuenta_id: string
          eliminada_at: string | null
          id: string
          login_cifrado: string | null
          login_fingerprint: string | null
          rotada_at: string | null
          tipo_credencial: string
          titular_tipo: string
          version_clave: number
        }
        Insert: {
          cliente_titular_id?: string | null
          contrasena_cifrada?: string | null
          created_at?: string
          cuenta_id: string
          eliminada_at?: string | null
          id?: string
          login_cifrado?: string | null
          login_fingerprint?: string | null
          rotada_at?: string | null
          tipo_credencial?: string
          titular_tipo?: string
          version_clave?: number
        }
        Update: {
          cliente_titular_id?: string | null
          contrasena_cifrada?: string | null
          created_at?: string
          cuenta_id?: string
          eliminada_at?: string | null
          id?: string
          login_cifrado?: string | null
          login_fingerprint?: string | null
          rotada_at?: string | null
          tipo_credencial?: string
          titular_tipo?: string
          version_clave?: number
        }
        Relationships: [
          {
            foreignKeyName: "credenciales_cuenta_cliente_titular_id_fkey"
            columns: ["cliente_titular_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciales_cuenta_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: true
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      cuenta_modalidades: {
        Row: {
          activa: boolean
          archived_at: string | null
          created_at: string
          cuenta_id: string
          id: string
          modalidad_id: string
        }
        Insert: {
          activa?: boolean
          archived_at?: string | null
          created_at?: string
          cuenta_id: string
          id?: string
          modalidad_id: string
        }
        Update: {
          activa?: boolean
          archived_at?: string | null
          created_at?: string
          cuenta_id?: string
          id?: string
          modalidad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuenta_modalidades_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuenta_modalidades_modalidad_id_fkey"
            columns: ["modalidad_id"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas: {
        Row: {
          alias: string | null
          archived_at: string | null
          capacidad: number
          capacidad_vendible_habilitada: number | null
          cliente_propietario_id: string | null
          created_at: string
          estado: string
          id: string
          producto_plataforma_id: string
          proveedor_operativo_id: string | null
          reutilizable: boolean
          titular_tipo: string
        }
        Insert: {
          alias?: string | null
          archived_at?: string | null
          capacidad: number
          capacidad_vendible_habilitada?: number | null
          cliente_propietario_id?: string | null
          created_at?: string
          estado?: string
          id?: string
          producto_plataforma_id: string
          proveedor_operativo_id?: string | null
          reutilizable?: boolean
          titular_tipo?: string
        }
        Update: {
          alias?: string | null
          archived_at?: string | null
          capacidad?: number
          capacidad_vendible_habilitada?: number | null
          cliente_propietario_id?: string | null
          created_at?: string
          estado?: string
          id?: string
          producto_plataforma_id?: string
          proveedor_operativo_id?: string | null
          reutilizable?: boolean
          titular_tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_cliente_propietario_id_fkey"
            columns: ["cliente_propietario_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_producto_plataforma_id_fkey"
            columns: ["producto_plataforma_id"]
            isOneToOne: false
            referencedRelation: "productos_plataforma"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuentas_proveedor_operativo_id_fkey"
            columns: ["proveedor_operativo_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_estado_suscripcion: {
        Row: {
          actor_id: string | null
          estado_anterior: string | null
          estado_nuevo: string
          id: string
          motivo: string | null
          ocurrio_at: string
          suscripcion_id: string
        }
        Insert: {
          actor_id?: string | null
          estado_anterior?: string | null
          estado_nuevo: string
          id?: string
          motivo?: string | null
          ocurrio_at?: string
          suscripcion_id: string
        }
        Update: {
          actor_id?: string | null
          estado_anterior?: string | null
          estado_nuevo?: string
          id?: string
          motivo?: string | null
          ocurrio_at?: string
          suscripcion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_estado_suscripcion_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_estado_suscripcion_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "suscripciones"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_estado_unidad: {
        Row: {
          actor_id: string | null
          estado_anterior: string | null
          estado_nuevo: string
          id: string
          motivo: string | null
          ocurrio_at: string
          unidad_id: string
        }
        Insert: {
          actor_id?: string | null
          estado_anterior?: string | null
          estado_nuevo: string
          id?: string
          motivo?: string | null
          ocurrio_at?: string
          unidad_id: string
        }
        Update: {
          actor_id?: string | null
          estado_anterior?: string | null
          estado_nuevo?: string
          id?: string
          motivo?: string | null
          ocurrio_at?: string
          unidad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_estado_unidad_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historial_estado_unidad_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades_inventario"
            referencedColumns: ["id"]
          },
        ]
      }
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
      pagos_cliente: {
        Row: {
          created_by: string | null
          estado: string
          id: string
          monto_ves: number
          monto_ves_esperado_snapshot: number | null
          ocurrido_at: string
          pago_original_id: string | null
          periodo_servicio_id: string
          referencia: string | null
          tasa_bcv_id: string | null
          tasa_paralela_id: string | null
          tipo: string
        }
        Insert: {
          created_by?: string | null
          estado?: string
          id?: string
          monto_ves: number
          monto_ves_esperado_snapshot?: number | null
          ocurrido_at?: string
          pago_original_id?: string | null
          periodo_servicio_id: string
          referencia?: string | null
          tasa_bcv_id?: string | null
          tasa_paralela_id?: string | null
          tipo?: string
        }
        Update: {
          created_by?: string | null
          estado?: string
          id?: string
          monto_ves?: number
          monto_ves_esperado_snapshot?: number | null
          ocurrido_at?: string
          pago_original_id?: string | null
          periodo_servicio_id?: string
          referencia?: string | null
          tasa_bcv_id?: string | null
          tasa_paralela_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cliente_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cliente_pago_original_id_fkey"
            columns: ["pago_original_id"]
            isOneToOne: false
            referencedRelation: "pagos_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cliente_periodo_servicio_id_fkey"
            columns: ["periodo_servicio_id"]
            isOneToOne: false
            referencedRelation: "periodos_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cliente_tasa_bcv_id_fkey"
            columns: ["tasa_bcv_id"]
            isOneToOne: false
            referencedRelation: "tasas_cambio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cliente_tasa_paralela_id_fkey"
            columns: ["tasa_paralela_id"]
            isOneToOne: false
            referencedRelation: "tasas_cambio"
            referencedColumns: ["id"]
          },
        ]
      }
      periodos_servicio: {
        Row: {
          cantidad_periodos: number
          clave_idempotencia: string | null
          created_at: string
          estado: string
          estado_datos_financieros: string
          fecha_renovacion: string
          fecha_venta: string | null
          id: string
          inicio: string
          monto_ves_esperado: number | null
          periodicidad: string
          precio_comercial_usd: number | null
          sesion_carga_inicial_id: string | null
          suscripcion_id: string
          tasa_bcv_id: string | null
          tasa_paralela_id: string | null
          tipo_operacion: string
          vendedor_id: string | null
        }
        Insert: {
          cantidad_periodos?: number
          clave_idempotencia?: string | null
          created_at?: string
          estado?: string
          estado_datos_financieros?: string
          fecha_renovacion: string
          fecha_venta?: string | null
          id?: string
          inicio: string
          monto_ves_esperado?: number | null
          periodicidad?: string
          precio_comercial_usd?: number | null
          sesion_carga_inicial_id?: string | null
          suscripcion_id: string
          tasa_bcv_id?: string | null
          tasa_paralela_id?: string | null
          tipo_operacion: string
          vendedor_id?: string | null
        }
        Update: {
          cantidad_periodos?: number
          clave_idempotencia?: string | null
          created_at?: string
          estado?: string
          estado_datos_financieros?: string
          fecha_renovacion?: string
          fecha_venta?: string | null
          id?: string
          inicio?: string
          monto_ves_esperado?: number | null
          periodicidad?: string
          precio_comercial_usd?: number | null
          sesion_carga_inicial_id?: string | null
          suscripcion_id?: string
          tasa_bcv_id?: string | null
          tasa_paralela_id?: string | null
          tipo_operacion?: string
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "periodos_servicio_sesion_carga_inicial_id_fkey"
            columns: ["sesion_carga_inicial_id"]
            isOneToOne: false
            referencedRelation: "sesiones_carga_inicial"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodos_servicio_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "suscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodos_servicio_tasa_bcv_id_fkey"
            columns: ["tasa_bcv_id"]
            isOneToOne: false
            referencedRelation: "tasas_cambio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodos_servicio_tasa_paralela_id_fkey"
            columns: ["tasa_paralela_id"]
            isOneToOne: false
            referencedRelation: "tasas_cambio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodos_servicio_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
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
      reservas_inventario: {
        Row: {
          alcance: string
          cliente_id: string | null
          created_by: string | null
          cuenta_id: string
          estado: string
          expira_at: string | null
          id: string
          modalidad_id: string
          producto_plataforma_id: string
          reservada_at: string
          resuelta_at: string | null
          solicitud_stock_id: string | null
          unidad_id: string | null
        }
        Insert: {
          alcance: string
          cliente_id?: string | null
          created_by?: string | null
          cuenta_id: string
          estado?: string
          expira_at?: string | null
          id?: string
          modalidad_id: string
          producto_plataforma_id: string
          reservada_at?: string
          resuelta_at?: string | null
          solicitud_stock_id?: string | null
          unidad_id?: string | null
        }
        Update: {
          alcance?: string
          cliente_id?: string | null
          created_by?: string | null
          cuenta_id?: string
          estado?: string
          expira_at?: string | null
          id?: string
          modalidad_id?: string
          producto_plataforma_id?: string
          reservada_at?: string
          resuelta_at?: string | null
          solicitud_stock_id?: string | null
          unidad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservas_inventario_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_inventario_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_inventario_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_inventario_modalidad_id_fkey"
            columns: ["modalidad_id"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_inventario_producto_plataforma_id_fkey"
            columns: ["producto_plataforma_id"]
            isOneToOne: false
            referencedRelation: "productos_plataforma"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_inventario_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades_inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      secretos_unidad: {
        Row: {
          created_at: string
          id: string
          pin_cifrado: string | null
          rotada_at: string | null
          secreto_adicional_cifrado: string | null
          unidad_id: string
          version_clave: number
        }
        Insert: {
          created_at?: string
          id?: string
          pin_cifrado?: string | null
          rotada_at?: string | null
          secreto_adicional_cifrado?: string | null
          unidad_id: string
          version_clave?: number
        }
        Update: {
          created_at?: string
          id?: string
          pin_cifrado?: string | null
          rotada_at?: string | null
          secreto_adicional_cifrado?: string | null
          unidad_id?: string
          version_clave?: number
        }
        Relationships: [
          {
            foreignKeyName: "secretos_unidad_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: true
            referencedRelation: "unidades_inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones_carga_inicial: {
        Row: {
          abierta_at: string
          abierta_por_id: string | null
          cerrada_at: string | null
          cerrada_por_id: string | null
          conteo_esperado: number | null
          estado: string
          fecha_corte: string
          id: string
          motivo: string | null
          producto_plataforma_id: string | null
          reapertura_de_id: string | null
          version: number
        }
        Insert: {
          abierta_at?: string
          abierta_por_id?: string | null
          cerrada_at?: string | null
          cerrada_por_id?: string | null
          conteo_esperado?: number | null
          estado?: string
          fecha_corte: string
          id?: string
          motivo?: string | null
          producto_plataforma_id?: string | null
          reapertura_de_id?: string | null
          version?: number
        }
        Update: {
          abierta_at?: string
          abierta_por_id?: string | null
          cerrada_at?: string | null
          cerrada_por_id?: string | null
          conteo_esperado?: number | null
          estado?: string
          fecha_corte?: string
          id?: string
          motivo?: string | null
          producto_plataforma_id?: string | null
          reapertura_de_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_carga_inicial_abierta_por_id_fkey"
            columns: ["abierta_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_carga_inicial_cerrada_por_id_fkey"
            columns: ["cerrada_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_carga_inicial_producto_plataforma_id_fkey"
            columns: ["producto_plataforma_id"]
            isOneToOne: false
            referencedRelation: "productos_plataforma"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sesiones_carga_inicial_reapertura_de_id_fkey"
            columns: ["reapertura_de_id"]
            isOneToOne: false
            referencedRelation: "sesiones_carga_inicial"
            referencedColumns: ["id"]
          },
        ]
      }
      suscripcion_contactos: {
        Row: {
          contacto_comercial_id: string
          created_at: string
          es_contacto_principal: boolean
          fin: string | null
          id: string
          inicio: string
          rol: string
          suscripcion_id: string
        }
        Insert: {
          contacto_comercial_id: string
          created_at?: string
          es_contacto_principal?: boolean
          fin?: string | null
          id?: string
          inicio?: string
          rol: string
          suscripcion_id: string
        }
        Update: {
          contacto_comercial_id?: string
          created_at?: string
          es_contacto_principal?: boolean
          fin?: string | null
          id?: string
          inicio?: string
          rol?: string
          suscripcion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suscripcion_contactos_contacto_comercial_id_fkey"
            columns: ["contacto_comercial_id"]
            isOneToOne: false
            referencedRelation: "contactos_comerciales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suscripcion_contactos_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "suscripciones"
            referencedColumns: ["id"]
          },
        ]
      }
      suscripciones: {
        Row: {
          cliente_id: string
          closed_at: string | null
          created_at: string
          estado: string
          id: string
          modalidad_id: string
          nota_renovacion: string | null
          producto_plataforma_id: string
          recontactar_el: string | null
          vendedor_origen_id: string | null
        }
        Insert: {
          cliente_id: string
          closed_at?: string | null
          created_at?: string
          estado?: string
          id?: string
          modalidad_id: string
          nota_renovacion?: string | null
          producto_plataforma_id: string
          recontactar_el?: string | null
          vendedor_origen_id?: string | null
        }
        Update: {
          cliente_id?: string
          closed_at?: string | null
          created_at?: string
          estado?: string
          id?: string
          modalidad_id?: string
          nota_renovacion?: string | null
          producto_plataforma_id?: string
          recontactar_el?: string | null
          vendedor_origen_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suscripciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suscripciones_modalidad_id_fkey"
            columns: ["modalidad_id"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suscripciones_producto_plataforma_id_fkey"
            columns: ["producto_plataforma_id"]
            isOneToOne: false
            referencedRelation: "productos_plataforma"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suscripciones_vendedor_origen_id_fkey"
            columns: ["vendedor_origen_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      tasas_cambio: {
        Row: {
          bs_por_usd: number
          created_at: string
          detalle_fuentes: Json | null
          estado: string
          fecha_vigencia: string | null
          fuente: string | null
          fuente_registro_id: string | null
          id: string
          observada_fuente_at: string | null
          obtenida_at: string
          payload_hash: string | null
          publicada_at: string | null
          tipo: string
          version: number
          vigente_desde: string
        }
        Insert: {
          bs_por_usd: number
          created_at?: string
          detalle_fuentes?: Json | null
          estado?: string
          fecha_vigencia?: string | null
          fuente?: string | null
          fuente_registro_id?: string | null
          id?: string
          observada_fuente_at?: string | null
          obtenida_at?: string
          payload_hash?: string | null
          publicada_at?: string | null
          tipo: string
          version?: number
          vigente_desde?: string
        }
        Update: {
          bs_por_usd?: number
          created_at?: string
          detalle_fuentes?: Json | null
          estado?: string
          fecha_vigencia?: string | null
          fuente?: string | null
          fuente_registro_id?: string | null
          id?: string
          observada_fuente_at?: string | null
          obtenida_at?: string
          payload_hash?: string | null
          publicada_at?: string | null
          tipo?: string
          version?: number
          vigente_desde?: string
        }
        Relationships: []
      }
      unidades_inventario: {
        Row: {
          archived_at: string | null
          created_at: string
          cuenta_id: string
          estado_operativo: string
          estado_preparacion: string
          id: string
          nombre_visible: string | null
          numero_slot: number
          tipo_unidad: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          cuenta_id: string
          estado_operativo?: string
          estado_preparacion?: string
          id?: string
          nombre_visible?: string | null
          numero_slot: number
          tipo_unidad?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          cuenta_id?: string
          estado_operativo?: string
          estado_preparacion?: string
          id?: string
          nombre_visible?: string | null
          numero_slot?: number
          tipo_unidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unidades_inventario_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
        ]
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

