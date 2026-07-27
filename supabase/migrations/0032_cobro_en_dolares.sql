-- ============================================================================
-- 0032 — Cobrar indicando el monto en USD (además de en Bs)
-- ----------------------------------------------------------------------------
-- Anotar cada renovación en bolívares resultó tedioso para el dueño: muchas
-- veces él piensa el cobro en dólares («me pagó 4 $») y tener que traducirlo a
-- Bs a mano cada vez es fricción pura.
--
-- Esta migración NO cambia el hecho de dominio (DEC-102): el bolívar sigue
-- siendo el dato que se congela. Lo que se añade es una comodidad de ENTRADA:
-- si el usuario indica el monto en USD, la base calcula los bolívares con la
-- MISMA BCV que va a congelar (`round(usd × bcv, 2)`) y a partir de ahí todo
-- sigue igual — se guarda el bolívar, y el USD se vuelve a leer de él.
--
-- Se añade el parámetro `p_monto_usd` (al final, con default null) a las tres
-- funciones que cobran: `registrar_cobro_cliente`, `renovar_y_cobrar` y
-- `vender_unidad`. Solo una moneda por cobro: indicar las dos es un error.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- registrar_cobro_cliente — ahora acepta el monto en Bs O en USD
-- ----------------------------------------------------------------------------
drop function if exists public.registrar_cobro_cliente(uuid, numeric, text, timestamptz);

create or replace function public.registrar_cobro_cliente(
  p_periodo_id  uuid,
  p_monto_ves   numeric default null,
  p_referencia  text    default null,
  p_ocurrido_at timestamptz default now(),
  p_monto_usd   numeric default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_periodo   public.periodos_servicio;
  v_bcv       public.tasas_cambio;
  v_paralela  public.tasas_cambio;
  v_precio    numeric;
  v_pago_id   uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede registrar cobros.' using errcode = '42501';
  end if;

  select * into v_periodo
  from public.periodos_servicio
  where id = p_periodo_id
  for update;

  if not found then
    raise exception 'Período no encontrado.';
  end if;
  if v_periodo.estado <> 'vigente' then
    raise exception 'El período está % y no admite cobros.', v_periodo.estado;
  end if;

  -- Un cobro revertido deja de contar: el período vuelve a estar pendiente.
  if exists (
    select 1 from public.pagos_cliente pc
    where pc.periodo_servicio_id = p_periodo_id
      and pc.tipo = 'cobro' and pc.estado = 'confirmado'
      and not exists (
        select 1 from public.pagos_cliente rv
        where rv.pago_original_id = pc.id
          and rv.tipo = 'reverso' and rv.estado = 'confirmado')
  ) then
    raise exception 'Ese período ya está cobrado.';
  end if;

  -- --- Tasas: se reutilizan las ya congeladas; si no, las vigentes ---
  -- La BCV se resuelve ANTES de validar el monto porque, si el usuario indicó
  -- el cobro en dólares, hace falta para traducirlo a bolívares.
  if v_periodo.tasa_bcv_id is not null then
    select * into v_bcv from public.tasas_cambio where id = v_periodo.tasa_bcv_id;
  else
    select * into v_bcv from public.tasa_utilizable('bcv');
    if v_bcv.id is null then
      raise exception
        'No hay una tasa BCV confirmada en las últimas 24 h. Actualízala antes de cobrar.';
    end if;
  end if;

  -- Entrada en USD: se convierte a bolívares con la BCV que se va a congelar.
  -- El bolívar resultante es el hecho que se guarda; el USD se derivará de él.
  if p_monto_usd is not null and p_monto_usd > 0 then
    if p_monto_ves is not null then
      raise exception 'Indica el cobro en una sola moneda: bolívares o dólares, no ambos.';
    end if;
    p_monto_ves := round(p_monto_usd * v_bcv.bs_por_usd, 2);
  end if;

  if p_monto_ves is null or p_monto_ves <= 0 then
    raise exception 'Indica cuánto recibiste (en bolívares o en dólares).';
  end if;

  if v_periodo.tasa_paralela_id is not null then
    select * into v_paralela from public.tasas_cambio where id = v_periodo.tasa_paralela_id;
  else
    -- La paralela solo da la lectura económica: si falta, el cobro NO se
    -- bloquea (el cliente paga a BCV), pero queda sin valorización económica.
    select * into v_paralela from public.tasa_utilizable('paralela');
  end if;

  -- El USD es una lectura del dinero recibido, no un precio pactado.
  v_precio := round(p_monto_ves / v_bcv.bs_por_usd, 2);

  update public.periodos_servicio
  set tasa_bcv_id        = coalesce(tasa_bcv_id, v_bcv.id),
      tasa_paralela_id   = coalesce(tasa_paralela_id, v_paralela.id),
      precio_comercial_usd = v_precio,
      monto_ves_esperado   = p_monto_ves,
      estado_datos_financieros = 'completo'
  where id = p_periodo_id;

  insert into public.pagos_cliente (
    periodo_servicio_id, tipo, monto_ves, monto_ves_esperado_snapshot,
    tasa_bcv_id, tasa_paralela_id, ocurrido_at, estado, referencia, created_by
  ) values (
    p_periodo_id, 'cobro', p_monto_ves, p_monto_ves,
    v_bcv.id, v_paralela.id, coalesce(p_ocurrido_at, now()), 'confirmado',
    nullif(btrim(coalesce(p_referencia, '')), ''), auth.uid()
  )
  returning id into v_pago_id;

  insert into public.eventos_auditoria (actor_id, accion, entidad, entidad_id, resultado, metadata)
  values (
    auth.uid(), 'cobro_cliente', 'pagos_cliente', v_pago_id::text, 'ok',
    jsonb_build_object(
      'periodo_id', p_periodo_id, 'monto_ves', p_monto_ves,
      'usd_indicado', p_monto_usd, 'usd_derivado', v_precio,
      'bcv', v_bcv.bs_por_usd, 'paralela', v_paralela.bs_por_usd)
  );

  return v_pago_id;
end;
$$;

comment on function public.registrar_cobro_cliente is
  'Registra el dinero recibido por un período y congela BCV y paralela. Se '
  'puede indicar en bolívares (p_monto_ves) o en dólares (p_monto_usd); en el '
  'segundo caso se traduce a Bs con la BCV que se congela. El bolívar es el '
  'hecho que se guarda; el USD es una lectura (monto_ves / BCV).';

-- ----------------------------------------------------------------------------
-- renovar_y_cobrar — el monto también puede venir en USD
-- ----------------------------------------------------------------------------
drop function if exists public.renovar_y_cobrar(uuid, date, integer, numeric, boolean, text);

create or replace function public.renovar_y_cobrar(
  p_suscripcion_id uuid,
  p_inicio         date default current_date,
  p_meses          integer default 1,
  p_monto_ves      numeric default null,
  p_tardia         boolean default false,
  p_referencia     text default null,
  p_monto_usd      numeric default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_periodo_id uuid;
begin
  -- La autorización y las reglas del período las aplica `renovar_suscripcion`.
  v_periodo_id := public.renovar_suscripcion(
    p_suscripcion_id, p_inicio, p_meses, null, p_tardia);

  -- Sin monto se renueva igual: hay casos legítimos sin ingreso (cortesía, o
  -- un cliente que aún no ha pagado). Queda listado en «Por cobrar».
  if (p_monto_ves is not null and p_monto_ves > 0)
     or (p_monto_usd is not null and p_monto_usd > 0) then
    perform public.registrar_cobro_cliente(
      p_periodo_id  => v_periodo_id,
      p_monto_ves   => p_monto_ves,
      p_referencia  => p_referencia,
      p_monto_usd   => p_monto_usd);
  end if;

  return v_periodo_id;
end;
$$;

comment on function public.renovar_y_cobrar is
  'Renueva y cobra en la misma transacción. El monto puede indicarse en Bs '
  '(p_monto_ves) o en USD (p_monto_usd); sin monto queda pendiente en «Por '
  'cobrar». O quedan las dos cosas, o ninguna.';

-- ----------------------------------------------------------------------------
-- vender_unidad — la venta también puede cobrar en USD
-- ----------------------------------------------------------------------------
drop function if exists public.vender_unidad(
  uuid, uuid, uuid, uuid, numeric, date, integer, uuid, date, text, text, text, numeric);

create or replace function public.vender_unidad(
  p_cliente_id        uuid default null,
  p_cuenta_id         uuid default null,
  p_modalidad_id      uuid default null,
  p_unidad_id         uuid default null,
  p_precio_usd        numeric default null,
  p_inicio            date default current_date,
  p_cantidad_periodos integer default 1,
  p_vendedor_id       uuid default null,
  p_fecha_venta       date default null,
  p_cliente_nombre    text default null,
  p_cliente_whatsapp  text default null,
  p_nombre_perfil     text default null,
  p_monto_ves         numeric default null,
  p_monto_usd         numeric default null
)
returns uuid
language plpgsql
set search_path = ''
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
    if not exists (
      select 1 from public.unidades_inventario u
      where u.id = p_unidad_id and u.cuenta_id = p_cuenta_id
        and u.estado_operativo = 'habilitada' and u.estado_preparacion = 'lista'
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
      p_periodo_id  => v_periodo_id,
      p_monto_ves   => p_monto_ves,
      p_referencia  => null,
      p_ocurrido_at => coalesce(p_fecha_venta, p_inicio)::timestamptz,
      p_monto_usd   => p_monto_usd);
  end if;

  return v_suscripcion_id;
end;
$$;

comment on function public.vender_unidad is
  'Venta en un paso: crea el cliente si es nuevo, nombra el perfil, y crea '
  'suscripción + asignación + período. Si se indica un monto (en Bs o en USD), '
  'cobra en la misma transacción. Bloquea la cuenta y aplica la exclusión '
  'perfil ↔ cuenta.';

-- ============================================================================
-- Permisos
-- ============================================================================
revoke execute on function public.registrar_cobro_cliente(uuid, numeric, text, timestamptz, numeric) from public;
grant  execute on function public.registrar_cobro_cliente(uuid, numeric, text, timestamptz, numeric) to authenticated;
revoke execute on function public.renovar_y_cobrar(uuid, date, integer, numeric, boolean, text, numeric) from public;
grant  execute on function public.renovar_y_cobrar(uuid, date, integer, numeric, boolean, text, numeric) to authenticated;
revoke execute on function public.vender_unidad(
  uuid, uuid, uuid, uuid, numeric, date, integer, uuid, date, text, text, text, numeric, numeric) from public;
grant  execute on function public.vender_unidad(
  uuid, uuid, uuid, uuid, numeric, date, integer, uuid, date, text, text, text, numeric, numeric) to authenticated;
