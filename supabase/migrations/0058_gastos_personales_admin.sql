-- ============================================================================
-- 0058 · Gastos personales del administrador (aislados del negocio)
-- ----------------------------------------------------------------------------
-- Este módulo sirve como bloc privado dentro de GL Streaming para que el admin
-- anote gastos personales usando las tasas existentes (BCV o paralela) y vea
-- su equivalencia en USD/Bs. NO participa en Caja, Egresos, Cobros, Cierres ni
-- ningún cálculo financiero del negocio.
-- ============================================================================

create table public.gastos_personales (
  id uuid primary key default gen_random_uuid(),
  fecha_gasto date not null,
  concepto text not null,
  descripcion text,
  nota text,
  moneda_original text not null check (moneda_original in ('usd', 'ves')),
  monto_original numeric(12,2) not null check (monto_original > 0),
  monto_usd numeric(12,2) not null check (monto_usd > 0),
  monto_ves numeric(14,2) not null check (monto_ves >= 0),
  tasa_tipo text not null check (tasa_tipo in ('bcv', 'paralela')),
  tasa_id uuid references public.tasas_cambio (id) on delete restrict,
  tasa_bs_por_usd_snapshot numeric(14,6) not null check (tasa_bs_por_usd_snapshot > 0),
  created_by uuid not null references public.usuarios (id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table public.gastos_personales is
  'Notas privadas de gastos personales del administrador. No afectan ninguna '
  'métrica ni flujo financiero del negocio.';

alter table public.gastos_personales enable row level security;

create policy gastos_personales_admin_all on public.gastos_personales
  for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

grant select, insert, update on public.gastos_personales to authenticated;

create or replace function public.registrar_gasto_personal(
  p_fecha_gasto date,
  p_concepto text,
  p_descripcion text default null,
  p_nota text default null,
  p_moneda_original text default 'usd',
  p_monto_original numeric default null,
  p_tasa_tipo text default 'bcv'
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_tasa public.tasas_cambio;
  v_monto_original numeric(12,2);
  v_monto_usd numeric(12,2);
  v_monto_ves numeric(14,2);
  v_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede registrar gastos personales.' using errcode = '42501';
  end if;
  if p_moneda_original not in ('usd', 'ves') then
    raise exception 'La moneda original debe ser usd o ves.';
  end if;
  if p_tasa_tipo not in ('bcv', 'paralela') then
    raise exception 'La tasa debe ser bcv o paralela.';
  end if;

  v_monto_original := round(p_monto_original::numeric, 2);
  if v_monto_original is null or v_monto_original <= 0 then
    raise exception 'El monto debe ser mayor que cero.';
  end if;

  select *
  into v_tasa
  from public.tasa_utilizable(p_tasa_tipo);

  if not found then
    raise exception 'No hay una tasa % confirmada en las últimas 24 h.', upper(p_tasa_tipo);
  end if;

  if p_moneda_original = 'usd' then
    v_monto_usd := v_monto_original;
    v_monto_ves := round(v_monto_original * v_tasa.bs_por_usd, 2);
  else
    v_monto_ves := v_monto_original;
    v_monto_usd := round(v_monto_original / v_tasa.bs_por_usd, 2);
  end if;

  insert into public.gastos_personales (
    fecha_gasto, concepto, descripcion, nota,
    moneda_original, monto_original, monto_usd, monto_ves,
    tasa_tipo, tasa_id, tasa_bs_por_usd_snapshot, created_by
  ) values (
    p_fecha_gasto,
    nullif(btrim(coalesce(p_concepto, '')), ''),
    nullif(btrim(coalesce(p_descripcion, '')), ''),
    nullif(btrim(coalesce(p_nota, '')), ''),
    p_moneda_original,
    v_monto_original,
    v_monto_usd,
    v_monto_ves,
    p_tasa_tipo,
    v_tasa.id,
    v_tasa.bs_por_usd,
    auth.uid()
  )
  returning id into v_id;

  if v_id is null then
    raise exception 'No se pudo registrar el gasto personal.';
  end if;

  return v_id;
end;
$$;

create or replace function public.archivar_gasto_personal(
  p_gasto_id uuid
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede archivar gastos personales.' using errcode = '42501';
  end if;

  update public.gastos_personales
  set archived_at = now()
  where id = p_gasto_id
    and archived_at is null;

  if not found then
    raise exception 'Gasto personal no encontrado.';
  end if;
end;
$$;

grant execute on function public.registrar_gasto_personal(date, text, text, text, text, numeric, text)
  to authenticated;
grant execute on function public.archivar_gasto_personal(uuid)
  to authenticated;
