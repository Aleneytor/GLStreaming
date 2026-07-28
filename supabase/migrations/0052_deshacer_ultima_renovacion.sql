-- ============================================================================
-- 0052 — Deshacer la última renovación accidental
-- ----------------------------------------------------------------------------
-- Permite revertir una renovación creada por error sin cancelar la suscripción.
--
-- Reglas:
--   * Solo un administrador puede hacerlo.
--   * Solo se puede deshacer el ÚLTIMO período vigente de la suscripción.
--   * Ese período debe ser `renovacion` o `renovacion_tardia`.
--   * Borra el período y sus cobros/reversos asociados.
--   * Si la renovación reactivó una suscripción pausada, la devuelve a `pausada`.
--   * Si la renovación cambió el vendedor vigente de la suscripción, restaura
--     el vendedor del período anterior.
--   * Deja auditoría con el snapshot mínimo necesario.
-- ============================================================================

create or replace function public.deshacer_ultima_renovacion(
  p_suscripcion_id uuid,
  p_motivo text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_suscripcion public.suscripciones;
  v_periodo public.periodos_servicio;
  v_periodo_anterior public.periodos_servicio;
  v_ultimo_historial public.historial_estado_suscripcion;
  v_pagos_ids uuid[];
  v_reversos_ids uuid[];
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede deshacer una renovación.' using errcode = '42501';
  end if;

  select *
  into v_suscripcion
  from public.suscripciones
  where id = p_suscripcion_id
  for update;

  if not found then
    raise exception 'Suscripción no encontrada.';
  end if;

  select *
  into v_periodo
  from public.periodos_servicio
  where suscripcion_id = p_suscripcion_id
    and estado = 'vigente'
  order by fecha_renovacion desc, created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'La suscripción no tiene períodos vigentes.';
  end if;

  if v_periodo.tipo_operacion not in ('renovacion', 'renovacion_tardia') then
    raise exception 'La suscripción no tiene una renovación reciente para deshacer.';
  end if;

  select *
  into v_periodo_anterior
  from public.periodos_servicio
  where suscripcion_id = p_suscripcion_id
    and estado = 'vigente'
    and id <> v_periodo.id
  order by fecha_renovacion desc, created_at desc
  limit 1;

  select *
  into v_ultimo_historial
  from public.historial_estado_suscripcion
  where suscripcion_id = p_suscripcion_id
  order by ocurrio_at desc
  limit 1;

  select coalesce(array_agg(id order by ocurrido_at asc), '{}'::uuid[])
  into v_reversos_ids
  from public.pagos_cliente
  where periodo_servicio_id = v_periodo.id
    and tipo = 'reverso';

  select coalesce(array_agg(id order by ocurrido_at asc), '{}'::uuid[])
  into v_pagos_ids
  from public.pagos_cliente
  where periodo_servicio_id = v_periodo.id
    and tipo = 'cobro';

  delete from public.pagos_cliente
  where periodo_servicio_id = v_periodo.id
    and tipo = 'reverso';

  delete from public.pagos_cliente
  where periodo_servicio_id = v_periodo.id;

  delete from public.periodos_servicio
  where id = v_periodo.id;

  if v_suscripcion.estado = 'activa'
     and exists (
       select 1
       from public.historial_estado_suscripcion h
       where h.suscripcion_id = p_suscripcion_id
         and h.estado_anterior = 'pausada'
         and h.estado_nuevo = 'activa'
         and h.motivo = 'renovacion'
         and h.ocurrio_at >= v_periodo.created_at - interval '5 minutes'
     ) then
    update public.suscripciones
    set estado = 'pausada'
    where id = p_suscripcion_id;

    insert into public.historial_estado_suscripcion (
      suscripcion_id, estado_anterior, estado_nuevo, motivo, actor_id
    ) values (
      p_suscripcion_id, 'activa', 'pausada', 'deshacer_ultima_renovacion', auth.uid()
    );
  end if;

  if v_periodo_anterior.id is not null
     and v_suscripcion.vendedor_origen_id is distinct from v_periodo_anterior.vendedor_id then
    update public.suscripciones
    set vendedor_origen_id = v_periodo_anterior.vendedor_id
    where id = p_suscripcion_id;
  end if;

  insert into public.eventos_auditoria (
    actor_id, accion, entidad, entidad_id, resultado, metadata
  ) values (
    auth.uid(),
    'deshacer_ultima_renovacion',
    'periodos_servicio',
    v_periodo.id::text,
    'ok',
    jsonb_build_object(
      'suscripcion_id', p_suscripcion_id,
      'motivo', nullif(btrim(coalesce(p_motivo, '')), ''),
      'periodo_eliminado', jsonb_build_object(
        'id', v_periodo.id,
        'tipo_operacion', v_periodo.tipo_operacion,
        'inicio', v_periodo.inicio,
        'fecha_renovacion', v_periodo.fecha_renovacion,
        'cantidad_periodos', v_periodo.cantidad_periodos,
        'precio_comercial_usd', v_periodo.precio_comercial_usd,
        'vendedor_id', v_periodo.vendedor_id
      ),
      'pagos_eliminados', coalesce(to_jsonb(v_pagos_ids), '[]'::jsonb),
      'reversos_eliminados', coalesce(to_jsonb(v_reversos_ids), '[]'::jsonb),
      'vendedor_restaurado_a', v_periodo_anterior.vendedor_id
    )
  );

  return v_periodo.id;
end;
$$;

comment on function public.deshacer_ultima_renovacion(uuid, text) is
  'Deshace la última renovación vigente de una suscripción, borrando ese período '
  'y sus cobros/reversos asociados. Restaura pausa y vendedor previo cuando aplica.';

revoke execute on function public.deshacer_ultima_renovacion(uuid, text) from public;
grant execute on function public.deshacer_ultima_renovacion(uuid, text) to authenticated;
