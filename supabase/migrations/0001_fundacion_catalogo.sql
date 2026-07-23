-- ============================================================================
-- 0001 — Fundación y catálogo
-- ----------------------------------------------------------------------------
-- Primera capa del esquema de GL Streaming. Cubre identidad interna y el
-- catálogo comercial: usuarios, vendedores, plataformas, modalidades,
-- productos, mecanismos de entrega y proveedores.
--
-- Referencias de dominio: docs/02-modelo-dominio.md (diccionario de entidades),
-- docs/01-alcance-y-reglas.md (permisos), docs/03-arquitectura-y-seguridad.md.
--
-- Convenciones del proyecto:
--   * identificadores: uuid (gen_random_uuid()).
--   * fechas/hora: timestamptz, zona de negocio America/Caracas se aplica en
--     la capa de aplicación; aquí se guarda el instante absoluto.
--   * PIN, teléfonos y credenciales: SIEMPRE text (preservar '+' y ceros).
--   * importes: numeric (nunca float). (Aparecen en capas posteriores.)
--   * vocabularios controlados: CHECK constraints (fáciles de evolucionar).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Funciones auxiliares
-- ----------------------------------------------------------------------------

-- Refresca updated_at en cada UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Nota: public.es_admin() se define más abajo, DESPUÉS de crear la tabla
-- public.usuarios. PostgreSQL valida el cuerpo de una función `language sql`
-- al crearla, así que no puede referenciar una tabla que todavía no existe.

-- ----------------------------------------------------------------------------
-- usuarios — perfil interno 1:1 con auth.users
-- ----------------------------------------------------------------------------
create table public.usuarios (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null,
  rol         text not null default 'revendedor'
                check (rol in ('admin', 'revendedor')),
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.usuarios is
  'Perfil interno vinculado 1:1 con auth.users. El usuario no cambia su propio rol.';

create trigger trg_usuarios_updated_at
  before update on public.usuarios
  for each row execute function public.set_updated_at();

-- ¿El usuario autenticado actual es administrador y está activo?
-- SECURITY DEFINER: evita recursión de RLS al consultar public.usuarios
-- (la función se salta RLS, de modo que las políticas pueden invocarla).
-- Debe declararse después de crear public.usuarios (ver nota arriba).
create or replace function public.es_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.rol = 'admin'
      and u.activo
  );
$$;

revoke execute on function public.es_admin() from public;
grant execute on function public.es_admin() to authenticated;

-- Alta automática de perfil al crear un usuario de auth.
-- El primer administrador se promueve manualmente (ver docs/09-fase-1-setup.md).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuarios (id, nombre, rol, activo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    'revendedor',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- vendedores — identidad comercial para ventas históricas/reportes
-- ----------------------------------------------------------------------------
create table public.vendedores (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid unique references public.usuarios (id) on delete set null,
  nombre      text not null,
  alias       text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table public.vendedores is
  'Vendedor real. Un nombre del Excel "Vendió" solo entra aquí tras clasificarse '
  'como vendedor real; compradores/intermediarios van a contactos_comerciales.';
comment on column public.vendedores.usuario_id is
  'Puede existir sin login hasta vincularse a un usuario autenticado (AUTH-01).';

-- ----------------------------------------------------------------------------
-- plataformas — catálogo (Netflix, HBO, Disney+, ... , Spotify)
-- ----------------------------------------------------------------------------
create table public.plataformas (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  slug       text not null unique,
  icono_url  text,
  activa     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- mecanismos_entrega — cómo se habilita el acceso de una combinación producto/modalidad
-- ----------------------------------------------------------------------------
create table public.mecanismos_entrega (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,
  nombre      text not null,
  tipo        text not null
                check (tipo in (
                  'credenciales_cuenta', 'credenciales_y_unidad', 'credenciales_cliente',
                  'identidad_y_cobertura', 'invitacion', 'asiento', 'dispositivo',
                  'grupo_familiar', 'panel_educativo', 'otro'
                )),
  -- Política de revocación por defecto de este mecanismo.
  politica_revocacion_acceso text
                check (politica_revocacion_acceso in (
                  'cierre_sesion_perfil', 'cierre_sesion_dispositivo',
                  'rotacion_credenciales', 'salida_grupo_familiar', 'otro'
                )),
  descripcion text,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- modalidades — cómo se comercializa un inventario/servicio
-- ----------------------------------------------------------------------------
create table public.modalidades (
  id             uuid primary key default gen_random_uuid(),
  plataforma_id  uuid not null references public.plataformas (id) on delete restrict,
  nombre         text not null,
  tipo_modalidad text not null
                   check (tipo_modalidad in (
                     'perfil', 'cuenta_completa', 'extra', 'servicio_individual',
                     'dispositivo', 'miembro_familiar', 'uso_principal', 'asiento'
                   )),
  alcance_asignacion text not null
                   check (alcance_asignacion in ('unidad', 'cuenta', 'principal')),
  periodicidad_predeterminada text not null default 'mes_calendario',
  activa         boolean not null default true,
  created_at     timestamptz not null default now()
);
comment on column public.modalidades.tipo_modalidad is
  'uso_principal = venta excepcional de la identidad madre Spotify (alcance principal).';

-- ----------------------------------------------------------------------------
-- productos_plataforma — qué clase de inventario se compra/administra
-- ----------------------------------------------------------------------------
create table public.productos_plataforma (
  id            uuid primary key default gen_random_uuid(),
  plataforma_id uuid not null references public.plataformas (id) on delete restrict,
  nombre        text not null,
  codigo        text not null,
  tipo_inventario text not null
                  check (tipo_inventario in ('cuenta_con_unidades', 'recurso_indivisible')),
  tipo_unidad_fisica text
                  check (tipo_unidad_fisica in
                         ('perfil', 'extra', 'dispositivo', 'miembro_familiar', 'asiento')),
  regla_capacidad text not null
                  check (regla_capacidad in ('fija', 'rango', 'variable')),
  capacidad_fija  integer check (capacidad_fija is null or capacidad_fija > 0),
  capacidad_min   integer check (capacidad_min is null or capacidad_min > 0),
  capacidad_max   integer check (capacidad_max is null or capacidad_max > 0),
  capacidad_vendible_predeterminada integer
                  check (capacidad_vendible_predeterminada is null
                         or capacidad_vendible_predeterminada > 0),
  titularidad_predeterminada text not null default 'negocio'
                  check (titularidad_predeterminada in ('negocio', 'cliente', 'proveedor')),
  reutilizable_predeterminado boolean not null default true,
  estado_comercial text not null default 'abierto'
                  check (estado_comercial in ('abierto', 'solo_cartera', 'cerrado')),
  permite_renovaciones boolean not null default true,
  descripcion_operativa text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  archived_at   timestamptz,
  unique (plataforma_id, codigo),
  -- Coherencia mínima de la regla de capacidad.
  constraint capacidad_fija_coherente check (
    regla_capacidad <> 'fija' or capacidad_fija is not null
  ),
  constraint capacidad_rango_coherente check (
    regla_capacidad <> 'rango'
    or (capacidad_min is not null and capacidad_max is not null
        and capacidad_max >= capacidad_min)
  )
);
comment on column public.productos_plataforma.capacidad_vendible_predeterminada is
  'Puede ser menor que la física (por ejemplo CapCut: 3 físicos, 2 vendibles).';

-- ----------------------------------------------------------------------------
-- producto_modalidades — qué modalidades permite cada producto
-- ----------------------------------------------------------------------------
create table public.producto_modalidades (
  id                    uuid primary key default gen_random_uuid(),
  producto_plataforma_id uuid not null
                          references public.productos_plataforma (id) on delete cascade,
  modalidad_id          uuid not null references public.modalidades (id) on delete restrict,
  mecanismo_entrega_id  uuid references public.mecanismos_entrega (id) on delete restrict,
  activa                boolean not null default true,
  created_at            timestamptz not null default now(),
  archived_at           timestamptz,
  unique (producto_plataforma_id, modalidad_id)
);
comment on column public.producto_modalidades.mecanismo_entrega_id is
  'Opcional durante la documentación, pero debe estar definido antes de activar '
  'la combinación para vender (se valida en la capa de aplicación/servidor).';

-- ----------------------------------------------------------------------------
-- proveedores — quién suministra/gestiona un servicio ('Yo' = negocio)
-- ----------------------------------------------------------------------------
create table public.proveedores (
  id                  uuid primary key default gen_random_uuid(),
  tipo                text not null default 'tercero'
                        check (tipo in ('propio', 'tercero')),
  nombre_o_alias      text,
  telefono_original   text,   -- text: preserva '+' y ceros iniciales
  telefono_normalizado text,
  notas               text,
  activo              boolean not null default true,
  created_at          timestamptz not null default now(),
  -- Un proveedor tercero debe tener al menos alias o teléfono.
  constraint proveedor_identificable check (
    tipo = 'propio' or nombre_o_alias is not null or telefono_original is not null
  )
);
comment on table public.proveedores is
  'No almacena datos completos de tarjeta. "Yo" es el registro canónico propio.';

-- ============================================================================
-- Row Level Security
-- ----------------------------------------------------------------------------
-- Regla general:
--   * Catálogo (plataformas, modalidades, productos, producto_modalidades,
--     mecanismos_entrega): lectura para cualquier usuario autenticado
--     (el revendedor necesita ver el catálogo para solicitar stock);
--     escritura solo admin.
--   * proveedores: solo admin (el revendedor no ve contacto del proveedor).
--   * usuarios: cada quien su fila; el admin ve/gestiona todas.
--   * vendedores: admin gestiona; el revendedor ve su propio vínculo.
-- ============================================================================

alter table public.usuarios              enable row level security;
alter table public.vendedores            enable row level security;
alter table public.plataformas           enable row level security;
alter table public.mecanismos_entrega    enable row level security;
alter table public.modalidades           enable row level security;
alter table public.productos_plataforma  enable row level security;
alter table public.producto_modalidades  enable row level security;
alter table public.proveedores           enable row level security;

-- usuarios
create policy usuarios_select on public.usuarios
  for select to authenticated
  using (id = auth.uid() or public.es_admin());
create policy usuarios_admin_insert on public.usuarios
  for insert to authenticated
  with check (public.es_admin());
create policy usuarios_admin_update on public.usuarios
  for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- vendedores
create policy vendedores_select on public.vendedores
  for select to authenticated
  using (public.es_admin() or usuario_id = auth.uid());
create policy vendedores_admin_write on public.vendedores
  for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Catálogo: lectura autenticada, escritura admin.
-- (Se define una política de lectura y una de escritura por tabla.)
create policy plataformas_select on public.plataformas
  for select to authenticated using (true);
create policy plataformas_admin_write on public.plataformas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy mecanismos_select on public.mecanismos_entrega
  for select to authenticated using (true);
create policy mecanismos_admin_write on public.mecanismos_entrega
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy modalidades_select on public.modalidades
  for select to authenticated using (true);
create policy modalidades_admin_write on public.modalidades
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy productos_select on public.productos_plataforma
  for select to authenticated using (true);
create policy productos_admin_write on public.productos_plataforma
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy producto_modalidades_select on public.producto_modalidades
  for select to authenticated using (true);
create policy producto_modalidades_admin_write on public.producto_modalidades
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- proveedores: solo admin (lectura y escritura).
create policy proveedores_admin_all on public.proveedores
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
