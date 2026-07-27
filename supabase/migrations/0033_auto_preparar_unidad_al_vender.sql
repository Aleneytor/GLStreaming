-- ----------------------------------------------------------------------------
-- 0033_auto_preparar_unidad_al_vender.sql
-- Auto-preparar y habilitar unidad_inventario al venderla directamente si estaba
-- deshabilitada o pendiente de limpieza tras cancelaciones/importaciones.
-- Corregida la llamada interna a registrar_cobro_cliente y sobrecargas de vender_unidad.
-- ----------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in (
    select oid::regprocedure as func_sig
    from pg_proc
    where proname = 'vender_unidad'
      and pronamespace = 'public'::regnamespace
  ) loop
    execute 'drop function ' || r.func_sig || ' cascade;';
  end loop;
end $$;

create or replace function public.vender_unidad(
  p_cuenta_id           uuid,
  p_unidad_id           uuid default null,
  p_modalidad_id        uuid default '11111111-1111-4111-a111-111111111101',
  p_cliente_id          uuid default null,
  p_cliente_nombre      text default null,
  p_cliente_whatsapp    text default null,
  p_nombre_perfil       text default null,
  p_vendedor_id         uuid default null,
  p_precio_usd          numeric default null,
  p_inicio              date default current_date,
  p_cantidad_periodos   integer default 1,
  p_fecha_venta         date default current_date,
  p_monto_ves           numeric default null,
  p_banco_destino       text default null,
  p_referencia_ves      text default null,
  p_tasa_bcv_aplicada   numeric default null,
  p_monto_usd           numeric default null,
  p_forma_pago_usd      text default null,
  p_referencia_usd      text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuenta public.cuentas;
  v_cliente_id uuid;
  v_nombre_cliente text;
  v_alcance text;
  v_suscripcion_id uuid;
  v_periodo_id uuid;
  v_renovacion date;
  v_capacidad_consumida integer;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede registrar ventas.' using errcode = '42501';
  end if;

  if p_cuenta_id is null or p_modalidad_id is null then
    raise exception 'Faltan la cuenta o la modalidad.';
  end if;

  -- --- Cliente: por id, o por nombre (se reutiliza si existe, si no se crea) ---
  v_nombre_cliente := nullif(btrim(coalesce(p_cliente_nombre, '')), '');

  if p_cliente_id is not null then
    v_cliente_id := p_cliente_id;
    if not exists (select 1 from public.clientes where id = v_cliente_id) then
      raise exception 'Cliente no encontrado.';
    end if;
    select nombre into v_nombre_cliente from public.clientes where id = v_cliente_id;
  elsif v_nombre_cliente is not null then
    select id into v_cliente_id
    from public.clientes
    where lower(nombre) = lower(v_nombre_cliente) and archived_at is null
    limit 1;

    if v_cliente_id is null then
      insert into public.clientes (nombre, whatsapp_original, whatsapp_normalizado)
      values (
        v_nombre_cliente,
        nullif(btrim(coalesce(p_cliente_whatsapp, '')), ''),
        nullif(regexp_replace(coalesce(p_cliente_whatsapp, ''), '[^0-9+]', '', 'g'), '')
      )
      returning id into v_cliente_id;
    elsif nullif(btrim(coalesce(p_cliente_whatsapp, '')), '') is not null then
      update public.clientes
      set whatsapp_original = coalesce(whatsapp_original, btrim(p_cliente_whatsapp)),
          whatsapp_normalizado = coalesce(
            whatsapp_normalizado,
            nullif(regexp_replace(p_cliente_whatsapp, '[^0-9+]', '', 'g'), ''))
      where id = v_cliente_id;
    end if;
  else
    raise exception 'Indica el cliente.';
  end if;

  -- --- Cuenta y disponibilidad (bloqueo para evitar ventas simultáneas) ---
  select * into v_cuenta from public.cuentas where id = p_cuenta_id for update;
  if not found then
    raise exception 'Cuenta no encontrada.';
  end if;
  if v_cuenta.estado <> 'activa' then
    raise exception 'La cuenta está en estado "%" y no admite ventas.', v_cuenta.estado;
  end if;

  v_alcance := case when p_unidad_id is null then 'cuenta' else 'unidad' end;

  if not exists (
    select 1 from public.producto_modalidades pm
    where pm.producto_plataforma_id = v_cuenta.producto_plataforma_id
      and pm.modalidad_id = p_modalidad_id and pm.activa
  ) then
    raise exception 'Esa modalidad no está permitida para este producto.';
  end if;

  if exists (
    select 1 from public.asignaciones_inventario a
    where a.cuenta_id = p_cuenta_id and a.fin is null and a.alcance = 'cuenta'
  ) then
    raise exception 'La cuenta está vendida completa: no se pueden vender sus perfiles.';
  end if;

  if v_alcance = 'cuenta' then
    if exists (
      select 1 from public.asignaciones_inventario a
      where a.cuenta_id = p_cuenta_id and a.fin is null and a.unidad_id is not null
    ) then
      raise exception 'Hay perfiles ocupados: libéralos antes de vender la cuenta completa.';
    end if;
    v_capacidad_consumida := coalesce(v_cuenta.capacidad_vendible_habilitada, v_cuenta.capacidad);
  else
    -- Auto-habilitar y preparar la unidad si estaba deshabilitada o por_limpiar
    update public.unidades_inventario
    set estado_operativo = 'habilitada',
        estado_preparacion = 'lista'
    where id = p_unidad_id and cuenta_id = p_cuenta_id
      and (estado_operativo <> 'habilitada' or estado_preparacion <> 'lista');

    if not exists (
      select 1 from public.unidades_inventario u
      where u.id = p_unidad_id and u.cuenta_id = p_cuenta_id
    ) then
      raise exception 'El perfil no existe en esta cuenta.';
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

    update public.unidades_inventario
    set nombre_visible = coalesce(
      nullif(btrim(coalesce(p_nombre_perfil, '')), ''),
      v_nombre_cliente,
      nombre_visible)
    where id = p_unidad_id;
  end if;

  if p_precio_usd is not null and p_precio_usd < 0 then
    raise exception 'El precio no puede ser negativo.';
  end if;

  v_renovacion := public.fecha_renovacion_cliente(p_inicio, p_cantidad_periodos);

  insert into public.suscripciones (
    cliente_id, producto_plataforma_id, modalidad_id, vendedor_origen_id, estado
  ) values (
    v_cliente_id, v_cuenta.producto_plataforma_id, p_modalidad_id, p_vendedor_id, 'activa'
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
    p_inicio, v_renovacion, p_cantidad_periodos, p_precio_usd, 'pendiente'
  )
  returning id into v_periodo_id;

  insert into public.historial_estado_suscripcion (
    suscripcion_id, estado_anterior, estado_nuevo, motivo, actor_id
  ) values (v_suscripcion_id, null, 'activa', 'venta_nueva', auth.uid());

  -- Vender y cobrar en la misma transacción cuando el cliente paga en el acto.
  -- El monto puede venir en bolívares o en dólares.
  if (p_monto_ves is not null and p_monto_ves > 0)
     or (p_monto_usd is not null and p_monto_usd > 0) then
    perform public.registrar_cobro_cliente(
      p_periodo_id => v_periodo_id,
      p_monto_ves  => p_monto_ves,
      p_referencia => coalesce(p_referencia_usd, p_referencia_ves),
      p_monto_usd  => p_monto_usd
    );
  end if;

  return v_suscripcion_id;
end;
$$;

revoke execute on function public.vender_unidad from public, anon, authenticated;
grant  execute on function public.vender_unidad to authenticated;
