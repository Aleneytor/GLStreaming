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
            foreignKeyName: "asignaciones_inventario_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "v_mis_ventas_revendedor"
            referencedColumns: ["suscripcion_id"]
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
      casos_incidencia_spotify: {
        Row: {
          asignacion_destino_id: string | null
          asignacion_origen_id: string | null
          error_no_sensible: string | null
          estado: string
          id: string
          identidad_destino_id: string | null
          identidad_origen_id: string | null
          incidencia_id: string
          iniciado_at: string
          resuelto_at: string | null
          suscripcion_id: string
          tipo_resolucion: string | null
        }
        Insert: {
          asignacion_destino_id?: string | null
          asignacion_origen_id?: string | null
          error_no_sensible?: string | null
          estado?: string
          id?: string
          identidad_destino_id?: string | null
          identidad_origen_id?: string | null
          incidencia_id: string
          iniciado_at?: string
          resuelto_at?: string | null
          suscripcion_id: string
          tipo_resolucion?: string | null
        }
        Update: {
          asignacion_destino_id?: string | null
          asignacion_origen_id?: string | null
          error_no_sensible?: string | null
          estado?: string
          id?: string
          identidad_destino_id?: string | null
          identidad_origen_id?: string | null
          incidencia_id?: string
          iniciado_at?: string
          resuelto_at?: string | null
          suscripcion_id?: string
          tipo_resolucion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "casos_incidencia_spotify_asignacion_destino_id_fkey"
            columns: ["asignacion_destino_id"]
            isOneToOne: false
            referencedRelation: "asignaciones_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casos_incidencia_spotify_asignacion_origen_id_fkey"
            columns: ["asignacion_origen_id"]
            isOneToOne: false
            referencedRelation: "asignaciones_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casos_incidencia_spotify_identidad_destino_id_fkey"
            columns: ["identidad_destino_id"]
            isOneToOne: false
            referencedRelation: "identidades_spotify"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casos_incidencia_spotify_identidad_origen_id_fkey"
            columns: ["identidad_origen_id"]
            isOneToOne: false
            referencedRelation: "identidades_spotify"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casos_incidencia_spotify_incidencia_id_fkey"
            columns: ["incidencia_id"]
            isOneToOne: false
            referencedRelation: "incidencias_spotify"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casos_incidencia_spotify_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "suscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "casos_incidencia_spotify_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "v_mis_ventas_revendedor"
            referencedColumns: ["suscripcion_id"]
          },
        ]
      }
      categorias_gasto: {
        Row: {
          activa: boolean
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      ciclos_proveedor: {
        Row: {
          capacidad_fisica_snapshot: number | null
          capacidad_vendible_snapshot: number | null
          confirmado_at: string | null
          costo_usdt: number
          costo_ves_snapshot: number | null
          created_at: string
          cuenta_id: string
          dia_ancla_proveedor: number
          estado: string
          id: string
          inicio: string
          proveedor_contacto_snapshot: string | null
          proveedor_id: string
          proveedor_nombre_snapshot: string
          proxima_renovacion: string
          referencia_no_sensible: string | null
          tasa_paralela_id: string | null
        }
        Insert: {
          capacidad_fisica_snapshot?: number | null
          capacidad_vendible_snapshot?: number | null
          confirmado_at?: string | null
          costo_usdt: number
          costo_ves_snapshot?: number | null
          created_at?: string
          cuenta_id: string
          dia_ancla_proveedor: number
          estado?: string
          id?: string
          inicio: string
          proveedor_contacto_snapshot?: string | null
          proveedor_id: string
          proveedor_nombre_snapshot: string
          proxima_renovacion: string
          referencia_no_sensible?: string | null
          tasa_paralela_id?: string | null
        }
        Update: {
          capacidad_fisica_snapshot?: number | null
          capacidad_vendible_snapshot?: number | null
          confirmado_at?: string | null
          costo_usdt?: number
          costo_ves_snapshot?: number | null
          created_at?: string
          cuenta_id?: string
          dia_ancla_proveedor?: number
          estado?: string
          id?: string
          inicio?: string
          proveedor_contacto_snapshot?: string | null
          proveedor_id?: string
          proveedor_nombre_snapshot?: string
          proxima_renovacion?: string
          referencia_no_sensible?: string | null
          tasa_paralela_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ciclos_proveedor_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ciclos_proveedor_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ciclos_proveedor_tasa_paralela_id_fkey"
            columns: ["tasa_paralela_id"]
            isOneToOne: false
            referencedRelation: "tasas_cambio"
            referencedColumns: ["id"]
          },
        ]
      }
      cierres_mensuales: {
        Row: {
          ajustes_clientes_ves: number
          ajustes_economicos_usd_paralela: number
          calculado_at: string | null
          cerrado_at: string | null
          cerrado_por_id: string | null
          cobros_ves: number
          costo_bloqueo_ves: number
          costo_cortesia_ves: number
          costo_no_reutilizable_sin_ingreso_ves: number
          costo_ocioso_ves: number
          costo_pausa_ves: number
          costo_proveedor_devengado_usdt: number
          costo_proveedor_devengado_ves: number
          costo_reserva_ves: number
          costo_saneamiento_ves: number
          created_at: string
          dias_no_reutilizables_sin_ingreso: number
          dias_unidad_bloqueados: number
          dias_unidad_capacidad: number
          dias_unidad_cortesia: number
          dias_unidad_disponibles: number
          dias_unidad_ocupados: number
          dias_unidad_pagados: number
          dias_unidad_pausa: number
          dias_unidad_reservados: number
          dias_unidad_saneamiento: number
          estado: string
          fin: string
          flujo_caja_valorizado_ves: number
          gastos_operativos_usdt: number
          gastos_operativos_ves: number
          id: string
          ingreso_cobrado_devengado_ves: number
          ingreso_comercial_devengado_usd: number
          ingreso_contractual_usd: number
          ingreso_economico_devengado_usd_paralela: number
          inicio: string
          margen_bruto_economico_usd_paralela: number
          margen_bruto_ves: number
          mes: string
          pagos_proveedor_usdt: number
          pagos_proveedor_ves: number
          reembolsos_clientes_ves: number
          resultado_operativo_economico_usd_paralela: number
          resultado_operativo_ves: number
          source_watermark: string | null
          tasa_bcv_id: string | null
          tasa_paralela_id: string | null
          version: number
          ves_esperados_devengados_clientes: number
        }
        Insert: {
          ajustes_clientes_ves?: number
          ajustes_economicos_usd_paralela?: number
          calculado_at?: string | null
          cerrado_at?: string | null
          cerrado_por_id?: string | null
          cobros_ves?: number
          costo_bloqueo_ves?: number
          costo_cortesia_ves?: number
          costo_no_reutilizable_sin_ingreso_ves?: number
          costo_ocioso_ves?: number
          costo_pausa_ves?: number
          costo_proveedor_devengado_usdt?: number
          costo_proveedor_devengado_ves?: number
          costo_reserva_ves?: number
          costo_saneamiento_ves?: number
          created_at?: string
          dias_no_reutilizables_sin_ingreso?: number
          dias_unidad_bloqueados?: number
          dias_unidad_capacidad?: number
          dias_unidad_cortesia?: number
          dias_unidad_disponibles?: number
          dias_unidad_ocupados?: number
          dias_unidad_pagados?: number
          dias_unidad_pausa?: number
          dias_unidad_reservados?: number
          dias_unidad_saneamiento?: number
          estado?: string
          fin: string
          flujo_caja_valorizado_ves?: number
          gastos_operativos_usdt?: number
          gastos_operativos_ves?: number
          id?: string
          ingreso_cobrado_devengado_ves?: number
          ingreso_comercial_devengado_usd?: number
          ingreso_contractual_usd?: number
          ingreso_economico_devengado_usd_paralela?: number
          inicio: string
          margen_bruto_economico_usd_paralela?: number
          margen_bruto_ves?: number
          mes: string
          pagos_proveedor_usdt?: number
          pagos_proveedor_ves?: number
          reembolsos_clientes_ves?: number
          resultado_operativo_economico_usd_paralela?: number
          resultado_operativo_ves?: number
          source_watermark?: string | null
          tasa_bcv_id?: string | null
          tasa_paralela_id?: string | null
          version?: number
          ves_esperados_devengados_clientes?: number
        }
        Update: {
          ajustes_clientes_ves?: number
          ajustes_economicos_usd_paralela?: number
          calculado_at?: string | null
          cerrado_at?: string | null
          cerrado_por_id?: string | null
          cobros_ves?: number
          costo_bloqueo_ves?: number
          costo_cortesia_ves?: number
          costo_no_reutilizable_sin_ingreso_ves?: number
          costo_ocioso_ves?: number
          costo_pausa_ves?: number
          costo_proveedor_devengado_usdt?: number
          costo_proveedor_devengado_ves?: number
          costo_reserva_ves?: number
          costo_saneamiento_ves?: number
          created_at?: string
          dias_no_reutilizables_sin_ingreso?: number
          dias_unidad_bloqueados?: number
          dias_unidad_capacidad?: number
          dias_unidad_cortesia?: number
          dias_unidad_disponibles?: number
          dias_unidad_ocupados?: number
          dias_unidad_pagados?: number
          dias_unidad_pausa?: number
          dias_unidad_reservados?: number
          dias_unidad_saneamiento?: number
          estado?: string
          fin?: string
          flujo_caja_valorizado_ves?: number
          gastos_operativos_usdt?: number
          gastos_operativos_ves?: number
          id?: string
          ingreso_cobrado_devengado_ves?: number
          ingreso_comercial_devengado_usd?: number
          ingreso_contractual_usd?: number
          ingreso_economico_devengado_usd_paralela?: number
          inicio?: string
          margen_bruto_economico_usd_paralela?: number
          margen_bruto_ves?: number
          mes?: string
          pagos_proveedor_usdt?: number
          pagos_proveedor_ves?: number
          reembolsos_clientes_ves?: number
          resultado_operativo_economico_usd_paralela?: number
          resultado_operativo_ves?: number
          source_watermark?: string | null
          tasa_bcv_id?: string | null
          tasa_paralela_id?: string | null
          version?: number
          ves_esperados_devengados_clientes?: number
        }
        Relationships: [
          {
            foreignKeyName: "cierres_mensuales_cerrado_por_id_fkey"
            columns: ["cerrado_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_mensuales_tasa_bcv_id_fkey"
            columns: ["tasa_bcv_id"]
            isOneToOne: false
            referencedRelation: "tasas_cambio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cierres_mensuales_tasa_paralela_id_fkey"
            columns: ["tasa_paralela_id"]
            isOneToOne: false
            referencedRelation: "tasas_cambio"
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
      coberturas_spotify: {
        Row: {
          bloqueada_at: string | null
          created_at: string
          cuenta_id: string
          desbloqueada_at: string | null
          estado_admision: string | null
          identidad_madre_id: string | null
          metodo_control: string | null
          motivo_bloqueo: string | null
          tipo: string
          ultima_prueba_admision_at: string | null
          updated_at: string
        }
        Insert: {
          bloqueada_at?: string | null
          created_at?: string
          cuenta_id: string
          desbloqueada_at?: string | null
          estado_admision?: string | null
          identidad_madre_id?: string | null
          metodo_control?: string | null
          motivo_bloqueo?: string | null
          tipo: string
          ultima_prueba_admision_at?: string | null
          updated_at?: string
        }
        Update: {
          bloqueada_at?: string | null
          created_at?: string
          cuenta_id?: string
          desbloqueada_at?: string | null
          estado_admision?: string | null
          identidad_madre_id?: string | null
          metodo_control?: string | null
          motivo_bloqueo?: string | null
          tipo?: string
          ultima_prueba_admision_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coberturas_spotify_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: true
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coberturas_spotify_identidad_madre_id_fkey"
            columns: ["identidad_madre_id"]
            isOneToOne: false
            referencedRelation: "identidades_spotify"
            referencedColumns: ["id"]
          },
        ]
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
      controles_pago_spotify: {
        Row: {
          archived_at: string | null
          cobertura_cuenta_id: string
          created_at: string
          gmail_cifrado: string
          gmail_fingerprint: string
          id: string
          origen: string | null
          version_clave: number
        }
        Insert: {
          archived_at?: string | null
          cobertura_cuenta_id: string
          created_at?: string
          gmail_cifrado: string
          gmail_fingerprint: string
          id?: string
          origen?: string | null
          version_clave?: number
        }
        Update: {
          archived_at?: string | null
          cobertura_cuenta_id?: string
          created_at?: string
          gmail_cifrado?: string
          gmail_fingerprint?: string
          id?: string
          origen?: string | null
          version_clave?: number
        }
        Relationships: [
          {
            foreignKeyName: "controles_pago_spotify_cobertura_cuenta_id_fkey"
            columns: ["cobertura_cuenta_id"]
            isOneToOne: true
            referencedRelation: "coberturas_spotify"
            referencedColumns: ["cuenta_id"]
          },
        ]
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
          notas: string | null
          orden: number | null
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
          notas?: string | null
          orden?: number | null
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
          notas?: string | null
          orden?: number | null
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
      detalles_cierre_mensual: {
        Row: {
          cierre_id: string
          cuenta_id: string | null
          dias_en_mes: number | null
          dias_periodo: number | null
          dias_unidad: number | null
          fecha_negocio: string
          id: string
          metadata_calculo: Json | null
          modalidad_id: string | null
          moneda_fuente: string | null
          monto_base_ves: number | null
          monto_devengado_usd_comercial: number | null
          monto_devengado_usd_paralela: number | null
          monto_devengado_ves: number | null
          monto_fuente: number | null
          origen_id: string | null
          plataforma_id: string | null
          producto_plataforma_id: string | null
          tasa_bcv_id: string | null
          tasa_paralela_id: string | null
          tipo: string
          unidad_id: string | null
        }
        Insert: {
          cierre_id: string
          cuenta_id?: string | null
          dias_en_mes?: number | null
          dias_periodo?: number | null
          dias_unidad?: number | null
          fecha_negocio: string
          id?: string
          metadata_calculo?: Json | null
          modalidad_id?: string | null
          moneda_fuente?: string | null
          monto_base_ves?: number | null
          monto_devengado_usd_comercial?: number | null
          monto_devengado_usd_paralela?: number | null
          monto_devengado_ves?: number | null
          monto_fuente?: number | null
          origen_id?: string | null
          plataforma_id?: string | null
          producto_plataforma_id?: string | null
          tasa_bcv_id?: string | null
          tasa_paralela_id?: string | null
          tipo: string
          unidad_id?: string | null
        }
        Update: {
          cierre_id?: string
          cuenta_id?: string | null
          dias_en_mes?: number | null
          dias_periodo?: number | null
          dias_unidad?: number | null
          fecha_negocio?: string
          id?: string
          metadata_calculo?: Json | null
          modalidad_id?: string | null
          moneda_fuente?: string | null
          monto_base_ves?: number | null
          monto_devengado_usd_comercial?: number | null
          monto_devengado_usd_paralela?: number | null
          monto_devengado_ves?: number | null
          monto_fuente?: number | null
          origen_id?: string | null
          plataforma_id?: string | null
          producto_plataforma_id?: string | null
          tasa_bcv_id?: string | null
          tasa_paralela_id?: string | null
          tipo?: string
          unidad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detalles_cierre_mensual_cierre_id_fkey"
            columns: ["cierre_id"]
            isOneToOne: false
            referencedRelation: "cierres_mensuales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalles_cierre_mensual_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalles_cierre_mensual_modalidad_id_fkey"
            columns: ["modalidad_id"]
            isOneToOne: false
            referencedRelation: "modalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalles_cierre_mensual_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "plataformas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalles_cierre_mensual_producto_plataforma_id_fkey"
            columns: ["producto_plataforma_id"]
            isOneToOne: false
            referencedRelation: "productos_plataforma"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalles_cierre_mensual_tasa_bcv_id_fkey"
            columns: ["tasa_bcv_id"]
            isOneToOne: false
            referencedRelation: "tasas_cambio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalles_cierre_mensual_tasa_paralela_id_fkey"
            columns: ["tasa_paralela_id"]
            isOneToOne: false
            referencedRelation: "tasas_cambio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalles_cierre_mensual_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades_inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas_acceso: {
        Row: {
          asignacion_inventario_id: string | null
          canal: string | null
          created_at: string
          credencial_cuenta_version: number | null
          credencial_identidad_version: number | null
          entregada_at: string | null
          entregada_por_id: string | null
          estado: string
          fecha_renovacion_snapshot: string | null
          id: string
          identidad_spotify_id: string | null
          motivo: string | null
          motivo_revocacion: string | null
          nombre_perfil_snapshot: string | null
          periodo_servicio_id: string | null
          revocada_at: string | null
          secreto_unidad_version: number | null
          suscripcion_id: string
          tipo: string
        }
        Insert: {
          asignacion_inventario_id?: string | null
          canal?: string | null
          created_at?: string
          credencial_cuenta_version?: number | null
          credencial_identidad_version?: number | null
          entregada_at?: string | null
          entregada_por_id?: string | null
          estado?: string
          fecha_renovacion_snapshot?: string | null
          id?: string
          identidad_spotify_id?: string | null
          motivo?: string | null
          motivo_revocacion?: string | null
          nombre_perfil_snapshot?: string | null
          periodo_servicio_id?: string | null
          revocada_at?: string | null
          secreto_unidad_version?: number | null
          suscripcion_id: string
          tipo: string
        }
        Update: {
          asignacion_inventario_id?: string | null
          canal?: string | null
          created_at?: string
          credencial_cuenta_version?: number | null
          credencial_identidad_version?: number | null
          entregada_at?: string | null
          entregada_por_id?: string | null
          estado?: string
          fecha_renovacion_snapshot?: string | null
          id?: string
          identidad_spotify_id?: string | null
          motivo?: string | null
          motivo_revocacion?: string | null
          nombre_perfil_snapshot?: string | null
          periodo_servicio_id?: string | null
          revocada_at?: string | null
          secreto_unidad_version?: number | null
          suscripcion_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_acceso_asignacion_inventario_id_fkey"
            columns: ["asignacion_inventario_id"]
            isOneToOne: false
            referencedRelation: "asignaciones_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_acceso_entregada_por_id_fkey"
            columns: ["entregada_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_acceso_identidad_spotify_id_fkey"
            columns: ["identidad_spotify_id"]
            isOneToOne: false
            referencedRelation: "identidades_spotify"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_acceso_periodo_servicio_id_fkey"
            columns: ["periodo_servicio_id"]
            isOneToOne: false
            referencedRelation: "periodos_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_acceso_periodo_servicio_id_fkey"
            columns: ["periodo_servicio_id"]
            isOneToOne: false
            referencedRelation: "v_periodos_por_cobrar"
            referencedColumns: ["periodo_id"]
          },
          {
            foreignKeyName: "entregas_acceso_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "suscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_acceso_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "v_mis_ventas_revendedor"
            referencedColumns: ["suscripcion_id"]
          },
        ]
      }
      eventos_auditoria: {
        Row: {
          accion: string
          actor_id: string | null
          entidad: string
          entidad_id: string | null
          id: string
          metadata: Json | null
          ocurrio_at: string
          resultado: string | null
        }
        Insert: {
          accion: string
          actor_id?: string | null
          entidad: string
          entidad_id?: string | null
          id?: string
          metadata?: Json | null
          ocurrio_at?: string
          resultado?: string | null
        }
        Update: {
          accion?: string
          actor_id?: string | null
          entidad?: string
          entidad_id?: string | null
          id?: string
          metadata?: Json | null
          ocurrio_at?: string
          resultado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_auditoria_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos_operativos: {
        Row: {
          categoria_id: string
          confirmado_at: string | null
          contraparte: string | null
          created_at: string
          created_by: string | null
          cuenta_id: string | null
          descripcion: string | null
          estado: string
          fecha_gasto: string
          gasto_original_id: string | null
          id: string
          monto_usdt: number
          monto_ves_snapshot: number | null
          nota: string | null
          ocurrido_at: string
          plataforma_id: string | null
          referencia_no_sensible: string | null
          tasa_paralela_id: string | null
          tipo: string
        }
        Insert: {
          categoria_id: string
          confirmado_at?: string | null
          contraparte?: string | null
          created_at?: string
          created_by?: string | null
          cuenta_id?: string | null
          descripcion?: string | null
          estado?: string
          fecha_gasto: string
          gasto_original_id?: string | null
          id?: string
          monto_usdt: number
          monto_ves_snapshot?: number | null
          nota?: string | null
          ocurrido_at?: string
          plataforma_id?: string | null
          referencia_no_sensible?: string | null
          tasa_paralela_id?: string | null
          tipo?: string
        }
        Update: {
          categoria_id?: string
          confirmado_at?: string | null
          contraparte?: string | null
          created_at?: string
          created_by?: string | null
          cuenta_id?: string | null
          descripcion?: string | null
          estado?: string
          fecha_gasto?: string
          gasto_original_id?: string | null
          id?: string
          monto_usdt?: number
          monto_ves_snapshot?: number | null
          nota?: string | null
          ocurrido_at?: string
          plataforma_id?: string | null
          referencia_no_sensible?: string | null
          tasa_paralela_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "gastos_operativos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_gasto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_operativos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_operativos_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_operativos_gasto_original_id_fkey"
            columns: ["gasto_original_id"]
            isOneToOne: false
            referencedRelation: "gastos_operativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_operativos_plataforma_id_fkey"
            columns: ["plataforma_id"]
            isOneToOne: false
            referencedRelation: "plataformas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_operativos_tasa_paralela_id_fkey"
            columns: ["tasa_paralela_id"]
            isOneToOne: false
            referencedRelation: "tasas_cambio"
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
          {
            foreignKeyName: "historial_estado_suscripcion_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "v_mis_ventas_revendedor"
            referencedColumns: ["suscripcion_id"]
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
      identidades_spotify: {
        Row: {
          archived_at: string | null
          cliente_titular_id: string | null
          contrasena_cifrada: string | null
          created_at: string
          estado: string
          id: string
          login_cifrado: string | null
          login_fingerprint: string | null
          reutilizable: boolean
          secretos_eliminados_at: string | null
          sustituye_a_id: string | null
          tipo_correo: string
          titular_tipo: string
          unidad_preparada_id: string | null
          version_clave: number
        }
        Insert: {
          archived_at?: string | null
          cliente_titular_id?: string | null
          contrasena_cifrada?: string | null
          created_at?: string
          estado?: string
          id?: string
          login_cifrado?: string | null
          login_fingerprint?: string | null
          reutilizable?: boolean
          secretos_eliminados_at?: string | null
          sustituye_a_id?: string | null
          tipo_correo: string
          titular_tipo?: string
          unidad_preparada_id?: string | null
          version_clave?: number
        }
        Update: {
          archived_at?: string | null
          cliente_titular_id?: string | null
          contrasena_cifrada?: string | null
          created_at?: string
          estado?: string
          id?: string
          login_cifrado?: string | null
          login_fingerprint?: string | null
          reutilizable?: boolean
          secretos_eliminados_at?: string | null
          sustituye_a_id?: string | null
          tipo_correo?: string
          titular_tipo?: string
          unidad_preparada_id?: string | null
          version_clave?: number
        }
        Relationships: [
          {
            foreignKeyName: "identidades_spotify_cliente_titular_id_fkey"
            columns: ["cliente_titular_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identidades_spotify_sustituye_a_id_fkey"
            columns: ["sustituye_a_id"]
            isOneToOne: false
            referencedRelation: "identidades_spotify"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identidades_spotify_unidad_preparada_id_fkey"
            columns: ["unidad_preparada_id"]
            isOneToOne: false
            referencedRelation: "unidades_inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      incidencias_spotify: {
        Row: {
          cobertura_origen_cuenta_id: string
          detectada_at: string
          estado: string
          finalizada_at: string | null
          id: string
          iniciada_por_id: string | null
          nota_no_sensible: string | null
          snapshot_afectados_at: string | null
          tipo: string
        }
        Insert: {
          cobertura_origen_cuenta_id: string
          detectada_at?: string
          estado?: string
          finalizada_at?: string | null
          id?: string
          iniciada_por_id?: string | null
          nota_no_sensible?: string | null
          snapshot_afectados_at?: string | null
          tipo: string
        }
        Update: {
          cobertura_origen_cuenta_id?: string
          detectada_at?: string
          estado?: string
          finalizada_at?: string | null
          id?: string
          iniciada_por_id?: string | null
          nota_no_sensible?: string | null
          snapshot_afectados_at?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidencias_spotify_cobertura_origen_cuenta_id_fkey"
            columns: ["cobertura_origen_cuenta_id"]
            isOneToOne: false
            referencedRelation: "coberturas_spotify"
            referencedColumns: ["cuenta_id"]
          },
          {
            foreignKeyName: "incidencias_spotify_iniciada_por_id_fkey"
            columns: ["iniciada_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes_pago_proveedor: {
        Row: {
          cantidad_cuentas: number
          created_at: string
          created_by: string | null
          fecha_pago: string
          id: string
          monto_total_usdt: number
          proveedor_id: string
          referencia_no_sensible: string | null
        }
        Insert: {
          cantidad_cuentas: number
          created_at?: string
          created_by?: string | null
          fecha_pago: string
          id?: string
          monto_total_usdt: number
          proveedor_id: string
          referencia_no_sensible?: string | null
        }
        Update: {
          cantidad_cuentas?: number
          created_at?: string
          created_by?: string | null
          fecha_pago?: string
          id?: string
          monto_total_usdt?: number
          proveedor_id?: string
          referencia_no_sensible?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lotes_pago_proveedor_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_pago_proveedor_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
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
      operaciones_remotas: {
        Row: {
          asignacion_id: string | null
          caso_incidencia_spotify_id: string | null
          clave_idempotencia: string | null
          cuenta_id: string | null
          error_resumido: string | null
          estado: string
          estado_revocacion: string | null
          evidencia_no_sensible: string | null
          finalizada_at: string | null
          finalizada_por_id: string | null
          id: string
          iniciada_at: string
          iniciada_por_id: string | null
          politica_revocacion_snapshot: string | null
          tipo: string
          unidad_id: string | null
        }
        Insert: {
          asignacion_id?: string | null
          caso_incidencia_spotify_id?: string | null
          clave_idempotencia?: string | null
          cuenta_id?: string | null
          error_resumido?: string | null
          estado?: string
          estado_revocacion?: string | null
          evidencia_no_sensible?: string | null
          finalizada_at?: string | null
          finalizada_por_id?: string | null
          id?: string
          iniciada_at?: string
          iniciada_por_id?: string | null
          politica_revocacion_snapshot?: string | null
          tipo: string
          unidad_id?: string | null
        }
        Update: {
          asignacion_id?: string | null
          caso_incidencia_spotify_id?: string | null
          clave_idempotencia?: string | null
          cuenta_id?: string | null
          error_resumido?: string | null
          estado?: string
          estado_revocacion?: string | null
          evidencia_no_sensible?: string | null
          finalizada_at?: string | null
          finalizada_por_id?: string | null
          id?: string
          iniciada_at?: string
          iniciada_por_id?: string | null
          politica_revocacion_snapshot?: string | null
          tipo?: string
          unidad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operaciones_remotas_asignacion_id_fkey"
            columns: ["asignacion_id"]
            isOneToOne: false
            referencedRelation: "asignaciones_inventario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_remotas_caso_incidencia_spotify_id_fkey"
            columns: ["caso_incidencia_spotify_id"]
            isOneToOne: false
            referencedRelation: "casos_incidencia_spotify"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_remotas_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_remotas_finalizada_por_id_fkey"
            columns: ["finalizada_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_remotas_iniciada_por_id_fkey"
            columns: ["iniciada_por_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operaciones_remotas_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades_inventario"
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
            foreignKeyName: "pagos_cliente_periodo_servicio_id_fkey"
            columns: ["periodo_servicio_id"]
            isOneToOne: false
            referencedRelation: "v_periodos_por_cobrar"
            referencedColumns: ["periodo_id"]
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
      pagos_proveedor: {
        Row: {
          ciclo_proveedor_id: string
          confirmado_at: string | null
          created_at: string
          created_by: string | null
          estado: string
          fecha_pago: string
          id: string
          lote_pago_id: string | null
          monto_usdt: number
          monto_ves_snapshot: number | null
          pago_original_id: string | null
          referencia_no_sensible: string | null
          tasa_paralela_id: string | null
          tipo: string
        }
        Insert: {
          ciclo_proveedor_id: string
          confirmado_at?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha_pago: string
          id?: string
          lote_pago_id?: string | null
          monto_usdt: number
          monto_ves_snapshot?: number | null
          pago_original_id?: string | null
          referencia_no_sensible?: string | null
          tasa_paralela_id?: string | null
          tipo?: string
        }
        Update: {
          ciclo_proveedor_id?: string
          confirmado_at?: string | null
          created_at?: string
          created_by?: string | null
          estado?: string
          fecha_pago?: string
          id?: string
          lote_pago_id?: string | null
          monto_usdt?: number
          monto_ves_snapshot?: number | null
          pago_original_id?: string | null
          referencia_no_sensible?: string | null
          tasa_paralela_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pagos_proveedor_ciclo_proveedor_id_fkey"
            columns: ["ciclo_proveedor_id"]
            isOneToOne: false
            referencedRelation: "ciclos_proveedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proveedor_ciclo_proveedor_id_fkey"
            columns: ["ciclo_proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_ciclos_proveedor_estado"
            referencedColumns: ["ciclo_id"]
          },
          {
            foreignKeyName: "pagos_proveedor_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proveedor_lote_pago_id_fkey"
            columns: ["lote_pago_id"]
            isOneToOne: false
            referencedRelation: "lotes_pago_proveedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proveedor_pago_original_id_fkey"
            columns: ["pago_original_id"]
            isOneToOne: false
            referencedRelation: "pagos_proveedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_proveedor_tasa_paralela_id_fkey"
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
            foreignKeyName: "periodos_servicio_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "v_mis_ventas_revendedor"
            referencedColumns: ["suscripcion_id"]
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
          {
            foreignKeyName: "suscripcion_contactos_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "v_mis_ventas_revendedor"
            referencedColumns: ["suscripcion_id"]
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
      tarjetas_proveedor_cifradas: {
        Row: {
          created_at: string
          datos_cifrados: string
          proveedor_id: string
          updated_at: string
          version_clave: number
        }
        Insert: {
          created_at?: string
          datos_cifrados: string
          proveedor_id: string
          updated_at?: string
          version_clave?: number
        }
        Update: {
          created_at?: string
          datos_cifrados?: string
          proveedor_id?: string
          updated_at?: string
          version_clave?: number
        }
        Relationships: [
          {
            foreignKeyName: "tarjetas_proveedor_cifradas_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: true
            referencedRelation: "proveedores"
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
          revalidada_at: string | null
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
          revalidada_at?: string | null
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
          revalidada_at?: string | null
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
          cobra_en_paralela: boolean
          created_at: string
          id: string
          nombre: string
          telefono_normalizado: string | null
          telefono_original: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          activo?: boolean
          alias?: string | null
          cobra_en_paralela?: boolean
          created_at?: string
          id?: string
          nombre: string
          telefono_normalizado?: string | null
          telefono_original?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Update: {
          activo?: boolean
          alias?: string | null
          cobra_en_paralela?: boolean
          created_at?: string
          id?: string
          nombre?: string
          telefono_normalizado?: string | null
          telefono_original?: string | null
          tipo?: string
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
      vinculos_identidad_spotify: {
        Row: {
          created_at: string
          created_by: string | null
          fin: string | null
          id: string
          identidad_spotify_id: string
          inicio: string
          motivo_fin: string | null
          suscripcion_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fin?: string | null
          id?: string
          identidad_spotify_id: string
          inicio?: string
          motivo_fin?: string | null
          suscripcion_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fin?: string | null
          id?: string
          identidad_spotify_id?: string
          inicio?: string
          motivo_fin?: string | null
          suscripcion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vinculos_identidad_spotify_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_identidad_spotify_identidad_spotify_id_fkey"
            columns: ["identidad_spotify_id"]
            isOneToOne: false
            referencedRelation: "identidades_spotify"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_identidad_spotify_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "suscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_identidad_spotify_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "v_mis_ventas_revendedor"
            referencedColumns: ["suscripcion_id"]
          },
        ]
      }
    }
    Views: {
      v_caja_diaria: {
        Row: {
          egresos_usdt: number | null
          entradas_ves: number | null
          fecha: string | null
          flujo_ves: number | null
          movimientos: number | null
          salidas_ves: number | null
        }
        Relationships: []
      }
      v_ciclos_proveedor_estado: {
        Row: {
          ciclo_id: string | null
          costo_usdt: number | null
          costo_ves_snapshot: number | null
          cuenta_alias: string | null
          cuenta_id: string | null
          dia_ancla_proveedor: number | null
          dias_para_renovar: number | null
          estado: string | null
          inicio: string | null
          pagado: boolean | null
          plataforma_nombre: string | null
          producto_nombre: string | null
          proveedor_nombre_snapshot: string | null
          proxima_renovacion: string | null
          sin_desembolso: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ciclos_proveedor_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_mis_ventas_revendedor: {
        Row: {
          cliente: string | null
          cliente_whatsapp: string | null
          cliente_whatsapp_original: string | null
          cuenta_id: string | null
          estado: string | null
          fecha_renovacion: string | null
          modalidad: string | null
          nota_renovacion: string | null
          plataforma: string | null
          producto: string | null
          recontactar_el: string | null
          suscripcion_id: string | null
          unidad_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asignaciones_inventario_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
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
      v_movimientos_caja: {
        Row: {
          concepto: string | null
          created_by: string | null
          fecha: string | null
          monto_usdt: number | null
          monto_ves: number | null
          movimiento_id: string | null
          origen_id: string | null
          plataforma_nombre: string | null
          referencia: string | null
          tipo: string | null
        }
        Relationships: []
      }
      v_periodos_por_cobrar: {
        Row: {
          cliente_id: string | null
          cliente_nombre: string | null
          cliente_whatsapp: string | null
          estado_datos_financieros: string | null
          fecha_renovacion: string | null
          fecha_venta: string | null
          inicio: string | null
          modalidad_nombre: string | null
          monto_ves_esperado: number | null
          periodo_id: string | null
          plataforma_nombre: string | null
          precio_comercial_usd: number | null
          producto_nombre: string | null
          suscripcion_id: string | null
          tipo_operacion: string | null
          vendedor_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "periodos_servicio_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "suscripciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodos_servicio_suscripcion_id_fkey"
            columns: ["suscripcion_id"]
            isOneToOne: false
            referencedRelation: "v_mis_ventas_revendedor"
            referencedColumns: ["suscripcion_id"]
          },
          {
            foreignKeyName: "suscripciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_ventas_diarias: {
        Row: {
          fecha: string | null
          renovaciones: number | null
          ventas_esperadas_ves: number | null
          ventas_nuevas: number | null
          ventas_usd: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      abrir_sesion_carga: {
        Args: { p_motivo?: string; p_producto_id?: string }
        Returns: string
      }
      actualizar_admision_familia_spotify: {
        Args: { p_cuenta_id: string; p_estado: string; p_motivo?: string }
        Returns: undefined
      }
      actualizar_cuenta: {
        Args: {
          p_alias?: string
          p_cuenta_id: string
          p_estado?: string
          p_notas?: string
          p_proveedor_nombre?: string
        }
        Returns: undefined
      }
      actualizar_unidades: {
        Args: {
          p_cuenta_id: string
          p_nombres: string[]
          p_pins_cifrados: string[]
          p_unidad_ids: string[]
        }
        Returns: number
      }
      calcular_cierre_mensual: { Args: { p_mes: string }; Returns: string }
      cambiar_estado_suscripcion: {
        Args: {
          p_motivo?: string
          p_nuevo_estado: string
          p_suscripcion_id: string
        }
        Returns: undefined
      }
      cancelar_y_liberar: {
        Args: { p_motivo?: string; p_suscripcion_id: string }
        Returns: string
      }
      cerrar_mes: { Args: { p_mes: string }; Returns: string }
      cerrar_sesion_carga: {
        Args: { p_motivo?: string; p_sesion_id: string }
        Returns: undefined
      }
      confirmar_limpieza: {
        Args: { p_evidencia?: string; p_operacion_id: string }
        Returns: undefined
      }
      corregir_cobro_cliente: {
        Args: {
          p_motivo?: string
          p_nuevo_monto_usd: number
          p_periodo_id: string
        }
        Returns: Json
      }
      crear_cuenta_con_unidades: {
        Args: {
          p_alias?: string
          p_capacidad: number
          p_contrasena_cifrada?: string
          p_login_cifrado?: string
          p_login_fingerprint?: string
          p_nombres_unidades?: string[]
          p_notas?: string
          p_producto_id: string
          p_proveedor_id?: string
          p_proveedor_nombre?: string
        }
        Returns: string
      }
      crear_familia_spotify: {
        Args: {
          p_alias: string
          p_capacidad: number
          p_contrasena_cifrada: string
          p_gmail_pagador_cifrado?: string
          p_gmail_pagador_fingerprint?: string
          p_login_cifrado: string
          p_login_fingerprint: string
          p_notas: string
          p_origen_gpay?: string
          p_producto_id: string
          p_proveedor_nombre: string
        }
        Returns: string
      }
      deshacer_ultima_renovacion: {
        Args: { p_motivo?: string; p_suscripcion_id: string }
        Returns: string
      }
      editar_acceso_miembro_spotify: {
        Args: {
          p_contrasena_cifrada: string
          p_login_cifrado: string
          p_login_fingerprint: string
          p_suscripcion_id: string
          p_tipo_correo: string
          p_unidad_id: string
        }
        Returns: string
      }
      eliminar_cliente: { Args: { p_cliente_id: string }; Returns: undefined }
      eliminar_cuenta: { Args: { p_cuenta_id: string }; Returns: undefined }
      eliminar_cuentas: { Args: { p_cuenta_ids: string[] }; Returns: number }
      es_admin: { Args: never; Returns: boolean }
      fecha_renovacion_cliente: {
        Args: { p_inicio: string; p_meses?: number }
        Returns: string
      }
      fijar_recordatorio: {
        Args: { p_fecha?: string; p_nota?: string; p_suscripcion_id: string }
        Returns: undefined
      }
      identidad_spotify_por_huella: {
        Args: {
          p_contrasena_cifrada: string
          p_login_cifrado: string
          p_login_fingerprint: string
          p_tipo_correo?: string
        }
        Returns: string
      }
      importar_cliente: {
        Args: { p_nombre: string; p_whatsapp: string }
        Returns: string
      }
      importar_servicio_existente: {
        Args: {
          p_alias?: string
          p_capacidad: number
          p_cliente_nombre?: string
          p_cliente_whatsapp?: string
          p_contrasena_cifrada: string
          p_costo_usdt?: number
          p_fecha_renovacion?: string
          p_inicio?: string
          p_login_cifrado: string
          p_login_fingerprint: string
          p_modalidad_id?: string
          p_monto_ves?: number
          p_nombre_perfil?: string
          p_numero_slot?: number
          p_pin_cifrado?: string
          p_producto_id: string
          p_prov_inicio?: string
          p_proveedor_nombre?: string
          p_sesion_id: string
          p_vendedor_id?: string
        }
        Returns: Json
      }
      importar_spotify_familiar: {
        Args: {
          p_capacidad: number
          p_cliente_nombre?: string
          p_cliente_whatsapp?: string
          p_costo_usdt?: number
          p_fecha_renovacion?: string
          p_gmail_pagador_cifrado?: string
          p_gmail_pagador_fingerprint?: string
          p_inicio?: string
          p_madre_contrasena_cifrada: string
          p_madre_login_cifrado: string
          p_madre_login_fingerprint: string
          p_miembro_contrasena_cifrada?: string
          p_miembro_login_cifrado?: string
          p_miembro_login_fingerprint?: string
          p_miembro_tipo_correo?: string
          p_modalidad_id?: string
          p_monto_ves?: number
          p_numero_slot?: number
          p_origen_gpay?: string
          p_producto_id: string
          p_prov_inicio?: string
          p_proveedor_nombre?: string
          p_sesion_id: string
          p_vendedor_id?: string
        }
        Returns: Json
      }
      importar_spotify_individual: {
        Args: {
          p_cliente_nombre?: string
          p_cliente_whatsapp?: string
          p_cobertura_tipo?: string
          p_contrasena_cifrada: string
          p_costo_usdt?: number
          p_fecha_renovacion?: string
          p_gmail_pagador_cifrado?: string
          p_gmail_pagador_fingerprint?: string
          p_inicio?: string
          p_login_cifrado: string
          p_login_fingerprint: string
          p_modalidad_id?: string
          p_monto_ves?: number
          p_origen_gpay?: string
          p_producto_id: string
          p_prov_inicio?: string
          p_proveedor_nombre?: string
          p_sesion_id: string
          p_vendedor_id?: string
        }
        Returns: Json
      }
      listar_destinos_traslado: {
        Args: { p_suscripcion_id: string }
        Returns: {
          alcance: string
          cuenta_alias: string
          cuenta_id: string
          cuenta_orden: number
          unidad_id: string
          unidad_numero: number
          unidad_tipo: string
        }[]
      }
      marcar_periodo_cortesia: {
        Args: { p_periodo_id: string }
        Returns: undefined
      }
      mover_cuenta: {
        Args: { p_accion: string; p_cuenta_id: string }
        Returns: undefined
      }
      preparar_identidad_spotify: {
        Args: {
          p_contrasena_cifrada: string
          p_login_cifrado: string
          p_login_fingerprint: string
          p_tipo_correo?: string
          p_unidad_id: string
        }
        Returns: string
      }
      reabrir_mes: {
        Args: { p_mes: string; p_motivo: string }
        Returns: string
      }
      registrar_ciclo_proveedor: {
        Args: {
          p_costo_usdt: number
          p_cuenta_id: string
          p_dia_ancla?: number
          p_inicio?: string
          p_referencia?: string
        }
        Returns: string
      }
      registrar_cobro_cliente: {
        Args: {
          p_monto_usd?: number
          p_monto_ves?: number
          p_ocurrido_at?: string
          p_periodo_id: string
          p_referencia?: string
        }
        Returns: string
      }
      registrar_gasto_operativo: {
        Args: {
          p_categoria: string
          p_contraparte?: string
          p_cuenta_id?: string
          p_descripcion?: string
          p_fecha_gasto?: string
          p_monto_usdt: number
          p_nota?: string
          p_plataforma_id?: string
          p_referencia?: string
        }
        Returns: string
      }
      registrar_pago_proveedor: {
        Args: {
          p_ciclo_id: string
          p_fecha_pago?: string
          p_referencia?: string
          p_tipo?: string
        }
        Returns: string
      }
      registrar_renovacion_y_pago: {
        Args: {
          p_costo_usdt: number
          p_cuenta_id: string
          p_dia_ancla?: number
          p_fecha_pago?: string
          p_inicio?: string
          p_pagar?: boolean
          p_referencia?: string
        }
        Returns: string
      }
      registrar_renovaciones_proveedor_lote: {
        Args: { p_fecha_pago: string; p_items: Json; p_referencia?: string }
        Returns: Json
      }
      renovar_suscripcion: {
        Args: {
          p_inicio?: string
          p_meses?: number
          p_precio_usd?: number
          p_suscripcion_id: string
          p_tardia?: boolean
        }
        Returns: string
      }
      renovar_y_cobrar: {
        Args: {
          p_actualizar_vendedor?: boolean
          p_inicio?: string
          p_meses?: number
          p_monto_usd?: number
          p_monto_ves?: number
          p_referencia?: string
          p_suscripcion_id: string
          p_tardia?: boolean
          p_vendedor_id?: string
        }
        Returns: string
      }
      resolver_cliente_canonico: {
        Args: { p_nombre: string; p_whatsapp?: string }
        Returns: string
      }
      resumen_financiero: {
        Args: { p_fin: string; p_inicio: string }
        Returns: {
          ajustes_clientes_ves: number
          ajustes_economicos_usd_paralela: number
          cobros_ves: number
          costo_ocioso_ves: number
          costo_proveedor_devengado_usdt: number
          costo_proveedor_devengado_ves: number
          dias_unidad_capacidad: number
          dias_unidad_disponibles: number
          dias_unidad_ocupados: number
          dias_unidad_pagados: number
          flujo_caja_valorizado_ves: number
          gastos_operativos_usdt: number
          gastos_operativos_ves: number
          ingreso_cobrado_devengado_ves: number
          ingreso_comercial_devengado_usd: number
          ingreso_contractual_usd: number
          ingreso_economico_devengado_usd_paralela: number
          margen_bruto_economico_usd_paralela: number
          margen_bruto_ves: number
          pagos_proveedor_usdt: number
          pagos_proveedor_ves: number
          reembolsos_clientes_ves: number
          resultado_operativo_economico_usd_paralela: number
          resultado_operativo_ves: number
          ves_esperados_devengados_clientes: number
        }[]
      }
      revertir_cobro_cliente: {
        Args: { p_motivo?: string; p_pago_id: string }
        Returns: string
      }
      revertir_gasto_operativo: {
        Args: { p_gasto_id: string; p_motivo?: string }
        Returns: string
      }
      revertir_pago_proveedor: {
        Args: { p_motivo?: string; p_pago_id: string }
        Returns: string
      }
      rotar_credenciales_cuenta: {
        Args: {
          p_contrasena_cifrada?: string
          p_cuenta_id: string
          p_login_cifrado?: string
          p_login_fingerprint?: string
        }
        Returns: undefined
      }
      tasa_utilizable: {
        Args: { p_tipo: string }
        Returns: {
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
          revalidada_at: string | null
          tipo: string
          version: number
          vigente_desde: string
        }
        SetofOptions: {
          from: "*"
          to: "tasas_cambio"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      trasladar_servicio_por_falla: {
        Args: {
          p_cuenta_destino_id: string
          p_suscripcion_id: string
          p_unidad_destino_id?: string
        }
        Returns: string
      }
      vender_miembro_spotify_con_identidad: {
        Args: {
          p_cliente_nombre: string
          p_cliente_whatsapp: string
          p_contrasena_cifrada: string
          p_cuenta_id: string
          p_inicio: string
          p_login_cifrado: string
          p_login_fingerprint: string
          p_modalidad_id: string
          p_monto_usd: number
          p_precio_usd: number
          p_tipo_correo: string
          p_unidad_id: string
          p_vendedor_id: string
        }
        Returns: string
      }
      vender_miembro_spotify_reemplazando_identidad: {
        Args: {
          p_cliente_nombre: string
          p_cliente_whatsapp: string
          p_contrasena_cifrada: string
          p_cuenta_id: string
          p_inicio: string
          p_login_cifrado: string
          p_login_fingerprint: string
          p_modalidad_id: string
          p_monto_usd: number
          p_precio_usd: number
          p_tipo_correo: string
          p_unidad_id: string
          p_vendedor_id: string
        }
        Returns: string
      }
      vender_unidad: {
        Args: {
          p_banco_destino?: string
          p_cantidad_periodos?: number
          p_cliente_id?: string
          p_cliente_nombre?: string
          p_cliente_whatsapp?: string
          p_cuenta_id: string
          p_fecha_venta?: string
          p_forma_pago_usd?: string
          p_inicio?: string
          p_modalidad_id?: string
          p_monto_usd?: number
          p_monto_ves?: number
          p_nombre_perfil?: string
          p_precio_usd?: number
          p_referencia_usd?: string
          p_referencia_ves?: string
          p_tasa_bcv_aplicada?: number
          p_unidad_id?: string
          p_vendedor_id?: string
        }
        Returns: string
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

