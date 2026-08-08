begin;

create or replace function public.editar_gasto_personal(
  p_gasto_id uuid,
  p_fecha_gasto date,
  p_concepto text,
  p_descripcion text,
  p_nota text,
  p_moneda_original text,
  p_monto_original numeric,
  p_tasa_tipo text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gasto public.gastos_personales%rowtype;
  v_tasa public.tasas_cambio;
  v_monto_usd numeric(12,2);
  v_monto_ves numeric(14,2);
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  if p_gasto_id is null then
    raise exception 'Falta el gasto.';
  end if;

  if p_fecha_gasto is null then
    raise exception 'Falta la fecha del gasto.';
  end if;

  if coalesce(btrim(p_concepto), '') = '' then
    raise exception 'Falta el concepto.';
  end if;

  if p_moneda_original not in ('usd', 'ves') then
    raise exception 'Moneda inválida.';
  end if;

  if p_tasa_tipo not in ('bcv', 'paralela') then
    raise exception 'Tipo de tasa inválido.';
  end if;

  if p_monto_original is null or p_monto_original <= 0 then
    raise exception 'El monto debe ser mayor que cero.';
  end if;

  select *
    into v_gasto
  from public.gastos_personales
  where id = p_gasto_id;

  if not found then
    raise exception 'No existe el gasto personal indicado.';
  end if;

  select *
    into v_tasa
  from public.tasa_utilizable(p_tasa_tipo);

  if p_moneda_original = 'usd' then
    v_monto_usd := round(p_monto_original, 2);
    v_monto_ves := round(p_monto_original * v_tasa.bs_por_usd, 2);
  else
    v_monto_ves := round(p_monto_original, 2);
    v_monto_usd := round(p_monto_original / nullif(v_tasa.bs_por_usd, 0), 2);
  end if;

  update public.gastos_personales
  set
    fecha_gasto = p_fecha_gasto,
    concepto = btrim(p_concepto),
    descripcion = nullif(btrim(coalesce(p_descripcion, '')), ''),
    nota = nullif(btrim(coalesce(p_nota, '')), ''),
    moneda_original = p_moneda_original,
    monto_original = round(p_monto_original, 2),
    tasa_tipo = p_tasa_tipo,
    tasa_id = v_tasa.id,
    tasa_bs_por_usd_snapshot = v_tasa.bs_por_usd,
    monto_usd = v_monto_usd,
    monto_ves = v_monto_ves
  where id = p_gasto_id;

  return p_gasto_id;
end;
$$;

grant execute on function public.editar_gasto_personal(
  uuid, date, text, text, text, text, numeric, text
) to authenticated;

create or replace function public.eliminar_gasto_personal(
  p_gasto_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  if p_gasto_id is null then
    raise exception 'Falta el gasto.';
  end if;

  delete from public.gastos_personales
  where id = p_gasto_id;

  if not found then
    raise exception 'No existe el gasto personal indicado.';
  end if;
end;
$$;

grant execute on function public.eliminar_gasto_personal(uuid) to authenticated;

commit;
