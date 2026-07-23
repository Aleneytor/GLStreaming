-- ============================================================================
-- 0003 — Ciclo comercial
-- ----------------------------------------------------------------------------
-- Tercera capa: la relación comercial con el cliente y su historia.
--   suscripciones  = relación estable (cliente + producto + modalidad).
--   asignaciones   = por qué recurso pasa el cliente (permite traslados).
--   periodos       = cada venta/renovación (una renovación NO borra la anterior).
--   pagos_cliente  = caja real recibida, separada del precio acordado.
--
-- Incluye `tasas_cambio` (prerrequisito: los períodos y pagos congelan las tasas)
-- y `contactos_comerciales` (comprador/pagador/intermediario, distintos del
-- beneficiario que usa el servicio).
--
-- Reglas de dominio clave (ver docs/01-alcance-y-reglas.md):
--   * Importes en `numeric`, nunca float.
--   * Período pagado semiabierto [inicio, fecha_renovacion).
--   * Vencer no libera: eso lo maneja el estado de la suscripción, no una fecha.
--   * Historial inmutable: renovar agrega un período nuevo.
--
-- RLS de esta capa: admin-only. El acceso del revendedor a "sus ventas" se
-- añadirá con el portal de revendedores (fase posterior), mediante políticas
-- y vistas específicas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- tasas_cambio — historial inmutable de tasas BCV y paralela (prerrequisito)
-- ----------------------------------------------------------------------------
create table public.tasas_cambio (
  id                 uuid primary key default gen_random_uuid(),
  tipo               text not null check (tipo in ('bcv', 'paralela')),
  fecha_vigencia     date,   -- obligatoria para BCV, nula para paralela
  vigente_desde      timestamptz not null default now(),
  bs_por_usd         numeric not null check (bs_por_usd > 0),
  fuente             text,
  fuente_registro_id text,
  publicada_at       timestamptz,
  observada_fuente_at timestamptz,
  obtenida_at        timestamptz not null default now(),
  detalle_fuentes    jsonb,
  version            integer not null default 1,
  estado             text not null default 'vigente'
                       check (estado in ('vigente', 'corregida', 'descartada')),
  payload_hash       text,
  created_at         timestamptz not null default now(),
  -- BCV siempre trae fecha de vigencia; la paralela no.
  constraint bcv_exige_fecha_vigencia check (tipo <> 'bcv' or fecha_vigencia is not null)
);
comment on table public.tasas_cambio is
  'Inmutable: una corrección crea otra observación/versión, no reescribe la '
  'operación que ya usó una tasa congelada. Normalizado como Bs por USD.';

-- ----------------------------------------------------------------------------
-- contactos_comerciales — comprador/pagador/intermediario (no el beneficiario)
-- ----------------------------------------------------------------------------
create table public.contactos_comerciales (
  id                   uuid primary key default gen_random_uuid(),
  nombre               text not null,
  whatsapp_normalizado text,
  whatsapp_original    text,
  notas                text,
  created_at           timestamptz not null default now(),
  archived_at          timestamptz
);

-- ----------------------------------------------------------------------------
-- suscripciones — relación comercial estable
-- ----------------------------------------------------------------------------
create table public.suscripciones (
  id                    uuid primary key default gen_random_uuid(),
  cliente_id            uuid not null references public.clientes (id) on delete restrict,
  producto_plataforma_id uuid not null references public.productos_plataforma (id) on delete restrict,
  modalidad_id          uuid not null references public.modalidades (id) on delete restrict,
  vendedor_origen_id    uuid references public.vendedores (id) on delete set null,
  estado                text not null default 'activa'
                          check (estado in ('activa', 'pausada', 'cancelada', 'finalizada')),
  recontactar_el        date,
  nota_renovacion       text,
  created_at            timestamptz not null default now(),
  closed_at             timestamptz
);
comment on column public.suscripciones.producto_plataforma_id is
  'Producto y modalidad son inmutables tras el primer período: cambiarlos cierra '
  'la suscripción y crea otra (se valida en la capa de servidor).';

-- ----------------------------------------------------------------------------
-- suscripcion_contactos — roles comerciales no beneficiarios de una suscripción
-- ----------------------------------------------------------------------------
create table public.suscripcion_contactos (
  id                   uuid primary key default gen_random_uuid(),
  suscripcion_id       uuid not null references public.suscripciones (id) on delete cascade,
  contacto_comercial_id uuid not null references public.contactos_comerciales (id) on delete restrict,
  rol                  text not null
                         check (rol in ('comprador', 'pagador', 'intermediario', 'contacto_renovacion')),
  inicio               timestamptz not null default now(),
  fin                  timestamptz,
  es_contacto_principal boolean not null default false,
  created_at           timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- historial_estado_suscripcion
-- ----------------------------------------------------------------------------
create table public.historial_estado_suscripcion (
  id              uuid primary key default gen_random_uuid(),
  suscripcion_id  uuid not null references public.suscripciones (id) on delete cascade,
  estado_anterior text,
  estado_nuevo    text not null,
  ocurrio_at      timestamptz not null default now(),
  motivo          text,
  actor_id        uuid references public.usuarios (id) on delete set null
);

-- ----------------------------------------------------------------------------
-- sesiones_carga_inicial — ventana autorizada para cargar cartera previa
-- ----------------------------------------------------------------------------
create table public.sesiones_carga_inicial (
  id                    uuid primary key default gen_random_uuid(),
  producto_plataforma_id uuid references public.productos_plataforma (id) on delete restrict,
  fecha_corte           date not null,
  conteo_esperado       integer,
  estado                text not null default 'abierta'
                          check (estado in ('abierta', 'cerrada')),
  version               integer not null default 1,
  abierta_por_id        uuid references public.usuarios (id) on delete set null,
  abierta_at            timestamptz not null default now(),
  cerrada_por_id        uuid references public.usuarios (id) on delete set null,
  cerrada_at            timestamptz,
  motivo                text,
  reapertura_de_id      uuid references public.sesiones_carga_inicial (id) on delete set null
);
comment on table public.sesiones_carga_inicial is
  'La carga histórica (carga_inicial) solo se permite con una sesión abierta; '
  'cerrarla deshabilita nuevas cargas. Corregir exige otra sesión versionada.';

-- ----------------------------------------------------------------------------
-- asignaciones_inventario — qué recurso presta servicio a una suscripción
-- ----------------------------------------------------------------------------
create table public.asignaciones_inventario (
  id                    uuid primary key default gen_random_uuid(),
  suscripcion_id        uuid not null references public.suscripciones (id) on delete cascade,
  producto_plataforma_id uuid not null references public.productos_plataforma (id) on delete restrict,
  modalidad_id          uuid not null references public.modalidades (id) on delete restrict,
  alcance               text not null check (alcance in ('unidad', 'cuenta', 'principal')),
  cuenta_id             uuid not null references public.cuentas (id) on delete restrict,
  unidad_id             uuid references public.unidades_inventario (id) on delete restrict,
  consume_capacidad     boolean not null default true,
  capacidad_fisica_snapshot integer,
  capacidad_vendible_consumida_snapshot integer,
  inicio                timestamptz not null default now(),
  fin                   timestamptz,
  estado_cierre         text not null default 'ninguno'
                          check (estado_cierre in ('ninguno', 'cierre_pendiente')),
  motivo_fin            text
                          check (motivo_fin is null or motivo_fin in
                            ('traslado_falla', 'traslado_operativo', 'no_renovacion',
                             'cancelacion', 'cambio_modalidad', 'otro')),
  created_by            uuid references public.usuarios (id) on delete set null
);
comment on table public.asignaciones_inventario is
  'Registra cada recurso por el que pasa el cliente. Un traslado por falla cierra '
  'el tramo y abre otro, sin tocar suscripción/período/precio/fecha.';

-- Una unidad no puede tener dos asignaciones abiertas a la vez.
create unique index idx_asignacion_unidad_abierta
  on public.asignaciones_inventario (unidad_id)
  where fin is null and unidad_id is not null;

-- A lo sumo una asignación de cuenta completa abierta por cuenta.
-- (La exclusión completa vs. perfiles la garantiza la función de asignación.)
create unique index idx_asignacion_cuenta_completa_abierta
  on public.asignaciones_inventario (cuenta_id)
  where fin is null and alcance = 'cuenta';

-- ----------------------------------------------------------------------------
-- periodos_servicio — cada carga inicial / venta / renovación
-- ----------------------------------------------------------------------------
create table public.periodos_servicio (
  id                     uuid primary key default gen_random_uuid(),
  suscripcion_id         uuid not null references public.suscripciones (id) on delete cascade,
  vendedor_id            uuid references public.vendedores (id) on delete set null,
  tipo_operacion         text not null
                           check (tipo_operacion in
                             ('carga_inicial', 'venta_nueva', 'renovacion', 'renovacion_tardia')),
  sesion_carga_inicial_id uuid references public.sesiones_carga_inicial (id) on delete restrict,
  clave_idempotencia     text,
  fecha_venta            date,
  inicio                 date not null,
  fecha_renovacion       date not null,
  periodicidad           text not null default 'mes_calendario',
  cantidad_periodos      integer not null default 1 check (cantidad_periodos > 0),
  precio_comercial_usd   numeric check (precio_comercial_usd is null or precio_comercial_usd >= 0),
  tasa_bcv_id            uuid references public.tasas_cambio (id) on delete restrict,
  tasa_paralela_id       uuid references public.tasas_cambio (id) on delete restrict,
  monto_ves_esperado     numeric,
  estado_datos_financieros text not null default 'completo'
                           check (estado_datos_financieros in ('completo', 'pendiente')),
  estado                 text not null default 'vigente'
                           check (estado in ('vigente', 'cerrado', 'anulado')),
  created_at             timestamptz not null default now(),
  -- Período pagado semiabierto: la renovación siempre es posterior al inicio.
  constraint periodo_fechas_validas check (fecha_renovacion > inicio),
  -- La carga inicial exige su sesión; una venta/renovación no la usa.
  constraint carga_inicial_exige_sesion check (
    (tipo_operacion = 'carga_inicial') = (sesion_carga_inicial_id is not null)
  )
);
-- La clave de idempotencia (cuando existe) es única: reintentar no duplica.
create unique index idx_periodo_idempotencia
  on public.periodos_servicio (clave_idempotencia)
  where clave_idempotencia is not null;

-- ----------------------------------------------------------------------------
-- pagos_cliente — caja real recibida (separada del precio acordado)
-- ----------------------------------------------------------------------------
create table public.pagos_cliente (
  id                        uuid primary key default gen_random_uuid(),
  periodo_servicio_id       uuid not null references public.periodos_servicio (id) on delete restrict,
  tipo                      text not null default 'cobro'
                              check (tipo in ('cobro', 'reverso')),
  monto_ves                 numeric not null,
  monto_ves_esperado_snapshot numeric,
  tasa_bcv_id               uuid references public.tasas_cambio (id) on delete restrict,
  tasa_paralela_id          uuid references public.tasas_cambio (id) on delete restrict,
  ocurrido_at               timestamptz not null default now(),
  estado                    text not null default 'confirmado'
                              check (estado in ('pendiente', 'confirmado', 'anulado')),
  pago_original_id          uuid references public.pagos_cliente (id) on delete restrict,
  referencia                text,
  created_by                uuid references public.usuarios (id) on delete set null
);
comment on table public.pagos_cliente is
  'No existen abonos: un cobro confirmado iguala el monto VES esperado. '
  'Un reverso referencia al pago original con signo contrario.';

-- ============================================================================
-- Row Level Security — admin-only en esta capa
-- ============================================================================
alter table public.tasas_cambio                 enable row level security;
alter table public.contactos_comerciales        enable row level security;
alter table public.suscripciones                enable row level security;
alter table public.suscripcion_contactos        enable row level security;
alter table public.historial_estado_suscripcion enable row level security;
alter table public.sesiones_carga_inicial       enable row level security;
alter table public.asignaciones_inventario      enable row level security;
alter table public.periodos_servicio            enable row level security;
alter table public.pagos_cliente                enable row level security;

create policy tasas_admin_all on public.tasas_cambio
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy contactos_admin_all on public.contactos_comerciales
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy suscripciones_admin_all on public.suscripciones
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy suscripcion_contactos_admin_all on public.suscripcion_contactos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy hist_suscripcion_admin_all on public.historial_estado_suscripcion
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy sesiones_carga_admin_all on public.sesiones_carga_inicial
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy asignaciones_admin_all on public.asignaciones_inventario
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy periodos_admin_all on public.periodos_servicio
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy pagos_cliente_admin_all on public.pagos_cliente
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Índices de apoyo
create index idx_suscripciones_cliente on public.suscripciones (cliente_id);
create index idx_suscripciones_vendedor on public.suscripciones (vendedor_origen_id);
create index idx_asignaciones_suscripcion on public.asignaciones_inventario (suscripcion_id);
create index idx_asignaciones_cuenta on public.asignaciones_inventario (cuenta_id);
create index idx_periodos_suscripcion on public.periodos_servicio (suscripcion_id);
create index idx_pagos_periodo on public.pagos_cliente (periodo_servicio_id);
create index idx_tasas_tipo_fecha on public.tasas_cambio (tipo, obtenida_at desc);
