-- ============================================================================
-- 0013 — Venta de una unidad (Fase 3: ciclo comercial)
-- ----------------------------------------------------------------------------
-- Primera pieza del ciclo comercial: vender un perfil (o una cuenta completa)
-- a un cliente. Crea, en una sola transacción:
--   suscripciones          = la relación comercial estable
--   asignaciones_inventario = por qué recurso pasa el cliente
--   periodos_servicio      = la venta concreta, con su precio y sus fechas
--
-- REGLAS CRÍTICAS QUE GARANTIZA:
--  * Bloqueo por cuenta (`for update`): dos operadores no pueden vender la
--    misma unidad a la vez. Sin esto, dos ventas simultáneas se colarían.
--  * Exclusión del arquetipo híbrido: una venta de cuenta completa bloquea
--    todos sus perfiles, y cualquier perfil ocupado impide vender la completa.
--  * Fecha de renovación por MES CALENDARIO con ajuste de fin de mes
--    (31/01 -> 28/02), no por bloques de 30 días.
--
-- ALCANCE: aquí se registra la venta y su precio en USD. El COBRO en bolívares
-- (con sus tasas BCV/paralela congeladas) llega con la integración de tasas, por
-- eso el período nace con `estado_datos_financieros = 'pendiente'` cuando no se
-- informa el cobro.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- fecha_renovacion_cliente — mismo día, N meses después; si el mes no lo tiene,
-- el último día válido. Equivalente SQL de src/domain/fechas.ts.
-- ----------------------------------------------------------------------------
create or replace function public.fecha_renovacion_cliente(
  p_inicio date,
  p_meses integer default 1
)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_destino timestamp;
  v_ultimo integer;
  v_dia integer;
begin
  if p_meses is null or p_meses < 1 then
    raise exception 'La cantidad de meses debe ser 1 o más.';
  end if;

  v_destino := date_trunc('month', p_inicio::timestamp) + (p_meses || ' month')::interval;
  v_ultimo  := extract(day from (date_trunc('month', v_destino) + interval '1 month - 1 day'))::integer;
  v_dia     := least(extract(day from p_inicio)::integer, v_ultimo);

  return make_date(
    extract(year from v_destino)::integer,
    extract(month from v_destino)::integer,
    v_dia
  );
end;
$$;

comment on function public.fecha_renovacion_cliente is
  'Mes calendario con ajuste de fin de mes: 31/01 + 1 mes = 28/02 (o 29 en '
  'bisiesto). Es la fecha de CONTACTO del cliente, flexible; no corta el acceso.';

-- ----------------------------------------------------------------------------
-- vender_unidad — venta atómica de un perfil o de la cuenta completa
-- ----------------------------------------------------------------------------
create or replace function public.vender_unidad(
  p_cliente_id       uuid,
  p_cuenta_id        uuid,
  p_modalidad_id     uuid,
  p_unidad_id        uuid default null,     -- null = venta de cuenta completa
  p_precio_usd       numeric default null,
  p_inicio           date default current_date,
  p_cantidad_periodos integer default 1,
  p_vendedor_id      uuid default null,
  p_fecha_venta      date default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_cuenta public.cuentas;
  v_alcance text;
  v_suscripcion_id uuid;
  v_renovacion date;
  v_capacidad_consumida integer;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede registrar ventas.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.clientes where id = p_cliente_id) then
    raise exception 'Cliente no encontrado.';
  end if;

  -- BLOQUEO: serializa las ventas sobre esta cuenta. Dos operadores que
  -- intenten vender a la vez se ordenan aquí; el segundo verá el estado real.
  select * into v_cuenta
  from public.cuentas
  where id = p_cuenta_id
  for update;

  if not found then
    raise exception 'Cuenta no encontrada.';
  end if;
  if v_cuenta.estado <> 'activa' then
    raise exception 'La cuenta está en estado "%" y no admite ventas.', v_cuenta.estado;
  end if;

  v_alcance := case when p_unidad_id is null then 'cuenta' else 'unidad' end;

  -- La modalidad debe estar permitida para el producto de la cuenta.
  if not exists (
    select 1 from public.producto_modalidades pm
    where pm.producto_plataforma_id = v_cuenta.producto_plataforma_id
      and pm.modalidad_id = p_modalidad_id
      and pm.activa
  ) then
    raise exception 'Esa modalidad no está permitida para este producto.';
  end if;

  -- Exclusión del arquetipo híbrido: una venta de cuenta completa ocupa todo.
  if exists (
    select 1 from public.asignaciones_inventario a
    where a.cuenta_id = p_cuenta_id and a.fin is null and a.alcance = 'cuenta'
  ) then
    raise exception 'La cuenta está vendida completa: no se pueden vender sus perfiles.';
  end if;

  if v_alcance = 'cuenta' then
    -- Para vender la cuenta completa, ningún perfil puede estar ocupado.
    if exists (
      select 1 from public.asignaciones_inventario a
      where a.cuenta_id = p_cuenta_id and a.fin is null and a.unidad_id is not null
    ) then
      raise exception 'Hay perfiles ocupados: libéralos antes de vender la cuenta completa.';
    end if;
    v_capacidad_consumida := coalesce(v_cuenta.capacidad_vendible_habilitada, v_cuenta.capacidad);
  else
    -- Venta de un perfil concreto.
    if not exists (
      select 1 from public.unidades_inventario u
      where u.id = p_unidad_id
        and u.cuenta_id = p_cuenta_id
        and u.estado_operativo = 'habilitada'
        and u.estado_preparacion = 'lista'
    ) then
      raise exception 'El perfil no existe, no está habilitado o está pendiente de limpieza.';
    end if;

    if exists (
      select 1 from public.asignaciones_inventario a
      where a.unidad_id = p_unidad_id and a.fin is null
    ) then
      raise exception 'Ese perfil ya está vendido.';
    end if;

    if exists (
      select 1 from public.reservas_inventario r
      where r.unidad_id = p_unidad_id and r.estado = 'activa'
    ) then
      raise exception 'Ese perfil está reservado.';
    end if;

    v_capacidad_consumida := 1;
  end if;

  if p_precio_usd is not null and p_precio_usd < 0 then
    raise exception 'El precio no puede ser negativo.';
  end if;

  v_renovacion := public.fecha_renovacion_cliente(p_inicio, p_cantidad_periodos);

  insert into public.suscripciones (
    cliente_id, producto_plataforma_id, modalidad_id, vendedor_origen_id, estado
  ) values (
    p_cliente_id, v_cuenta.producto_plataforma_id, p_modalidad_id, p_vendedor_id, 'activa'
  )
  returning id into v_suscripcion_id;

  insert into public.asignaciones_inventario (
    suscripcion_id, producto_plataforma_id, modalidad_id, alcance,
    cuenta_id, unidad_id, consume_capacidad,
    capacidad_fisica_snapshot, capacidad_vendible_consumida_snapshot, inicio
  ) values (
    v_suscripcion_id, v_cuenta.producto_plataforma_id, p_modalidad_id, v_alcance,
    p_cuenta_id, p_unidad_id, true,
    v_cuenta.capacidad, v_capacidad_consumida, now()
  );

  insert into public.periodos_servicio (
    suscripcion_id, vendedor_id, tipo_operacion, fecha_venta,
    inicio, fecha_renovacion, cantidad_periodos, precio_comercial_usd,
    estado_datos_financieros
  ) values (
    v_suscripcion_id, p_vendedor_id, 'venta_nueva', coalesce(p_fecha_venta, p_inicio),
    p_inicio, v_renovacion, p_cantidad_periodos, p_precio_usd,
    -- Sin cobro registrado todavía: el monto en Bs y sus tasas llegan con la
    -- integración de tasas (Fase 4).
    case when p_precio_usd is null then 'pendiente' else 'pendiente' end
  );

  insert into public.historial_estado_suscripcion (
    suscripcion_id, estado_anterior, estado_nuevo, motivo, actor_id
  ) values (
    v_suscripcion_id, null, 'activa', 'venta_nueva', auth.uid()
  );

  return v_suscripcion_id;
end;
$$;

comment on function public.vender_unidad is
  'Venta atómica: crea suscripción + asignación + período. Bloquea la cuenta '
  'para que dos operadores no vendan el mismo perfil, y aplica la exclusión '
  'entre venta por perfil y venta de cuenta completa.';

revoke execute on function public.vender_unidad(
  uuid, uuid, uuid, uuid, numeric, date, integer, uuid, date) from public;
grant  execute on function public.vender_unidad(
  uuid, uuid, uuid, uuid, numeric, date, integer, uuid, date) to authenticated;
