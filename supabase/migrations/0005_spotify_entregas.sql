-- ============================================================================
-- 0005 — Rama Spotify + entrega de acceso y operaciones remotas
-- ----------------------------------------------------------------------------
-- Spotify es un "servicio compuesto": se separa la IDENTIDAD de acceso (login,
-- biblioteca, playlists) de la COBERTURA que la mantiene Premium (individual
-- propia por GPay, individual por proveedor, o cupo de familia). Una suscripción
-- vigente depende de ambas y cada una puede cambiar técnicamente sin reescribir
-- la otra ni la historia comercial.
--
-- Incluye además dos tablas generales (no solo Spotify):
--   entregas_acceso    = registro de cada entrega/reentrega de acceso (nunca
--                        guarda secretos en claro, solo versiones).
--   operaciones_remotas = acciones manuales sobre la plataforma externa que no
--                        pueden confirmarse atómicamente con Postgres.
--
-- Reglas de dominio (docs/plataformas/spotify.md, DEC-73..DEC-90):
--   * Familia = 1 madre administradora + 5 miembros; costo se cuenta una vez.
--   * El uso de la madre es un alcance concurrente, no ocupa cupo ni da control.
--   * Identidad sobre correo del cliente: no reutilizable; secretos se destruyen
--     al finalizar. Identidad sobre dominio GL: reutilizable tras saneamiento.
--   * Cada individual GPay tiene exactamente un Gmail pagador (no financia otra).
--   * Bloqueo de admisión (`no se puede`) frena nuevas altas sin afectar miembros.
--
-- RLS: admin-only (contienen secretos e identidades restringidas).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- identidades_spotify — cuenta de login/biblioteca de Spotify
-- ----------------------------------------------------------------------------
create table public.identidades_spotify (
  id                 uuid primary key default gen_random_uuid(),
  titular_tipo       text not null default 'negocio'
                       check (titular_tipo in ('negocio', 'cliente')),
  cliente_titular_id uuid references public.clientes (id) on delete restrict,
  tipo_correo        text not null
                       check (tipo_correo in ('dominio_gl', 'gmail_propio', 'correo_cliente')),
  login_cifrado      text,
  login_fingerprint  text,
  contrasena_cifrada text,
  version_clave      integer not null default 1,
  estado             text not null default 'activa'
                       check (estado in ('activa', 'saneamiento', 'sustituida', 'retirada', 'archivada')),
  reutilizable       boolean not null default true,
  sustituye_a_id     uuid references public.identidades_spotify (id) on delete set null,
  created_at         timestamptz not null default now(),
  archived_at        timestamptz,
  secretos_eliminados_at timestamptz,
  -- Identidad sobre correo del cliente: exige dueño y no es reutilizable.
  constraint identidad_cliente_coherente check (
    tipo_correo <> 'correo_cliente'
    or (titular_tipo = 'cliente' and cliente_titular_id is not null and reutilizable = false)
  )
);
comment on table public.identidades_spotify is
  'La biblioteca/login del cliente. Sobre dominio GL es reutilizable tras '
  'sanear; sobre correo del cliente se retira y sus secretos se destruyen.';

-- ----------------------------------------------------------------------------
-- coberturas_spotify — extensión 1:1 de una cuenta: cómo aporta Premium
-- ----------------------------------------------------------------------------
create table public.coberturas_spotify (
  cuenta_id          uuid primary key references public.cuentas (id) on delete cascade,
  tipo               text not null
                       check (tipo in ('individual_gpay_propio', 'individual_proveedor', 'familiar')),
  identidad_madre_id uuid references public.identidades_spotify (id) on delete set null,
  estado_admision    text
                       check (estado_admision is null
                              or estado_admision in ('abierta', 'bloqueada_por_spotify')),
  bloqueada_at       timestamptz,
  motivo_bloqueo     text,
  ultima_prueba_admision_at timestamptz,
  desbloqueada_at    timestamptz,
  metodo_control     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- El estado de admisión solo aplica a familias.
  constraint admision_solo_familiar check (
    estado_admision is null or tipo = 'familiar'
  )
);

create trigger trg_coberturas_updated_at
  before update on public.coberturas_spotify
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- controles_pago_spotify — Gmail pagador de una individual GPay (referencia)
-- ----------------------------------------------------------------------------
create table public.controles_pago_spotify (
  id                 uuid primary key default gen_random_uuid(),
  cobertura_cuenta_id uuid not null unique references public.coberturas_spotify (cuenta_id) on delete cascade,
  gmail_cifrado      text not null,
  gmail_fingerprint  text not null unique,   -- global: un Gmail no financia dos (DEC-84)
  origen             text check (origen in ('gpay_nigeria', 'gpay_usa')),
  version_clave      integer not null default 1,
  created_at         timestamptz not null default now(),
  archived_at        timestamptz
);
comment on table public.controles_pago_spotify is
  'Referencia restringida. NUNCA guarda contraseña, recuperación, 2FA ni datos '
  'de tarjeta del Gmail pagador. La huella global impide reutilizarlo en otra '
  'cobertura (DEC-84).';

-- ----------------------------------------------------------------------------
-- vinculos_identidad_spotify — qué identidad presta experiencia a una suscripción
-- ----------------------------------------------------------------------------
create table public.vinculos_identidad_spotify (
  id                  uuid primary key default gen_random_uuid(),
  suscripcion_id      uuid not null references public.suscripciones (id) on delete cascade,
  identidad_spotify_id uuid not null references public.identidades_spotify (id) on delete restrict,
  inicio              timestamptz not null default now(),
  fin                 timestamptz,
  motivo_fin          text,
  created_by          uuid references public.usuarios (id) on delete set null,
  created_at          timestamptz not null default now()
);
-- A lo sumo un vínculo de identidad vigente por suscripción.
create unique index idx_vinculo_identidad_vigente
  on public.vinculos_identidad_spotify (suscripcion_id)
  where fin is null;

-- ----------------------------------------------------------------------------
-- incidencias_spotify — agrupa una falla técnica (caída familiar, etc.)
-- ----------------------------------------------------------------------------
create table public.incidencias_spotify (
  id                    uuid primary key default gen_random_uuid(),
  cobertura_origen_cuenta_id uuid not null references public.coberturas_spotify (cuenta_id) on delete cascade,
  tipo                  text not null
                          check (tipo in ('caida_familiar', 'falla_individual_proveedor', 'bloqueo_admision')),
  estado                text not null default 'abierta'
                          check (estado in ('abierta', 'en_proceso', 'resuelta', 'cancelada')),
  detectada_at          timestamptz not null default now(),
  snapshot_afectados_at timestamptz,
  iniciada_por_id       uuid references public.usuarios (id) on delete set null,
  finalizada_at         timestamptz,
  nota_no_sensible      text
);

-- ----------------------------------------------------------------------------
-- casos_incidencia_spotify — seguimiento individual dentro de una incidencia
-- ----------------------------------------------------------------------------
create table public.casos_incidencia_spotify (
  id                   uuid primary key default gen_random_uuid(),
  incidencia_id        uuid not null references public.incidencias_spotify (id) on delete cascade,
  suscripcion_id       uuid not null references public.suscripciones (id) on delete restrict,
  identidad_origen_id  uuid references public.identidades_spotify (id) on delete set null,
  identidad_destino_id uuid references public.identidades_spotify (id) on delete set null,
  asignacion_origen_id uuid references public.asignaciones_inventario (id) on delete set null,
  asignacion_destino_id uuid references public.asignaciones_inventario (id) on delete set null,
  tipo_resolucion      text
                         check (tipo_resolucion is null or tipo_resolucion in
                           ('recrear_identidad', 'trasladar_cobertura', 'rescate_individual',
                            'reactivar_misma_identidad')),
  estado               text not null default 'abierto'
                         check (estado in ('abierto', 'en_proceso', 'resuelto', 'cancelado')),
  iniciado_at          timestamptz not null default now(),
  resuelto_at          timestamptz,
  error_no_sensible    text,
  unique (incidencia_id, suscripcion_id)
);
comment on table public.casos_incidencia_spotify is
  'Cada caso conserva su suscripción/período/precio; el lote no crea ventas '
  'ni renovaciones ficticias.';

-- ----------------------------------------------------------------------------
-- entregas_acceso — registro de cada entrega/reentrega (nunca secretos en claro)
-- ----------------------------------------------------------------------------
create table public.entregas_acceso (
  id                    uuid primary key default gen_random_uuid(),
  suscripcion_id        uuid not null references public.suscripciones (id) on delete cascade,
  periodo_servicio_id   uuid references public.periodos_servicio (id) on delete set null,
  asignacion_inventario_id uuid references public.asignaciones_inventario (id) on delete set null,
  identidad_spotify_id  uuid references public.identidades_spotify (id) on delete set null,
  tipo                  text not null
                          check (tipo in ('alta', 'renovacion', 'traslado', 'reemplazo_identidad',
                                          'rotacion_credenciales', 'reenvio')),
  estado                text not null default 'pendiente'
                          check (estado in ('pendiente', 'entregada', 'revocada')),
  credencial_cuenta_version   integer,
  credencial_identidad_version integer,
  secreto_unidad_version      integer,
  nombre_perfil_snapshot text,
  fecha_renovacion_snapshot date,
  entregada_por_id      uuid references public.usuarios (id) on delete set null,
  entregada_at          timestamptz,
  canal                 text,
  motivo                text,
  revocada_at           timestamptz,
  motivo_revocacion     text,
  created_at            timestamptz not null default now()
);
comment on table public.entregas_acceso is
  'Guarda solo VERSIONES de credencial/PIN y metadatos, nunca los secretos '
  'descifrados. El paquete de acceso se arma en memoria y la respuesta es efímera.';

-- ----------------------------------------------------------------------------
-- operaciones_remotas — acciones manuales sobre la plataforma externa
-- ----------------------------------------------------------------------------
create table public.operaciones_remotas (
  id                    uuid primary key default gen_random_uuid(),
  tipo                  text not null
                          check (tipo in (
                            'eliminar_perfil', 'restablecer_perfil', 'rotar_pin',
                            'rotar_credencial_madre', 'rotar_credencial_spotify', 'cerrar_sesiones',
                            'retirar_miembro_familiar', 'respaldar_biblioteca_spotify',
                            'renombrar_identidad_spotify', 'crear_identidad_spotify',
                            'restaurar_biblioteca_spotify', 'reactivar_individual_spotify',
                            'probar_admision_spotify')),
  estado                text not null default 'pendiente'
                          check (estado in ('pendiente', 'en_proceso', 'confirmada', 'fallida', 'cancelada')),
  clave_idempotencia    text,
  cuenta_id             uuid references public.cuentas (id) on delete set null,
  unidad_id             uuid references public.unidades_inventario (id) on delete set null,
  asignacion_id         uuid references public.asignaciones_inventario (id) on delete set null,
  caso_incidencia_spotify_id uuid references public.casos_incidencia_spotify (id) on delete set null,
  politica_revocacion_snapshot text,
  estado_revocacion     text,
  iniciada_por_id       uuid references public.usuarios (id) on delete set null,
  iniciada_at           timestamptz not null default now(),
  finalizada_por_id     uuid references public.usuarios (id) on delete set null,
  finalizada_at         timestamptz,
  evidencia_no_sensible text,
  error_resumido        text
);
comment on table public.operaciones_remotas is
  'Workflow reintentable: la limpieza externa no cabe en una transacción SQL. '
  'Los campos de evidencia/error nunca contienen contraseña, PIN ni datos personales.';
create unique index idx_operacion_idempotencia
  on public.operaciones_remotas (clave_idempotencia)
  where clave_idempotencia is not null;

-- ============================================================================
-- Row Level Security — admin-only
-- ============================================================================
alter table public.identidades_spotify        enable row level security;
alter table public.coberturas_spotify         enable row level security;
alter table public.controles_pago_spotify     enable row level security;
alter table public.vinculos_identidad_spotify enable row level security;
alter table public.incidencias_spotify        enable row level security;
alter table public.casos_incidencia_spotify   enable row level security;
alter table public.entregas_acceso            enable row level security;
alter table public.operaciones_remotas        enable row level security;

create policy identidades_spotify_admin_all on public.identidades_spotify
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy coberturas_spotify_admin_all on public.coberturas_spotify
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy controles_pago_admin_all on public.controles_pago_spotify
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy vinculos_identidad_admin_all on public.vinculos_identidad_spotify
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy incidencias_spotify_admin_all on public.incidencias_spotify
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy casos_incidencia_admin_all on public.casos_incidencia_spotify
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy entregas_acceso_admin_all on public.entregas_acceso
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy operaciones_remotas_admin_all on public.operaciones_remotas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Índices de apoyo
create index idx_coberturas_madre on public.coberturas_spotify (identidad_madre_id);
create index idx_vinculos_suscripcion on public.vinculos_identidad_spotify (suscripcion_id);
create index idx_casos_incidencia on public.casos_incidencia_spotify (incidencia_id);
create index idx_entregas_suscripcion on public.entregas_acceso (suscripcion_id);
create index idx_operaciones_cuenta on public.operaciones_remotas (cuenta_id);
create index idx_operaciones_caso on public.operaciones_remotas (caso_incidencia_spotify_id);
