-- ============================================================================
-- 0014 — Ciclo de vida de la suscripción (Fase 3)
-- ----------------------------------------------------------------------------
-- Renovar, pausar, reactivar, cancelar y liberar.
--
-- REGLAS DE DOMINIO QUE IMPLEMENTA (docs/01-alcance-y-reglas.md):
--  * Vencer NO libera nada: son válidos los clientes "Activo · Vencido hace 2
--    días". Solo una acción explícita del administrador cambia el estado.
--  * Renovación tardía: nunca empieza antes del pago completo. Si el cliente
--    seguía activo, arranca en la fecha del pago; si estaba pausado, en la
--    fecha posterior entre el pago y la reactivación.
--  * Pausar CONSERVA la asignación: el perfil sigue apartado para ese cliente.
--  * Liberar es en DOS PASOS: primero la asignación queda en `cierre_pendiente`
--    y la unidad en `pendiente_limpieza` con una operación remota pendiente;
--    solo al confirmar la limpieza en la plataforma externa el perfil vuelve a
--    estar disponible. Nunca vuelve al stock "por arte de magia".
--  * Renovar AGREGA un período; jamás sobrescribe el anterior.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- renovar_suscripcion
-- ----------------------------------------------------------------------------
create or replace function public.renovar_suscripcion(
  p_suscripcion_id uuid,
  p_inicio         date default current_date,
  p_meses          integer default 1,
  p_precio_usd     numeric default null,
  p_tardia         boolean default false
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_estado text;
  v_periodo_id uuid;
  v_ultimo_fin date;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede renovar.' using errcode = '42501';
  end if;

  select estado into v_estado from public.suscripciones where id = p_suscripcion_id;
  if not found then
    raise exception 'Suscripción no encontrada.';
  end if;
  if v_estado in ('cancelada', 'finalizada') then
    raise exception 'La suscripción está % y no se puede renovar.', v_estado;
  end if;

  -- El nuevo período no puede empezar antes de que termine el anterior salvo
  -- que sea una renovación tardía (que arranca en la fecha real del pago).
  select max(fecha_renovacion) into v_ultimo_fin
  from public.periodos_servicio
  where suscripcion_id = p_suscripcion_id and estado = 'vigente';

  if not p_tardia and v_ultimo_fin is not null and p_inicio < v_ultimo_fin then
    raise exception
      'El período nuevo empezaría antes de que termine el actual (%). Usa renovación tardía si el cliente pagó después.',
      v_ultimo_fin;
  end if;

  insert into public.periodos_servicio (
    suscripcion_id, tipo_operacion, fecha_venta, inicio, fecha_renovacion,
    cantidad_periodos, precio_comercial_usd, estado_datos_financieros
  ) values (
    p_suscripcion_id,
    case when p_tardia then 'renovacion_tardia' else 'renovacion' end,
    p_inicio, p_inicio,
    public.fecha_renovacion_cliente(p_inicio, p_meses),
    p_meses, p_precio_usd, 'pendiente'
  )
  returning id into v_periodo_id;

  -- Renovar a un cliente pausado lo devuelve a activo.
  if v_estado = 'pausada' then
    update public.suscripciones set estado = 'activa' where id = p_suscripcion_id;
    insert into public.historial_estado_suscripcion (
      suscripcion_id, estado_anterior, estado_nuevo, motivo, actor_id
    ) values (p_suscripcion_id, 'pausada', 'activa', 'renovacion', auth.uid());
  end if;

  return v_periodo_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- cambiar_estado_suscripcion — pausar / reactivar
-- ----------------------------------------------------------------------------
create or replace function public.cambiar_estado_suscripcion(
  p_suscripcion_id uuid,
  p_nuevo_estado   text,
  p_motivo         text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_actual text;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar el estado.' using errcode = '42501';
  end if;
  if p_nuevo_estado not in ('activa', 'pausada') then
    raise exception 'Estado no permitido aquí: % (cancelar usa cancelar_y_liberar).', p_nuevo_estado;
  end if;

  select estado into v_actual from public.suscripciones where id = p_suscripcion_id;
  if not found then
    raise exception 'Suscripción no encontrada.';
  end if;
  if v_actual in ('cancelada', 'finalizada') then
    raise exception 'La suscripción está % y no admite cambios.', v_actual;
  end if;
  if v_actual = p_nuevo_estado then
    return;
  end if;

  update public.suscripciones set estado = p_nuevo_estado where id = p_suscripcion_id;

  insert into public.historial_estado_suscripcion (
    suscripcion_id, estado_anterior, estado_nuevo, motivo, actor_id
  ) values (p_suscripcion_id, v_actual, p_nuevo_estado, p_motivo, auth.uid());
  -- Nota: pausar NO cierra la asignación. El perfil sigue apartado.
end;
$$;

-- ----------------------------------------------------------------------------
-- cancelar_y_liberar — paso 1 de 2: deja el recurso en saneamiento
-- ----------------------------------------------------------------------------
create or replace function public.cancelar_y_liberar(
  p_suscripcion_id uuid,
  p_motivo         text default 'no_renovacion'
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_asignacion public.asignaciones_inventario;
  v_operacion_id uuid;
  v_estado text;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cancelar.' using errcode = '42501';
  end if;

  select estado into v_estado from public.suscripciones where id = p_suscripcion_id;
  if not found then
    raise exception 'Suscripción no encontrada.';
  end if;

  select * into v_asignacion
  from public.asignaciones_inventario
  where suscripcion_id = p_suscripcion_id and fin is null
  limit 1;

  if found then
    -- La asignación se cierra pero queda RETENIDA hasta confirmar la limpieza.
    update public.asignaciones_inventario
    set fin = now(),
        estado_cierre = 'cierre_pendiente',
        motivo_fin = case
          when p_motivo in ('traslado_falla','traslado_operativo','no_renovacion',
                            'cancelacion','cambio_modalidad','otro') then p_motivo
          else 'otro' end
    where id = v_asignacion.id;

    if v_asignacion.unidad_id is not null then
      update public.unidades_inventario
      set estado_preparacion = 'pendiente_limpieza'
      where id = v_asignacion.unidad_id;
    else
      -- Venta de cuenta completa: todos sus perfiles quedan por sanear.
      update public.unidades_inventario
      set estado_preparacion = 'pendiente_limpieza'
      where cuenta_id = v_asignacion.cuenta_id;
    end if;

    -- El índice de clave_idempotencia es PARCIAL (solo cuando no es nula), así
    -- que ON CONFLICT debe repetir esa misma condición.
    insert into public.operaciones_remotas (
      tipo, estado, clave_idempotencia, cuenta_id, unidad_id, asignacion_id,
      estado_revocacion, iniciada_por_id
    ) values (
      'eliminar_perfil', 'pendiente',
      'liberacion:' || v_asignacion.id::text,
      v_asignacion.cuenta_id, v_asignacion.unidad_id, v_asignacion.id,
      'pendiente', auth.uid()
    )
    on conflict (clave_idempotencia) where clave_idempotencia is not null do nothing
    returning id into v_operacion_id;

    -- Reintento: la operación ya existía, se devuelve la misma.
    if v_operacion_id is null then
      select id into v_operacion_id
      from public.operaciones_remotas
      where clave_idempotencia = 'liberacion:' || v_asignacion.id::text;
    end if;
  end if;

  update public.suscripciones
  set estado = 'cancelada', closed_at = now()
  where id = p_suscripcion_id;

  insert into public.historial_estado_suscripcion (
    suscripcion_id, estado_anterior, estado_nuevo, motivo, actor_id
  ) values (p_suscripcion_id, v_estado, 'cancelada', p_motivo, auth.uid());

  return v_operacion_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- confirmar_limpieza — paso 2 de 2: el recurso vuelve a estar disponible
-- ----------------------------------------------------------------------------
create or replace function public.confirmar_limpieza(
  p_operacion_id uuid,
  p_evidencia    text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_op public.operaciones_remotas;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede confirmar la limpieza.' using errcode = '42501';
  end if;

  select * into v_op from public.operaciones_remotas where id = p_operacion_id;
  if not found then
    raise exception 'Operación no encontrada.';
  end if;
  if v_op.estado = 'confirmada' then
    return;  -- idempotente
  end if;

  update public.operaciones_remotas
  set estado = 'confirmada',
      estado_revocacion = 'cumplida',
      finalizada_por_id = auth.uid(),
      finalizada_at = now(),
      evidencia_no_sensible = p_evidencia
  where id = p_operacion_id;

  -- Solo AHORA el perfil vuelve al stock.
  if v_op.unidad_id is not null then
    update public.unidades_inventario
    set estado_preparacion = 'lista'
    where id = v_op.unidad_id;
  elsif v_op.cuenta_id is not null then
    update public.unidades_inventario
    set estado_preparacion = 'lista'
    where cuenta_id = v_op.cuenta_id and estado_preparacion = 'pendiente_limpieza';
  end if;

  if v_op.asignacion_id is not null then
    update public.asignaciones_inventario
    set estado_cierre = 'ninguno'
    where id = v_op.asignacion_id;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- fijar_recordatorio — "Recontactar el" (comercial, no crea período ni ingreso)
-- ----------------------------------------------------------------------------
create or replace function public.fijar_recordatorio(
  p_suscripcion_id uuid,
  p_fecha          date default null,
  p_nota           text default null
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede fijar recordatorios.' using errcode = '42501';
  end if;

  update public.suscripciones
  set recontactar_el = p_fecha,
      nota_renovacion = nullif(btrim(coalesce(p_nota, '')), '')
  where id = p_suscripcion_id;

  if not found then
    raise exception 'Suscripción no encontrada.';
  end if;
end;
$$;

comment on function public.cancelar_y_liberar is
  'Paso 1 de 2. Cierra la asignación como cierre_pendiente, deja la unidad en '
  'pendiente_limpieza y crea la operación remota. El perfil NO vuelve al stock '
  'hasta confirmar_limpieza().';

do $$
declare f text;
begin
  for f in
    select 'renovar_suscripcion(uuid, date, integer, numeric, boolean)'
    union all select 'cambiar_estado_suscripcion(uuid, text, text)'
    union all select 'cancelar_y_liberar(uuid, text)'
    union all select 'confirmar_limpieza(uuid, text)'
    union all select 'fijar_recordatorio(uuid, date, text)'
  loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
