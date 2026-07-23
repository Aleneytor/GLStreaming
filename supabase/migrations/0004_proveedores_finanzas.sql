-- ============================================================================
-- 0004 — Proveedores y finanzas
-- ----------------------------------------------------------------------------
-- Cuarta capa: el lado del costo y el resultado.
--   ciclos_proveedor  = cobertura/renovación financiera de una cuenta (USDT).
--   pagos_proveedor   = desembolso real de un ciclo, valorizado a paralela.
--   gastos_operativos = egresos del negocio fuera de ciclos de proveedor.
--   cierres_mensuales = corte financiero auditable por mes calendario.
--
-- Reglas de dominio (ver docs/01-alcance-y-reglas.md):
--   * Costo y pago se guardan por separado: el costo se devenga durante la
--     cobertura; el pago afecta Caja en su fecha efectiva.
--   * Todo egreso (USDT) conserva su tasa paralela y su equivalente Bs (snapshot);
--     no se recalcula después.
--   * Un mismo desembolso nunca se registra por dos rutas (ciclo vs. gasto).
--   * Costo cero es válido; ausencia de costo es "desconocida".
--
-- El MOTOR de cálculo del cierre (prorrateo, devengo) vive en funciones/vistas
-- que se añadirán en la fase financiera; aquí se define solo el esquema donde
-- se materializa el resultado. RLS: admin-only (el revendedor no ve finanzas).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ciclos_proveedor — cobertura/inversión de una cuenta con el proveedor
-- ----------------------------------------------------------------------------
create table public.ciclos_proveedor (
  id                    uuid primary key default gen_random_uuid(),
  cuenta_id             uuid not null references public.cuentas (id) on delete restrict,
  proveedor_id          uuid not null references public.proveedores (id) on delete restrict,
  proveedor_nombre_snapshot   text not null,
  proveedor_contacto_snapshot text,
  inicio                date not null,
  proxima_renovacion    date not null,
  dia_ancla_proveedor   integer not null check (dia_ancla_proveedor between 1 and 31),
  capacidad_fisica_snapshot   integer,
  capacidad_vendible_snapshot integer,
  costo_usdt            numeric not null check (costo_usdt >= 0),  -- costo cero es válido
  tasa_paralela_id      uuid references public.tasas_cambio (id) on delete restrict,
  costo_ves_snapshot    numeric,
  confirmado_at         timestamptz,
  estado                text not null default 'vigente'
                          check (estado in ('pendiente', 'vigente', 'cancelado', 'reemplazado')),
  referencia_no_sensible text,
  created_at            timestamptz not null default now()
);
comment on column public.ciclos_proveedor.dia_ancla_proveedor is
  'Día fijo mensual de renovación con el proveedor. Un mes corto usa el último '
  'día válido y luego recupera el ancla. La flexibilidad del cliente no lo mueve.';

-- ----------------------------------------------------------------------------
-- pagos_proveedor — desembolso real de un ciclo (caja)
-- ----------------------------------------------------------------------------
create table public.pagos_proveedor (
  id                 uuid primary key default gen_random_uuid(),
  ciclo_proveedor_id uuid not null references public.ciclos_proveedor (id) on delete restrict,
  tipo               text not null default 'renovacion'
                       check (tipo in ('inicial', 'renovacion', 'reverso')),
  monto_usdt         numeric not null,
  tasa_paralela_id   uuid references public.tasas_cambio (id) on delete restrict,
  monto_ves_snapshot numeric,
  fecha_pago         date not null,
  confirmado_at      timestamptz,
  estado             text not null default 'confirmado'
                       check (estado in ('pendiente', 'confirmado', 'anulado')),
  pago_original_id   uuid references public.pagos_proveedor (id) on delete restrict,
  referencia_no_sensible text,
  created_by         uuid references public.usuarios (id) on delete set null,
  created_at         timestamptz not null default now()
);
comment on table public.pagos_proveedor is
  'El pago iguala el costo completo del ciclo (sin abonos). Un pago 1-2 días '
  'tarde solo cambia la fecha en Caja, no mueve el ciclo ni el ancla.';

-- ----------------------------------------------------------------------------
-- categorias_gasto — clasificación de gastos operativos
-- ----------------------------------------------------------------------------
create table public.categorias_gasto (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  activa     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- gastos_operativos — egresos del negocio (USDT) fuera de ciclos de proveedor
-- ----------------------------------------------------------------------------
create table public.gastos_operativos (
  id                 uuid primary key default gen_random_uuid(),
  categoria_id       uuid not null references public.categorias_gasto (id) on delete restrict,
  tipo               text not null default 'gasto' check (tipo in ('gasto', 'reverso')),
  descripcion        text,
  ocurrido_at        timestamptz not null default now(),
  fecha_gasto        date not null,
  monto_usdt         numeric not null,
  tasa_paralela_id   uuid references public.tasas_cambio (id) on delete restrict,
  monto_ves_snapshot numeric,
  confirmado_at      timestamptz,
  contraparte        text,
  plataforma_id      uuid references public.plataformas (id) on delete set null,
  cuenta_id          uuid references public.cuentas (id) on delete set null,
  referencia_no_sensible text,
  nota               text,
  estado             text not null default 'confirmado'
                       check (estado in ('pendiente', 'confirmado', 'anulado')),
  gasto_original_id  uuid references public.gastos_operativos (id) on delete restrict,
  created_by         uuid references public.usuarios (id) on delete set null,
  created_at         timestamptz not null default now(),
  -- Un gasto tiene monto positivo; un reverso lleva signo contrario.
  constraint gasto_monto_positivo check (tipo <> 'gasto' or monto_usdt > 0)
);
comment on table public.gastos_operativos is
  'Solo propósito empresarial (nada personal). Una recarga de banco es un gasto '
  'único en USDT; el dinero que cubre no se vuelve a registrar como pago de ciclo.';

-- ----------------------------------------------------------------------------
-- cierres_mensuales — snapshot financiero auditable de un mes calendario
-- ----------------------------------------------------------------------------
create table public.cierres_mensuales (
  id     uuid primary key default gen_random_uuid(),
  mes    date not null,            -- primer día del mes
  inicio date not null,
  fin    date not null,            -- primer día del mes siguiente (semiabierto)
  version integer not null default 1,
  estado text not null default 'borrador'
           check (estado in ('borrador', 'cerrado', 'reabierto', 'reemplazado')),
  tasa_bcv_id      uuid references public.tasas_cambio (id) on delete restrict,
  tasa_paralela_id uuid references public.tasas_cambio (id) on delete restrict,

  -- Ingresos y márgenes (devengado)
  ingreso_contractual_usd                 numeric not null default 0,
  ingreso_comercial_devengado_usd         numeric not null default 0,
  ves_esperados_devengados_clientes       numeric not null default 0,
  ingreso_cobrado_devengado_ves           numeric not null default 0,
  ingreso_economico_devengado_usd_paralela numeric not null default 0,
  costo_proveedor_devengado_usdt          numeric not null default 0,
  costo_proveedor_devengado_ves           numeric not null default 0,
  margen_bruto_ves                        numeric not null default 0,
  margen_bruto_economico_usd_paralela     numeric not null default 0,
  gastos_operativos_usdt                  numeric not null default 0,
  gastos_operativos_ves                   numeric not null default 0,
  ajustes_clientes_ves                    numeric not null default 0,
  ajustes_economicos_usd_paralela         numeric not null default 0,
  resultado_operativo_ves                 numeric not null default 0,
  resultado_operativo_economico_usd_paralela numeric not null default 0,

  -- Caja (flujo real)
  cobros_ves            numeric not null default 0,
  reembolsos_clientes_ves numeric not null default 0,
  pagos_proveedor_usdt  numeric not null default 0,
  pagos_proveedor_ves   numeric not null default 0,
  flujo_caja_valorizado_ves numeric not null default 0,

  -- Ocupación (días-unidad por estado)
  dias_unidad_pagados      numeric not null default 0,
  dias_unidad_cortesia     numeric not null default 0,
  dias_unidad_pausa        numeric not null default 0,
  dias_unidad_reservados   numeric not null default 0,
  dias_unidad_bloqueados   numeric not null default 0,
  dias_unidad_saneamiento  numeric not null default 0,
  dias_unidad_disponibles  numeric not null default 0,
  dias_no_reutilizables_sin_ingreso numeric not null default 0,

  -- Costos por estado (explicativos)
  costo_cortesia_ves     numeric not null default 0,
  costo_pausa_ves        numeric not null default 0,
  costo_reserva_ves      numeric not null default 0,
  costo_bloqueo_ves      numeric not null default 0,
  costo_saneamiento_ves  numeric not null default 0,
  costo_ocioso_ves       numeric not null default 0,
  costo_no_reutilizable_sin_ingreso_ves numeric not null default 0,

  calculado_at   timestamptz,
  cerrado_at     timestamptz,
  cerrado_por_id uuid references public.usuarios (id) on delete set null,
  source_watermark timestamptz,
  created_at     timestamptz not null default now(),
  unique (mes, version)
);
comment on table public.cierres_mensuales is
  'Un mes cerrado no cambia silenciosamente: un dato tardío exige reapertura '
  'versionada o ajuste referenciado, siempre con actor, motivo y auditoría.';

-- ----------------------------------------------------------------------------
-- detalles_cierre_mensual — explica cómo se formó cada total
-- ----------------------------------------------------------------------------
create table public.detalles_cierre_mensual (
  id            uuid primary key default gen_random_uuid(),
  cierre_id     uuid not null references public.cierres_mensuales (id) on delete cascade,
  fecha_negocio date not null,
  plataforma_id uuid references public.plataformas (id) on delete set null,
  producto_plataforma_id uuid references public.productos_plataforma (id) on delete set null,
  modalidad_id  uuid references public.modalidades (id) on delete set null,
  cuenta_id     uuid references public.cuentas (id) on delete set null,
  unidad_id     uuid references public.unidades_inventario (id) on delete set null,
  tipo          text not null
                  check (tipo in (
                    'ingreso_servicio', 'costo_proveedor', 'gasto_operativo',
                    'cobro_cliente', 'pago_proveedor', 'cortesia_cliente',
                    'pausa_cliente', 'reserva_inventario', 'bloqueo_tecnico',
                    'saneamiento_pendiente', 'capacidad_ociosa',
                    'costo_no_reutilizable_sin_ingreso', 'ajuste')),
  origen_id     uuid,   -- id del hecho fuente (período, pago, gasto, etc.)
  monto_fuente  numeric,
  moneda_fuente text check (moneda_fuente is null or moneda_fuente in ('usd', 'ves', 'usdt')),
  tasa_bcv_id      uuid references public.tasas_cambio (id) on delete set null,
  tasa_paralela_id uuid references public.tasas_cambio (id) on delete set null,
  dias_periodo  integer,
  dias_en_mes   integer,
  monto_base_ves            numeric,
  monto_devengado_ves       numeric,
  monto_devengado_usd_comercial numeric,
  monto_devengado_usd_paralela  numeric,
  dias_unidad   numeric,
  metadata_calculo jsonb
);

-- ============================================================================
-- Row Level Security — admin-only
-- ============================================================================
alter table public.ciclos_proveedor       enable row level security;
alter table public.pagos_proveedor        enable row level security;
alter table public.categorias_gasto       enable row level security;
alter table public.gastos_operativos      enable row level security;
alter table public.cierres_mensuales      enable row level security;
alter table public.detalles_cierre_mensual enable row level security;

create policy ciclos_proveedor_admin_all on public.ciclos_proveedor
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy pagos_proveedor_admin_all on public.pagos_proveedor
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy categorias_gasto_admin_all on public.categorias_gasto
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy gastos_operativos_admin_all on public.gastos_operativos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy cierres_admin_all on public.cierres_mensuales
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy detalles_cierre_admin_all on public.detalles_cierre_mensual
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Índices de apoyo
create index idx_ciclos_cuenta on public.ciclos_proveedor (cuenta_id);
create index idx_pagos_prov_ciclo on public.pagos_proveedor (ciclo_proveedor_id);
create index idx_gastos_categoria on public.gastos_operativos (categoria_id);
create index idx_gastos_fecha on public.gastos_operativos (fecha_gasto);
create index idx_detalles_cierre on public.detalles_cierre_mensual (cierre_id);
create index idx_detalles_fecha on public.detalles_cierre_mensual (fecha_negocio);
