-- ============================================================================
-- 0048 — Renovar y cobrar corrigiendo el vendedor en la misma transacción
-- ----------------------------------------------------------------------------
-- Operaciones tenía un modal de renovación que ocultaba el vendedor y mostraba
-- siempre la equivalencia BCV. Este parámetro opcional permite confirmar o
-- corregir el vendedor al renovar sin dejar un cambio parcial si el cobro falla.
-- La base efectiva continúa perteneciendo al vendedor: directa/intermediario =
-- BCV y revendedor marcado = paralela.
-- ============================================================================

drop function if exists public.renovar_y_cobrar(
  uuid, date, integer, numeric, boolean, text, numeric
);

create function public.renovar_y_cobrar(
  p_suscripcion_id    uuid,
  p_inicio            date default current_date,
  p_meses             integer default 1,
  p_monto_ves         numeric default null,
  p_tardia            boolean default false,
  p_referencia        text default null,
  p_monto_usd         numeric default null,
  p_vendedor_id       uuid default null,
  p_actualizar_vendedor boolean default false
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_periodo_id uuid;
  v_vendedor_anterior uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede renovar.' using errcode = '42501';
  end if;

  if p_actualizar_vendedor then
    if p_vendedor_id is not null and not exists (
      select 1
      from public.vendedores
      where id = p_vendedor_id and activo
    ) then
      raise exception 'El vendedor seleccionado no existe o está inactivo.';
    end if;

    select vendedor_origen_id
    into v_vendedor_anterior
    from public.suscripciones
    where id = p_suscripcion_id
    for update;

    if not found then
      raise exception 'Suscripción no encontrada.';
    end if;

    update public.suscripciones
    set vendedor_origen_id = p_vendedor_id
    where id = p_suscripcion_id;

    if v_vendedor_anterior is distinct from p_vendedor_id then
      insert into public.eventos_auditoria (
        actor_id, accion, entidad, entidad_id, resultado, metadata
      ) values (
        auth.uid(), 'cambiar_vendedor_renovacion', 'suscripciones',
        p_suscripcion_id::text, 'ok',
        jsonb_build_object(
          'vendedor_anterior_id', v_vendedor_anterior,
          'vendedor_nuevo_id', p_vendedor_id
        )
      );
    end if;
  end if;

  v_periodo_id := public.renovar_suscripcion(
    p_suscripcion_id, p_inicio, p_meses, null, p_tardia);

  if (p_monto_ves is not null and p_monto_ves > 0)
     or (p_monto_usd is not null and p_monto_usd > 0) then
    perform public.registrar_cobro_cliente(
      p_periodo_id => v_periodo_id,
      p_monto_ves  => p_monto_ves,
      p_referencia => p_referencia,
      p_monto_usd  => p_monto_usd
    );
  end if;

  return v_periodo_id;
end;
$$;

comment on function public.renovar_y_cobrar(
  uuid, date, integer, numeric, boolean, text, numeric, uuid, boolean
) is
  'Renueva y cobra atómicamente. Si p_actualizar_vendedor=true, confirma o '
  'corrige primero el vendedor de la suscripción dentro de la misma transacción; '
  'el cobro hereda su base BCV/paralela.';

revoke execute on function public.renovar_y_cobrar(
  uuid, date, integer, numeric, boolean, text, numeric, uuid, boolean
) from public;
grant execute on function public.renovar_y_cobrar(
  uuid, date, integer, numeric, boolean, text, numeric, uuid, boolean
) to authenticated;
