-- ============================================================================
-- 0042 · Corrección auditable de un cobro ya registrado
--
-- Un error de carga no debe obligar a borrar la venta ni a modificar filas
-- históricas. La corrección agrega un reverso del cobro equivocado y un cobro
-- sustituto dentro de la misma transacción, ambos en la fecha original. Así la
-- Caja conserva el ingreso neto correcto en el día en que realmente ocurrió.
-- ============================================================================

create or replace function public.corregir_cobro_cliente(
  p_periodo_id       uuid,
  p_nuevo_monto_usd numeric,
  p_motivo           text default 'Corrección administrativa'
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_periodo       public.periodos_servicio;
  v_pago_original public.pagos_cliente;
  v_tasa_efectiva numeric;
  v_nuevo_ves     numeric;
  v_reverso_id    uuid;
  v_nuevo_pago_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede corregir cobros.' using errcode = '42501';
  end if;
  if p_nuevo_monto_usd is null or p_nuevo_monto_usd <= 0 then
    raise exception 'El nuevo ingreso debe ser mayor que cero.';
  end if;

  select * into v_periodo
  from public.periodos_servicio
  where id = p_periodo_id
  for update;

  if not found then
    raise exception 'Período no encontrado.';
  end if;
  if v_periodo.precio_comercial_usd is null or v_periodo.precio_comercial_usd <= 0 then
    raise exception 'El período no tiene un ingreso cobrado que pueda corregirse.';
  end if;
  if abs(round(p_nuevo_monto_usd, 2) - v_periodo.precio_comercial_usd) < 0.005 then
    return jsonb_build_object(
      'sin_cambios', true,
      'monto_usd', v_periodo.precio_comercial_usd,
      'monto_ves', v_periodo.monto_ves_esperado
    );
  end if;

  select pc.* into v_pago_original
  from public.pagos_cliente pc
  where pc.periodo_servicio_id = p_periodo_id
    and pc.tipo = 'cobro'
    and pc.estado = 'confirmado'
    and not exists (
      select 1
      from public.pagos_cliente rv
      where rv.pago_original_id = pc.id
        and rv.tipo = 'reverso'
        and rv.estado = 'confirmado'
    )
  order by pc.ocurrido_at desc, pc.id desc
  limit 1
  for update of pc;

  if not found then
    raise exception 'No hay un cobro confirmado vigente para corregir.';
  end if;

  -- Conserva exactamente la base económica del cobro original, incluso si la
  -- configuración BCV/paralela del vendedor cambió después de la importación.
  v_tasa_efectiva := v_pago_original.monto_ves / v_periodo.precio_comercial_usd;
  v_nuevo_ves := round(p_nuevo_monto_usd * v_tasa_efectiva, 2);

  insert into public.pagos_cliente (
    periodo_servicio_id, tipo, monto_ves, monto_ves_esperado_snapshot,
    tasa_bcv_id, tasa_paralela_id, ocurrido_at, estado, pago_original_id,
    referencia, created_by
  ) values (
    p_periodo_id, 'reverso', v_pago_original.monto_ves,
    v_pago_original.monto_ves_esperado_snapshot,
    v_pago_original.tasa_bcv_id, v_pago_original.tasa_paralela_id,
    v_pago_original.ocurrido_at, 'confirmado', v_pago_original.id,
    nullif(btrim(coalesce(p_motivo, '')), ''), auth.uid()
  )
  returning id into v_reverso_id;

  insert into public.pagos_cliente (
    periodo_servicio_id, tipo, monto_ves, monto_ves_esperado_snapshot,
    tasa_bcv_id, tasa_paralela_id, ocurrido_at, estado, referencia, created_by
  ) values (
    p_periodo_id, 'cobro', v_nuevo_ves, v_nuevo_ves,
    v_pago_original.tasa_bcv_id, v_pago_original.tasa_paralela_id,
    v_pago_original.ocurrido_at, 'confirmado',
    'Corrección de cobro: ' || coalesce(nullif(btrim(p_motivo), ''), 'ajuste administrativo'),
    auth.uid()
  )
  returning id into v_nuevo_pago_id;

  update public.periodos_servicio
  set precio_comercial_usd = round(p_nuevo_monto_usd, 2),
      monto_ves_esperado = v_nuevo_ves,
      estado_datos_financieros = 'completo'
  where id = p_periodo_id;

  insert into public.eventos_auditoria (
    actor_id, accion, entidad, entidad_id, resultado, metadata
  ) values (
    auth.uid(), 'corregir_cobro_cliente', 'periodos_servicio',
    p_periodo_id::text, 'ok',
    jsonb_build_object(
      'pago_original_id', v_pago_original.id,
      'reverso_id', v_reverso_id,
      'pago_sustituto_id', v_nuevo_pago_id,
      'monto_usd_anterior', v_periodo.precio_comercial_usd,
      'monto_usd_nuevo', round(p_nuevo_monto_usd, 2),
      'monto_ves_anterior', v_pago_original.monto_ves,
      'monto_ves_nuevo', v_nuevo_ves,
      'tasa_efectiva', v_tasa_efectiva,
      'motivo', p_motivo
    )
  );

  return jsonb_build_object(
    'reverso_id', v_reverso_id,
    'pago_id', v_nuevo_pago_id,
    'monto_usd', round(p_nuevo_monto_usd, 2),
    'monto_ves', v_nuevo_ves
  );
end;
$$;

revoke execute on function public.corregir_cobro_cliente(uuid, numeric, text) from public;
grant execute on function public.corregir_cobro_cliente(uuid, numeric, text) to authenticated;

comment on function public.corregir_cobro_cliente is
  'Corrige un cobro sin mutar el historial: inserta reverso y sustituto en la '
  'fecha original, conserva tasas y actualiza el valor comercial del período.';
