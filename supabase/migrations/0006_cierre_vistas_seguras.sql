-- ============================================================================
-- 0006 — Cierre de Fase 1: verificaciones, auditoría y vista del revendedor
-- ----------------------------------------------------------------------------
-- Última capa de la fundación. Añade:
--   verificaciones_hogar_netflix = evento "No perteneces a este hogar" (DEC-95).
--   eventos_auditoria            = bitácora de acciones sensibles.
--   v_mis_ventas_revendedor      = única ventana del revendedor: SUS ventas.
--
-- Modelo de revendedor (aclarado por el usuario el 23/07/2026):
--   * El revendedor NO ve stock disponible: el negocio no publica inventario;
--     los revendedores piden stock por fuera de la app. Por eso no existe vista
--     de disponibilidad para revendedor ni tabla de solicitudes de stock.
--   * El revendedor SÍ ve las credenciales de acceso de SUS ventas activas
--     (correo, contraseña, nombre de perfil, PIN) — el mismo paquete que se le
--     entrega al cliente final (resuelve SEC-02 -> DEC-97). Esa entrega la hace
--     una acción de servidor que verifica la propiedad de la venta y descifra
--     los secretos en memoria; NO se exponen las tablas de credenciales por RLS.
--   * El admin sí ve disponibilidad, pero desde su propio panel (consulta sobre
--     las tablas base, a las que llega por RLS de admin); no se expone al
--     revendedor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- verificaciones_hogar_netflix — evento de verificación de hogar (DEC-95)
-- ----------------------------------------------------------------------------
create table public.verificaciones_hogar_netflix (
  id                 uuid primary key default gen_random_uuid(),
  unidad_id          uuid not null references public.unidades_inventario (id) on delete cascade,
  asignacion_id      uuid not null references public.asignaciones_inventario (id) on delete cascade,
  disparada_at       timestamptz not null default now(),
  registrada_por_id  uuid references public.usuarios (id) on delete set null,
  codigo_solicitado_at timestamptz,
  resultado          text not null default 'resuelta'
                       check (resultado in ('resuelta', 'requiere_traslado')),
  nota_no_sensible   text,
  created_at         timestamptz not null default now()
);
comment on table public.verificaciones_hogar_netflix is
  'Solo aplica a perfiles de una venta cuenta_completa del producto estándar. '
  'Una fila por evento (nunca se sobrescribe); el conteo por perfil es '
  'acumulativo y no se reinicia con la renovación (DEC-95).';

-- Ya no hay tabla de solicitudes de stock: se retira la columna que quedó
-- reservada en 0002 para su futura FK.
alter table public.reservas_inventario drop column if exists solicitud_stock_id;

-- ----------------------------------------------------------------------------
-- eventos_auditoria — bitácora de acciones sensibles (nunca valores secretos)
-- ----------------------------------------------------------------------------
create table public.eventos_auditoria (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.usuarios (id) on delete set null,
  accion     text not null,
  entidad    text not null,
  entidad_id text,
  resultado  text,
  metadata   jsonb,
  ocurrio_at timestamptz not null default now()
);
comment on table public.eventos_auditoria is
  'Registra actor, acción, entidad y metadatos mínimos. NUNCA guarda secretos '
  'en claro (contraseñas, PIN, correos completos).';

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.verificaciones_hogar_netflix enable row level security;
alter table public.eventos_auditoria            enable row level security;

create policy verif_hogar_admin_all on public.verificaciones_hogar_netflix
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy auditoria_admin_all on public.eventos_auditoria
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

create index idx_verif_unidad on public.verificaciones_hogar_netflix (unidad_id);
create index idx_auditoria_entidad on public.eventos_auditoria (entidad, entidad_id);

-- ============================================================================
-- Vista del revendedor — su única ventana
-- ----------------------------------------------------------------------------
-- Ventas propias del revendedor, filtradas por su identidad (auth.uid()). Es
-- una vista propiedad de postgres (gateway): expone las ventas propias sin dar
-- acceso directo a las tablas base. Las CREDENCIALES de cada venta NO viajan en
-- esta vista (están cifradas); se entregan por una acción de servidor que
-- verifica la propiedad y descifra en memoria.
-- ============================================================================
create view public.v_mis_ventas_revendedor as
select
  s.id           as suscripcion_id,
  s.estado,
  s.recontactar_el,
  cl.nombre      as cliente,
  cl.whatsapp_normalizado as cliente_whatsapp,
  pl.nombre      as plataforma,
  pp.nombre      as producto,
  m.nombre       as modalidad,
  a.cuenta_id,
  a.unidad_id
from public.suscripciones s
join public.vendedores v            on v.id = s.vendedor_origen_id
join public.clientes cl             on cl.id = s.cliente_id
join public.productos_plataforma pp on pp.id = s.producto_plataforma_id
join public.plataformas pl          on pl.id = pp.plataforma_id
join public.modalidades m           on m.id = s.modalidad_id
left join public.asignaciones_inventario a
       on a.suscripcion_id = s.id and a.fin is null
where v.usuario_id = auth.uid();

comment on view public.v_mis_ventas_revendedor is
  'Única ventana del revendedor: sus propias ventas (filtro por auth.uid()) con '
  'contacto del cliente. Las credenciales de acceso se entregan aparte, por una '
  'acción de servidor que verifica la propiedad y descifra en memoria (DEC-97). '
  'El revendedor NO ve stock disponible ni datos de otros vendedores.';

grant select on public.v_mis_ventas_revendedor to authenticated;

-- ============================================================================
-- Privilegios de tabla
-- ----------------------------------------------------------------------------
-- Modelo de Supabase: el rol `authenticated` (todo usuario con sesión, admin o
-- revendedor) recibe privilegios de tabla, y RLS decide QUÉ FILAS ve cada quien.
-- Sin este grant, RLS ni siquiera se consulta (da "permiso denegado").
-- El rol `anon` (sin sesión) NO recibe privilegios: queda bloqueado a nivel de
-- tabla, una capa extra antes incluso de RLS.
-- ============================================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
