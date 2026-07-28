-- ============================================================================
-- 0039 — Importar la renovación del proveedor aunque NO haya inversión
-- ----------------------------------------------------------------------------
-- Una cuenta puede tener fecha de renovación con el proveedor pero costo CERO
-- (cortesía del proveedor, cuenta propia, etc.). Hasta ahora el ciclo de
-- proveedor solo se creaba si había un costo > 0, de modo que esas cuentas se
-- importaban SIN próxima renovación y su aviso de «faltan X días» quedaba vacío
-- («+ Pagar»).
--
-- Ahora el ciclo se crea si hay un COSTO o si hay una FECHA DE RENOVACIÓN del
-- proveedor. Sin inversión el costo se guarda como 0 (no mueve Caja, no se
-- valoriza a paralela), pero la próxima renovación queda registrada y el aviso
-- de días funciona. Es el único cambio respecto a 0025.
-- ============================================================================

create or replace function public.importar_servicio_existente(
  p_sesion_id          uuid,
  p_producto_id        uuid,
  p_capacidad          integer,
  p_login_cifrado      text,
  p_login_fingerprint  text,
  p_contrasena_cifrada text,
  p_alias              text default null,
  p_numero_slot        integer default 1,
  p_nombre_perfil      text default null,
  p_pin_cifrado        text default null,
  p_modalidad_id       uuid default null,
  p_cliente_nombre     text default null,
  p_cliente_whatsapp   text default null,
  p_inicio             date default null,
  p_fecha_renovacion   date default null,
  p_monto_ves          numeric default null,
  p_vendedor_id        uuid default null,
  p_costo_usdt         numeric default null,
  p_proveedor_nombre   text default null,
  p_prov_inicio        date default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_cuenta_id      uuid;
  v_unidad_id      uuid;
  v_cliente_id     uuid;
  v_suscripcion_id uuid;
  v_periodo_id     uuid;
  v_ciclo_id       uuid;
  v_par            public.tasas_cambio;
  v_nombre_cliente text;
  v_proveedor      text;
  v_alcance        text := 'unidad';
  v_creada_cuenta  boolean := false;
  v_producto       public.productos_plataforma;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede importar.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.sesiones_carga_inicial
    where id = p_sesion_id and estado = 'abierta'
  ) then
    raise exception 'No hay una sesión de carga abierta: la importación exige una.';
  end if;

  select * into v_producto from public.productos_plataforma where id = p_producto_id;
  if not found then
    raise exception 'Producto no encontrado.';
  end if;

  if p_modalidad_id is not null then
    select alcance_asignacion into v_alcance
    from public.modalidades where id = p_modalidad_id;
  end if;

  v_nombre_cliente := nullif(btrim(coalesce(p_cliente_nombre, '')), '');

  -- --- Cuenta: se reutiliza si ya se importó con el mismo correo -------------
  select c.id into v_cuenta_id
  from public.cuentas c
  join public.credenciales_cuenta cr on cr.cuenta_id = c.id
  where cr.login_fingerprint = p_login_fingerprint
    and c.producto_plataforma_id = p_producto_id
    and c.archived_at is null
  limit 1;

  v_proveedor := coalesce(nullif(btrim(coalesce(p_proveedor_nombre, '')), ''), 'Yo');

  if v_cuenta_id is null then
    v_cuenta_id := public.crear_cuenta_con_unidades(
      p_producto_id, p_capacidad, p_alias, null,
      p_login_cifrado, p_login_fingerprint, p_contrasena_cifrada,
      null, null, v_proveedor);
    v_creada_cuenta := true;

    -- Ciclo del proveedor: se crea al nacer la cuenta madre si hay un COSTO o si
    -- hay una fecha de renovación del proveedor. Sin inversión (cortesía) el
    -- costo se guarda como 0, pero la próxima renovación queda registrada para
    -- que el aviso de «faltan X días» funcione.
    if p_prov_inicio is not null or (p_costo_usdt is not null and p_costo_usdt > 0) then
      v_ciclo_id := public.registrar_ciclo_proveedor(
        v_cuenta_id, coalesce(p_costo_usdt, 0),
        coalesce(p_prov_inicio, p_inicio, current_date), null, 'migración');

      -- Valorización a paralela solo si hubo un costo real (0 no se valoriza).
      if p_costo_usdt is not null and p_costo_usdt > 0 then
        select * into v_par from public.tasa_utilizable('paralela');
        if v_par.id is not null then
          update public.ciclos_proveedor
          set tasa_paralela_id   = v_par.id,
              costo_ves_snapshot = round(p_costo_usdt * v_par.bs_por_usd, 2)
          where id = v_ciclo_id;
        end if;
      end if;
    end if;
  end if;

  -- ==========================================================================
  -- VENTA DE CUENTA COMPLETA: una asignación que consume toda la capacidad.
  -- ==========================================================================
  if v_alcance = 'cuenta' then
    if v_nombre_cliente is null then
      return jsonb_build_object(
        'cuenta_id', v_cuenta_id, 'cuenta_creada', v_creada_cuenta,
        'ciclo_id', v_ciclo_id, 'vendida', false);
    end if;

    -- La cuenta no puede tener ya ventas activas (completa o de perfiles).
    if exists (
      select 1 from public.asignaciones_inventario a
      where a.cuenta_id = v_cuenta_id and a.fin is null
    ) then
      raise exception 'La cuenta ya tiene ventas activas: no se puede vender completa.';
    end if;

    v_cliente_id := public.importar_cliente(v_nombre_cliente, p_cliente_whatsapp);

    insert into public.suscripciones (
      cliente_id, producto_plataforma_id, modalidad_id, vendedor_origen_id, estado
    ) values (
      v_cliente_id, p_producto_id, p_modalidad_id, p_vendedor_id, 'activa'
    )
    returning id into v_suscripcion_id;

    insert into public.asignaciones_inventario (
      suscripcion_id, producto_plataforma_id, modalidad_id, alcance,
      cuenta_id, unidad_id, consume_capacidad,
      capacidad_fisica_snapshot, capacidad_vendible_consumida_snapshot, inicio
    ) values (
      v_suscripcion_id, p_producto_id, p_modalidad_id, 'cuenta',
      v_cuenta_id, null, true,
      p_capacidad, p_capacidad, coalesce(p_inicio, current_date)::timestamptz
    );

    insert into public.periodos_servicio (
      suscripcion_id, vendedor_id, tipo_operacion, sesion_carga_inicial_id,
      fecha_venta, inicio, fecha_renovacion, cantidad_periodos, estado_datos_financieros
    ) values (
      v_suscripcion_id, p_vendedor_id, 'carga_inicial', p_sesion_id,
      null, coalesce(p_inicio, current_date),
      coalesce(p_fecha_renovacion, coalesce(p_inicio, current_date) + 30),
      1, 'pendiente'
    )
    returning id into v_periodo_id;

    insert into public.historial_estado_suscripcion (
      suscripcion_id, estado_anterior, estado_nuevo, motivo, actor_id
    ) values (v_suscripcion_id, null, 'activa', 'carga_inicial', auth.uid());

    if p_monto_ves is not null and p_monto_ves > 0 then
      perform public.registrar_cobro_cliente(
        v_periodo_id, p_monto_ves, 'migración',
        coalesce(p_inicio, current_date)::timestamptz);
    end if;

    return jsonb_build_object(
      'cuenta_id', v_cuenta_id, 'cuenta_creada', v_creada_cuenta, 'ciclo_id', v_ciclo_id,
      'vendida', true, 'alcance', 'cuenta',
      'suscripcion_id', v_suscripcion_id, 'periodo_id', v_periodo_id,
      'cobrado', (p_monto_ves is not null and p_monto_ves > 0));
  end if;

  -- ==========================================================================
  -- VENTA POR PERFIL: se ocupa un slot concreto de la cuenta.
  -- ==========================================================================
  select id into v_unidad_id
  from public.unidades_inventario
  where cuenta_id = v_cuenta_id and numero_slot = p_numero_slot;

  if v_unidad_id is null then
    raise exception 'La cuenta no tiene un perfil %: revisa la capacidad.', p_numero_slot;
  end if;

  if nullif(btrim(coalesce(p_nombre_perfil, '')), '') is not null then
    update public.unidades_inventario
    set nombre_visible = btrim(p_nombre_perfil)
    where id = v_unidad_id;
  end if;

  if p_pin_cifrado is not null then
    insert into public.secretos_unidad (unidad_id, pin_cifrado)
    values (v_unidad_id, p_pin_cifrado)
    on conflict (unidad_id) do update
      set pin_cifrado = excluded.pin_cifrado, rotada_at = now();
  end if;

  -- Sin cliente la fila solo carga inventario: el perfil queda libre.
  if v_nombre_cliente is null then
    return jsonb_build_object(
      'cuenta_id', v_cuenta_id, 'unidad_id', v_unidad_id,
      'cuenta_creada', v_creada_cuenta, 'ciclo_id', v_ciclo_id, 'vendida', false);
  end if;

  if p_modalidad_id is null then
    raise exception 'Falta la modalidad para asignar el cliente.';
  end if;
  if exists (
    select 1 from public.asignaciones_inventario a
    where a.unidad_id = v_unidad_id and a.fin is null
  ) then
    raise exception 'El perfil % de esa cuenta ya está ocupado.', p_numero_slot;
  end if;

  v_cliente_id := public.importar_cliente(v_nombre_cliente, p_cliente_whatsapp);

  insert into public.suscripciones (
    cliente_id, producto_plataforma_id, modalidad_id, vendedor_origen_id, estado
  ) values (
    v_cliente_id, p_producto_id, p_modalidad_id, p_vendedor_id, 'activa'
  )
  returning id into v_suscripcion_id;

  insert into public.asignaciones_inventario (
    suscripcion_id, producto_plataforma_id, modalidad_id, alcance,
    cuenta_id, unidad_id, consume_capacidad,
    capacidad_fisica_snapshot, capacidad_vendible_consumida_snapshot, inicio
  ) values (
    v_suscripcion_id, p_producto_id, p_modalidad_id, 'unidad',
    v_cuenta_id, v_unidad_id, true,
    p_capacidad, 1, coalesce(p_inicio, current_date)::timestamptz
  );

  insert into public.periodos_servicio (
    suscripcion_id, vendedor_id, tipo_operacion, sesion_carga_inicial_id,
    fecha_venta, inicio, fecha_renovacion, cantidad_periodos, estado_datos_financieros
  ) values (
    v_suscripcion_id, p_vendedor_id, 'carga_inicial', p_sesion_id,
    null, coalesce(p_inicio, current_date),
    coalesce(p_fecha_renovacion, coalesce(p_inicio, current_date) + 30),
    1, 'pendiente'
  )
  returning id into v_periodo_id;

  insert into public.historial_estado_suscripcion (
    suscripcion_id, estado_anterior, estado_nuevo, motivo, actor_id
  ) values (v_suscripcion_id, null, 'activa', 'carga_inicial', auth.uid());

  if p_monto_ves is not null and p_monto_ves > 0 then
    perform public.registrar_cobro_cliente(
      v_periodo_id, p_monto_ves, 'migración',
      coalesce(p_inicio, current_date)::timestamptz);
  end if;

  return jsonb_build_object(
    'cuenta_id', v_cuenta_id, 'unidad_id', v_unidad_id,
    'cuenta_creada', v_creada_cuenta, 'ciclo_id', v_ciclo_id, 'vendida', true,
    'alcance', 'unidad',
    'suscripcion_id', v_suscripcion_id, 'periodo_id', v_periodo_id,
    'cobrado', (p_monto_ves is not null and p_monto_ves > 0));
end;
$$;

comment on function public.importar_servicio_existente is
  'Importa una fila del Excel de forma atómica. Según la modalidad, ocupa un '
  'perfil (alcance unidad) o vende la cuenta completa (alcance cuenta). El ciclo '
  'del proveedor se crea si hay costo O fecha de renovación (sin inversión, '
  'costo 0) para conservar el aviso de días.';
