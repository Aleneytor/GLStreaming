-- ============================================================================
-- 0002 — Inventario y secretos
-- ----------------------------------------------------------------------------
-- Segunda capa: el inventario real (cuentas y sus unidades) y los contenedores
-- de secretos (credenciales de cuenta, PIN de unidad). Incluye `clientes` como
-- prerrequisito, porque una cuenta propiedad del cliente (ej. YouTube) referencia
-- a su dueño.
--
-- Los secretos se guardan SIEMPRE cifrados a nivel de aplicación (AES-256-GCM,
-- ver src/lib/crypto.ts). La base de datos solo almacena el texto cifrado y una
-- huella (fingerprint HMAC) para detectar duplicados sin ver el valor. La clave
-- de cifrado nunca vive en Postgres.
--
-- RLS de esta capa: TODO admin-only. El acceso del revendedor a "disponibilidad
-- saneada" se hará más adelante mediante vistas seguras, nunca sobre estas tablas
-- base (que contienen secretos, costos y datos internos).
--
-- Referencias: docs/02-modelo-dominio.md, docs/03-arquitectura-y-seguridad.md.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- clientes — beneficiario que usa un servicio (prerrequisito de cuentas)
-- ----------------------------------------------------------------------------
create table public.clientes (
  id                   uuid primary key default gen_random_uuid(),
  nombre               text not null,
  whatsapp_normalizado text,   -- text: preserva '+' y ceros iniciales
  whatsapp_original    text,
  notas                text,
  created_at           timestamptz not null default now(),
  archived_at          timestamptz
);
comment on table public.clientes is
  'Beneficiario que usa una suscripción. Puede diferir de quien compra/paga '
  '(esos van a contactos_comerciales, en una capa posterior).';

-- ----------------------------------------------------------------------------
-- cuentas — fila padre operativa (sin correo/contraseña: eso va cifrado aparte)
-- ----------------------------------------------------------------------------
create table public.cuentas (
  id                    uuid primary key default gen_random_uuid(),
  producto_plataforma_id uuid not null references public.productos_plataforma (id) on delete restrict,
  alias                 text,
  capacidad             integer not null check (capacidad > 0),
  capacidad_vendible_habilitada integer check (capacidad_vendible_habilitada > 0),
  titular_tipo          text not null default 'negocio'
                          check (titular_tipo in ('negocio', 'cliente', 'proveedor')),
  cliente_propietario_id uuid references public.clientes (id) on delete restrict,
  reutilizable          boolean not null default true,
  proveedor_operativo_id uuid references public.proveedores (id) on delete set null,
  estado                text not null default 'activa'
                          check (estado in ('activa', 'mantenimiento', 'suspendida', 'archivada')),
  created_at            timestamptz not null default now(),
  archived_at           timestamptz,
  -- La capacidad vendible no puede exceder la física.
  constraint vendible_no_supera_fisica check (
    capacidad_vendible_habilitada is null
    or capacidad_vendible_habilitada <= capacidad
  ),
  -- Un recurso propiedad del cliente exige dueño y no es reutilizable.
  constraint titular_cliente_coherente check (
    titular_tipo <> 'cliente'
    or (cliente_propietario_id is not null and reutilizable = false)
  )
);
comment on column public.cuentas.producto_plataforma_id is
  'Inmutable tras activar o crear historia (se valida en la capa de servidor).';

-- ----------------------------------------------------------------------------
-- cuenta_modalidades — modalidades comerciales que admite una cuenta concreta
-- ----------------------------------------------------------------------------
create table public.cuenta_modalidades (
  id           uuid primary key default gen_random_uuid(),
  cuenta_id    uuid not null references public.cuentas (id) on delete cascade,
  modalidad_id uuid not null references public.modalidades (id) on delete restrict,
  activa       boolean not null default true,
  created_at   timestamptz not null default now(),
  archived_at  timestamptz,
  unique (cuenta_id, modalidad_id)
);
comment on table public.cuenta_modalidades is
  'El producto es derivable desde la cuenta; no se duplica aquí para evitar '
  'inconsistencias. La modalidad debe pertenecer al producto de la cuenta '
  '(se valida en la capa de servidor).';

-- ----------------------------------------------------------------------------
-- credenciales_cuenta — contenedor restringido de login/contraseña (cifrado)
-- ----------------------------------------------------------------------------
create table public.credenciales_cuenta (
  id                 uuid primary key default gen_random_uuid(),
  cuenta_id          uuid not null unique references public.cuentas (id) on delete cascade,
  tipo_credencial    text not null default 'principal',
  titular_tipo       text not null default 'negocio'
                       check (titular_tipo in ('negocio', 'cliente', 'proveedor')),
  cliente_titular_id uuid references public.clientes (id) on delete restrict,
  login_cifrado      text,   -- base64 de AES-256-GCM (iv+tag+ct)
  login_fingerprint  text,   -- HMAC del login (para detectar duplicados)
  contrasena_cifrada text,
  version_clave      integer not null default 1,
  rotada_at          timestamptz,
  eliminada_at       timestamptz,
  created_at         timestamptz not null default now()
);
comment on table public.credenciales_cuenta is
  'Nunca guarda login/contraseña en claro. El revelado es admin-only, temporal '
  'y auditado; la grilla solo recibe una máscara calculada por el servidor.';

-- ----------------------------------------------------------------------------
-- unidades_inventario — unidad física mínima (ej. perfil con PIN)
-- ----------------------------------------------------------------------------
create table public.unidades_inventario (
  id                 uuid primary key default gen_random_uuid(),
  cuenta_id          uuid not null references public.cuentas (id) on delete cascade,
  numero_slot        integer not null check (numero_slot > 0),
  nombre_visible     text,
  tipo_unidad        text
                       check (tipo_unidad in
                              ('perfil', 'extra', 'dispositivo', 'miembro_familiar', 'asiento')),
  estado_operativo   text not null default 'habilitada'
                       check (estado_operativo in ('habilitada', 'mantenimiento', 'retirada')),
  estado_preparacion text not null default 'lista'
                       check (estado_preparacion in ('lista', 'pendiente_limpieza')),
  created_at         timestamptz not null default now(),
  archived_at        timestamptz,
  unique (cuenta_id, numero_slot)
);
comment on column public.unidades_inventario.numero_slot is
  'Único dentro de la cuenta (no global). El techo (<= capacidad de la cuenta) '
  'se valida en la función transaccional que crea unidades.';

-- ----------------------------------------------------------------------------
-- secretos_unidad — PIN u otro secreto de una unidad (cifrado)
-- ----------------------------------------------------------------------------
create table public.secretos_unidad (
  id                        uuid primary key default gen_random_uuid(),
  unidad_id                 uuid not null unique references public.unidades_inventario (id) on delete cascade,
  pin_cifrado               text,
  secreto_adicional_cifrado text,
  version_clave             integer not null default 1,
  rotada_at                 timestamptz,
  created_at                timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- historial_estado_unidad — bitácora de transiciones de estado de una unidad
-- ----------------------------------------------------------------------------
create table public.historial_estado_unidad (
  id              uuid primary key default gen_random_uuid(),
  unidad_id       uuid not null references public.unidades_inventario (id) on delete cascade,
  estado_anterior text,
  estado_nuevo    text not null,
  ocurrio_at      timestamptz not null default now(),
  actor_id        uuid references public.usuarios (id) on delete set null,
  motivo          text
);

-- ----------------------------------------------------------------------------
-- reservas_inventario — retención temporal previa a una asignación
-- ----------------------------------------------------------------------------
create table public.reservas_inventario (
  id                    uuid primary key default gen_random_uuid(),
  producto_plataforma_id uuid not null references public.productos_plataforma (id) on delete restrict,
  modalidad_id          uuid not null references public.modalidades (id) on delete restrict,
  alcance               text not null check (alcance in ('unidad', 'cuenta', 'principal')),
  cuenta_id             uuid not null references public.cuentas (id) on delete cascade,
  unidad_id             uuid references public.unidades_inventario (id) on delete cascade,
  -- FK a solicitudes_stock se añadirá en la capa de revendedores.
  solicitud_stock_id    uuid,
  cliente_id            uuid references public.clientes (id) on delete set null,
  estado                text not null default 'activa'
                          check (estado in ('activa', 'convertida', 'cancelada', 'expirada')),
  reservada_at          timestamptz not null default now(),
  expira_at             timestamptz,
  resuelta_at           timestamptz,
  created_by            uuid references public.usuarios (id) on delete set null
);
comment on table public.reservas_inventario is
  'No crea período, cobro ni ingreso. Es solo una retención temporal.';

-- ============================================================================
-- Row Level Security — todo admin-only en esta capa
-- ============================================================================
alter table public.clientes                enable row level security;
alter table public.cuentas                 enable row level security;
alter table public.cuenta_modalidades      enable row level security;
alter table public.credenciales_cuenta     enable row level security;
alter table public.unidades_inventario     enable row level security;
alter table public.secretos_unidad         enable row level security;
alter table public.historial_estado_unidad enable row level security;
alter table public.reservas_inventario     enable row level security;

create policy clientes_admin_all on public.clientes
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy cuentas_admin_all on public.cuentas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy cuenta_modalidades_admin_all on public.cuenta_modalidades
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy credenciales_admin_all on public.credenciales_cuenta
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy unidades_admin_all on public.unidades_inventario
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy secretos_unidad_admin_all on public.secretos_unidad
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy historial_unidad_admin_all on public.historial_estado_unidad
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy reservas_admin_all on public.reservas_inventario
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Índices de apoyo para consultas frecuentes.
create index idx_cuentas_producto on public.cuentas (producto_plataforma_id);
create index idx_unidades_cuenta on public.unidades_inventario (cuenta_id);
create index idx_reservas_cuenta on public.reservas_inventario (cuenta_id);
create index idx_cred_fingerprint on public.credenciales_cuenta (login_fingerprint);
