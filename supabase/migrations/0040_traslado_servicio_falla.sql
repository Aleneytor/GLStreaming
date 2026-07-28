-- ============================================================================
-- 0039 · Traslado administrativo por falla de cuenta (DEC-03 / DEC-60)
--
-- Mueve la asignación física sin crear otra venta, período, cobro o cliente.
-- La cuenta origen queda en mantenimiento, el acceso anterior se revoca y se
-- crea una entrega pendiente con las versiones de credenciales del destino.
-- ============================================================================

create or replace function public.listar_destinos_traslado(
  p_suscripcion_id uuid
)
returns table (
  cuenta_id uuid,
  unidad_id uuid,
  cuenta_alias text,
  cuenta_orden numeric,
  unidad_numero integer,
  unidad_tipo text,
  alcance text
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_origen public.asignaciones_inventario;
  v_cliente_id uuid;
  v_alcance text;
  v_tipo_unidad text;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede consultar destinos.' using errcode = '42501';
  end if;

  select a.* into v_origen
  from public.asignaciones_inventario a
  where a.suscripcion_id = p_suscripcion_id and a.fin is null
  order by a.inicio desc
  limit 1;

  if not found then
    raise exception 'El servicio no tiene una asignación activa.';
  end if;

  select s.cliente_id into v_cliente_id
  from public.suscripciones s where s.id = p_suscripcion_id;
  select m.alcance_asignacion into v_alcance
  from public.modalidades m where m.id = v_origen.modalidad_id;

  -- Una individual de Spotify no se sustituye como una cuenta compartida: la
  -- resolución correcta es reactivar la misma identidad o tratar su incidencia.
  if exists (
    select 1 from public.coberturas_spotify cs
    where cs.cuenta_id = v_origen.cuenta_id and cs.tipo <> 'familiar'
  ) then
    return;
  end if;

  if v_alcance = 'unidad' then
    select u.tipo_unidad into v_tipo_unidad
    from public.unidades_inventario u where u.id = v_origen.unidad_id;

    return query
    select c.id, u.id, c.alias, c.orden, u.numero_slot, u.tipo_unidad, v_alcance
    from public.cuentas c
    join public.unidades_inventario u on u.cuenta_id = c.id
    left join public.coberturas_spotify cs on cs.cuenta_id = c.id
    where c.producto_plataforma_id = v_origen.producto_plataforma_id
      and c.id <> v_origen.cuenta_id
      and c.estado = 'activa' and c.archived_at is null
      and exists (
        select 1 from public.producto_modalidades pm
        where pm.producto_plataforma_id = c.producto_plataforma_id
          and pm.modalidad_id = v_origen.modalidad_id
          and pm.activa and pm.archived_at is null
      )
      and (c.titular_tipo <> 'cliente' or c.cliente_propietario_id = v_cliente_id)
      and u.archived_at is null
      and u.estado_operativo = 'habilitada'
      and u.estado_preparacion = 'lista'
      and u.tipo_unidad is not distinct from v_tipo_unidad
      and not exists (
        select 1 from public.asignaciones_inventario ocupada
        where ocupada.unidad_id = u.id and ocupada.fin is null
      )
      and not exists (
        select 1 from public.asignaciones_inventario completa
        where completa.cuenta_id = c.id and completa.fin is null
          and completa.alcance = 'cuenta'
      )
      and (cs.cuenta_id is null or cs.tipo <> 'familiar' or cs.estado_admision = 'abierta')
    order by c.orden nulls last, c.created_at, u.numero_slot;
  else
    return query
    select c.id, null::uuid, c.alias, c.orden, null::integer, null::text, v_alcance
    from public.cuentas c
    left join public.coberturas_spotify cs on cs.cuenta_id = c.id
    where c.producto_plataforma_id = v_origen.producto_plataforma_id
      and c.id <> v_origen.cuenta_id
      and c.estado = 'activa' and c.archived_at is null
      and exists (
        select 1 from public.producto_modalidades pm
        where pm.producto_plataforma_id = c.producto_plataforma_id
          and pm.modalidad_id = v_origen.modalidad_id
          and pm.activa and pm.archived_at is null
      )
      and (c.titular_tipo <> 'cliente' or c.cliente_propietario_id = v_cliente_id)
      and not exists (
        select 1 from public.asignaciones_inventario ocupada
        where ocupada.cuenta_id = c.id and ocupada.fin is null
          and (v_alcance = 'cuenta' or ocupada.alcance in ('cuenta', 'principal'))
      )
      and (
        v_alcance <> 'cuenta'
        or not exists (
          select 1 from public.unidades_inventario u
          where u.cuenta_id = c.id and u.archived_at is null
            and (u.estado_operativo <> 'habilitada' or u.estado_preparacion <> 'lista')
        )
      )
      and (cs.cuenta_id is null or cs.tipo <> 'familiar' or cs.estado_admision = 'abierta')
    order by c.orden nulls last, c.created_at;
  end if;
end;
$$;

create or replace function public.trasladar_servicio_por_falla(
  p_suscripcion_id uuid,
  p_cuenta_destino_id uuid,
  p_unidad_destino_id uuid default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_origen public.asignaciones_inventario;
  v_destino public.cuentas;
  v_suscripcion public.suscripciones;
  v_unidad_origen public.unidades_inventario;
  v_unidad_destino public.unidades_inventario;
  v_alcance text;
  v_ahora timestamptz := now();
  v_nueva_asignacion uuid;
  v_periodo_id uuid;
  v_fecha_renovacion date;
  v_credencial_version integer;
  v_secreto_version integer;
  v_identidad_id uuid;
  v_identidad_version integer;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede trasladar servicios.' using errcode = '42501';
  end if;

  select * into v_suscripcion
  from public.suscripciones
  where id = p_suscripcion_id
  for update;
  if not found then raise exception 'Suscripción no encontrada.'; end if;
  if v_suscripcion.estado not in ('activa', 'pausada') then
    raise exception 'La suscripción está % y no puede trasladarse.', v_suscripcion.estado;
  end if;

  select * into v_origen
  from public.asignaciones_inventario
  where suscripcion_id = p_suscripcion_id and fin is null
  order by inicio desc
  limit 1
  for update;
  if not found then raise exception 'El servicio no tiene una asignación activa.'; end if;
  if v_origen.cuenta_id = p_cuenta_destino_id then
    raise exception 'El destino debe pertenecer a otra cuenta.';
  end if;

  -- Bloqueo determinista de las dos cuentas para evitar cruces simultáneos.
  perform 1 from public.cuentas
  where id in (v_origen.cuenta_id, p_cuenta_destino_id)
  order by id for update;

  select * into v_destino from public.cuentas where id = p_cuenta_destino_id;
  if not found or v_destino.estado <> 'activa' or v_destino.archived_at is not null then
    raise exception 'La cuenta destino no está activa y disponible.';
  end if;
  if v_destino.producto_plataforma_id <> v_origen.producto_plataforma_id then
    raise exception 'La cuenta destino pertenece a otro producto.';
  end if;
  if v_destino.titular_tipo = 'cliente'
     and v_destino.cliente_propietario_id is distinct from v_suscripcion.cliente_id then
    raise exception 'La cuenta destino pertenece a otro cliente.';
  end if;
  if not exists (
    select 1 from public.producto_modalidades pm
    where pm.producto_plataforma_id = v_destino.producto_plataforma_id
      and pm.modalidad_id = v_origen.modalidad_id
      and pm.activa and pm.archived_at is null
  ) then
    raise exception 'La cuenta destino no admite esta modalidad.';
  end if;

  select m.alcance_asignacion into v_alcance
  from public.modalidades m where m.id = v_origen.modalidad_id;

  if exists (
    select 1 from public.coberturas_spotify cs
    where cs.cuenta_id = v_origen.cuenta_id and cs.tipo <> 'familiar'
  ) then
    raise exception 'Spotify individual debe reactivar su misma identidad desde incidencias; no se traslada como cuenta compartida.';
  end if;

  if exists (
    select 1 from public.coberturas_spotify cs
    where cs.cuenta_id = p_cuenta_destino_id and cs.tipo = 'familiar'
      and cs.estado_admision <> 'abierta'
  ) then
    raise exception 'La familia Spotify destino tiene la admisión bloqueada.';
  end if;

  if v_alcance = 'unidad' then
    if p_unidad_destino_id is null then raise exception 'Debes elegir un cupo destino.'; end if;
    select * into v_unidad_origen from public.unidades_inventario where id = v_origen.unidad_id;
    select * into v_unidad_destino from public.unidades_inventario
      where id = p_unidad_destino_id for update;
    if not found or v_unidad_destino.cuenta_id <> p_cuenta_destino_id then
      raise exception 'El cupo no pertenece a la cuenta destino.';
    end if;
    if v_unidad_destino.archived_at is not null
       or v_unidad_destino.estado_operativo <> 'habilitada'
       or v_unidad_destino.estado_preparacion <> 'lista' then
      raise exception 'El cupo destino no está preparado para vender.';
    end if;
    if v_unidad_destino.tipo_unidad is distinct from v_unidad_origen.tipo_unidad then
      raise exception 'El tipo de cupo destino no es compatible.';
    end if;
    if exists (select 1 from public.asignaciones_inventario a where a.unidad_id = p_unidad_destino_id and a.fin is null)
       or exists (select 1 from public.asignaciones_inventario a where a.cuenta_id = p_cuenta_destino_id and a.fin is null and a.alcance = 'cuenta') then
      raise exception 'El cupo destino ya está ocupado.';
    end if;
  else
    if p_unidad_destino_id is not null then
      raise exception 'Esta modalidad se traslada a una cuenta completa, no a un cupo.';
    end if;
    if exists (
      select 1 from public.asignaciones_inventario a
      where a.cuenta_id = p_cuenta_destino_id and a.fin is null
        and (v_alcance = 'cuenta' or a.alcance in ('cuenta', 'principal'))
    ) then
      raise exception 'La cuenta destino no está completamente libre.';
    end if;
    if v_alcance = 'cuenta' and exists (
      select 1 from public.unidades_inventario u
      where u.cuenta_id = p_cuenta_destino_id and u.archived_at is null
        and (u.estado_operativo <> 'habilitada' or u.estado_preparacion <> 'lista')
    ) then
      raise exception 'La cuenta destino tiene cupos sin preparar.';
    end if;
  end if;

  update public.asignaciones_inventario
  set fin = v_ahora, estado_cierre = 'ninguno', motivo_fin = 'traslado_falla'
  where id = v_origen.id;

  update public.cuentas set estado = 'mantenimiento' where id = v_origen.cuenta_id;
  update public.unidades_inventario
  set estado_operativo = 'mantenimiento'
  where cuenta_id = v_origen.cuenta_id and archived_at is null;

  if v_alcance = 'unidad' then
    update public.unidades_inventario
    set nombre_visible = v_unidad_origen.nombre_visible
    where id = p_unidad_destino_id;
  end if;

  insert into public.asignaciones_inventario (
    suscripcion_id, producto_plataforma_id, modalidad_id, alcance,
    cuenta_id, unidad_id, consume_capacidad, capacidad_fisica_snapshot,
    capacidad_vendible_consumida_snapshot, inicio, created_by
  ) values (
    p_suscripcion_id, v_origen.producto_plataforma_id, v_origen.modalidad_id, v_alcance,
    p_cuenta_destino_id, p_unidad_destino_id, v_origen.consume_capacidad,
    v_destino.capacidad, v_origen.capacidad_vendible_consumida_snapshot,
    v_ahora, auth.uid()
  ) returning id into v_nueva_asignacion;

  update public.entregas_acceso
  set estado = 'revocada', revocada_at = v_ahora,
      motivo_revocacion = 'traslado por falla de cuenta'
  where asignacion_inventario_id = v_origen.id and estado <> 'revocada';

  select p.id, p.fecha_renovacion into v_periodo_id, v_fecha_renovacion
  from public.periodos_servicio p
  where p.suscripcion_id = p_suscripcion_id and p.estado <> 'anulado'
  order by p.fecha_renovacion desc limit 1;

  select cc.version_clave into v_credencial_version
  from public.credenciales_cuenta cc
  where cc.cuenta_id = p_cuenta_destino_id and cc.eliminada_at is null;

  if p_unidad_destino_id is not null then
    select su.version_clave into v_secreto_version
    from public.secretos_unidad su where su.unidad_id = p_unidad_destino_id;
  end if;

  select vi.identidad_spotify_id, i.version_clave
    into v_identidad_id, v_identidad_version
  from public.vinculos_identidad_spotify vi
  join public.identidades_spotify i on i.id = vi.identidad_spotify_id
  where vi.suscripcion_id = p_suscripcion_id and vi.fin is null
  limit 1;

  insert into public.entregas_acceso (
    suscripcion_id, periodo_servicio_id, asignacion_inventario_id,
    identidad_spotify_id, tipo, estado, credencial_cuenta_version,
    credencial_identidad_version, secreto_unidad_version,
    nombre_perfil_snapshot, fecha_renovacion_snapshot, motivo
  ) values (
    p_suscripcion_id, v_periodo_id, v_nueva_asignacion,
    v_identidad_id, 'traslado', 'pendiente', v_credencial_version,
    v_identidad_version, v_secreto_version,
    case when p_unidad_destino_id is null then null else v_unidad_origen.nombre_visible end,
    v_fecha_renovacion, 'Cuenta origen con falla'
  );

  insert into public.eventos_auditoria (
    actor_id, accion, entidad, entidad_id, resultado, metadata
  ) values (
    auth.uid(), 'trasladar_servicio_por_falla', 'suscripciones',
    p_suscripcion_id::text, 'ok',
    jsonb_build_object(
      'asignacion_origen_id', v_origen.id,
      'cuenta_origen_id', v_origen.cuenta_id,
      'asignacion_destino_id', v_nueva_asignacion,
      'cuenta_destino_id', p_cuenta_destino_id,
      'unidad_destino_id', p_unidad_destino_id
    )
  );

  return v_nueva_asignacion;
end;
$$;

revoke execute on function public.listar_destinos_traslado(uuid) from public;
grant execute on function public.listar_destinos_traslado(uuid) to authenticated;
revoke execute on function public.trasladar_servicio_por_falla(uuid, uuid, uuid) from public;
grant execute on function public.trasladar_servicio_por_falla(uuid, uuid, uuid) to authenticated;
