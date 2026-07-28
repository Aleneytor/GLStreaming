# GEMINI.md — Guía Rápida de Referencia Técnica y Dominio para Agentes

> Este archivo complementa a `AGENTS.md` y sirve como **referencia técnica obligatoria** antes de escribir o modificar código en **GL Streaming**.
> ⚠️ **REGLA DE ORO:** Nunca adivines nombres de RPCs, columnas o tipos de datos. Revisa este archivo o inspecciona `supabase/migrations/` y `src/lib/supabase/database.types.ts`.

---

## 1. Mapa Oficial de Funciones Almacenadas (RPCs de Supabase)

Cuando llames a funciones de Postgres mediante `supabase.rpc(...)`, usa **EXCLUSIVAMENTE** estos nombres y parámetros reales:

| Acción | Nombre Exacto del RPC | Parámetros Principales | Nombres Inexistentes Prohibidos 🚫 |
|---|---|---|---|
| **Vender Unidad / Cuenta** | `vender_unidad` | `p_cuenta_id`, `p_unidad_id`, `p_modalidad_id`, `p_cliente_nombre`, `p_cliente_whatsapp`, `p_precio_usd`, `p_monto_usd`, `p_inicio`, `p_vendedor_id`, `p_cantidad_periodos` | *(No confundir la posición de parámetros)* |
| **Eliminar Cuenta** | `eliminar_cuenta` | `p_cuenta_id` | `borrar_cuenta_admin` ❌ |
| **Eliminar Cliente** | `eliminar_cliente` | `p_cliente_id` | `borrar_cliente` ❌ |
| **Cobrar Período** | `registrar_cobro_cliente` | `p_periodo_id`, `p_monto_ves`, `p_referencia`, `p_ocurrido_at`, `p_monto_usd` | `p_banco`, `p_ref_ves`, `p_tasa_bcv` ❌ |
| **Renovar Período** | `renovar_y_cobrar` | `p_suscripcion_id`, `p_inicio`, `p_meses`, `p_monto_ves`, `p_monto_usd`, `p_tardia`, `p_referencia`, `p_vendedor_id`, `p_actualizar_vendedor` | `p_vendedor_id` solo se aplica atómicamente cuando `p_actualizar_vendedor=true` |
| **Renovar/Pagar Proveedor** | `registrar_renovacion_y_pago` | `p_cuenta_id`, `p_costo_usdt`, `p_inicio`, `p_fecha_pago`, `p_referencia`, `p_pagar` | `registrar_ciclo_proveedor` no crea pagos ❌ |
| **Renovar Proveedor por Lote** | `registrar_renovaciones_proveedor_lote` | `p_items` (JSONB con `cuenta_id`/`costo_usdt`), `p_fecha_pago`, `p_referencia` | No usar la fecha común de pago como inicio de todos los ciclos ❌ |
| **Confirmar Limpieza** | `confirmar_limpieza_unidad` | `p_unidad_id` | `limpiar_unidad` ❌ |
| **Preparar identidad Spotify** | `preparar_identidad_spotify` | `p_unidad_id`, `p_login_cifrado`, `p_login_fingerprint`, `p_contrasena_cifrada`, `p_tipo_correo` | Preparar no equivale a vender ni ocupar el cupo |
| **Corregir cobro cliente** | `corregir_cobro_cliente` | `p_periodo_id`, `p_nuevo_monto_usd`, `p_motivo` | No actualizar ni borrar el cobro original: crea reverso y sustituto auditados |

---

## 2. Esquema de Tablas y Columnas Críticas

### `suscripciones`
- `id` (uuid)
- `cliente_id` (uuid -> `clientes.id`)
- `producto_plataforma_id` (uuid -> `productos_plataforma.id`)
- `modalidad_id` (uuid -> `modalidades.id`)
- `vendedor_origen_id` (uuid -> `vendedores.id`) ⚠️ **NO se llama `vendedor_id` en esta tabla**.
- `estado` (`activa`, `cancelada`, `vencida`, etc.)

### `periodos_servicio`
- `id` (uuid)
- `suscripcion_id` (uuid -> `suscripciones.id`)
- `vendedor_id` (uuid -> `vendedores.id`) ⚠️ **Aquí sí se llama `vendedor_id`**.
- `inicio` (date)
- `fecha_renovacion` (date)
- `precio_comercial_usd` (numeric)

### `vendedores`
- `id` (uuid)
- `usuario_id` (uuid -> `usuarios.id`, nulo si no tiene acceso web)
- `nombre` (text)
- `alias` (text)
- `activo` (boolean)

### `clientes`
- `id` (uuid)
- `nombre` (text)
- `whatsapp_original` (text) ⚠️ **Solo actualizar si el formulario trae valor no vacío**.
- `whatsapp_normalizado` (text)
- `archived_at` (timestamptz)

### `unidades_inventario`
- `id` (uuid)
- `cuenta_id` (uuid -> `cuentas.id`)
- `numero_slot` (integer)
- `nombre_visible` (text)
- `estado_operativo` (`habilitada`, `deshabilitada`)
- `estado_preparacion` (`lista`, `por_limpiar`)

---

## 3. Protocolo Obligatorio de Validación y Manejo de Errores

### A. Chequeo de Errores en Supabase (Server Actions)
Supabase JS **nunca lanza excepciones de JavaScript** por errores de base de datos o RPC. Retorna `{ data, error }`.
**SIEMPRE** debes comprobar y retornar el error:

```typescript
const { data, error } = await supabase.rpc("nombre_rpc", { ... });
if (error) {
  return { error: error.message };
}
```

### B. Modificación de WhatsApp de Clientes
Nunca mandes `null` a ciegas para no borrar el número existente del cliente:

```typescript
if (clienteWhatsapp) {
  await supabase.from("clientes").update({
    whatsapp_original: clienteWhatsapp,
    whatsapp_normalizado: clienteWhatsapp.replace(/[^0-9+]/g, ""),
  }).eq("id", clienteId);
}
```

### C. Verificación Posterior a Cada Cambio
Ejecuta siempre estas dos verificaciones en la consola:
1. `npx tsc --noEmit` (Chequeo de tipos estáticos)
2. `npm test` (Pruebas unitarias en Vitest)

Si modificas funciones SQL o RPCs, valida con las suites SQL en Docker Postgres:
`Get-Content supabase\tests\<suite>.sql -Raw | docker exec -i supabase_db_GLStreaming psql -U postgres -d postgres`

---

## 4. Reglas de Negocio del Dominio (DEC-01 a DEC-101)

1. **Zona Horaria**: `America/Caracas`.
2. **Dinero**: Siempre en `numeric`, jamás en `float` o `double`.
3. **Plazos**: Trabajo **de mes a mes** (1 mes comercial exacto), no extensiones genéricas de 30 días fijas.
4. **Secretos / PINs**: Siempre cifrados con AES-256-GCM (`src/lib/crypto.ts`), la clave vive en `.env.local` y jamás en Postgres.
5. **Cuentas Completas**: Ocupan todos los slots y se muestran de forma unificada en el inventario.
