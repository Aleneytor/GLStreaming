-- ============================================================================
-- 0037 — Tarjetas propias de proveedor cifradas
-- ----------------------------------------------------------------------------
-- El Excel puede identificar como proveedor una tarjeta propia del negocio.
-- La etiqueta visible conserva únicamente los últimos cuatro dígitos. El PAN y
-- su vencimiento se cifran en la aplicación con AES-256-GCM y solo un admin los
-- revela temporalmente mediante una acción auditada. El CVV nunca se persiste.
-- ============================================================================

create table public.tarjetas_proveedor_cifradas (
  proveedor_id      uuid primary key references public.proveedores (id) on delete cascade,
  datos_cifrados    text not null,
  version_clave     integer not null default 1,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.tarjetas_proveedor_cifradas is
  'PAN y vencimiento cifrados de una tarjeta propia usada como proveedor. '
  'Nunca contiene CVV; el revelado es admin-only, temporal y auditado.';

alter table public.tarjetas_proveedor_cifradas enable row level security;

create policy tarjetas_proveedor_admin_all on public.tarjetas_proveedor_cifradas
  for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

revoke all on table public.tarjetas_proveedor_cifradas from anon;
grant select, insert, update, delete on table public.tarjetas_proveedor_cifradas
  to authenticated;
