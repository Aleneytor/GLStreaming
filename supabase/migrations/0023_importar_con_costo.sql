-- ============================================================================
-- 0023 — Importar también el costo del proveedor (columnas Inversión/Proveedor)
-- ----------------------------------------------------------------------------
-- El Excel del negocio trae, por cuenta, cuánto se le paga al proveedor
-- ("Inversión", en divisas) y a quién ("Proveedor", p. ej. @CapyVentas). Sin
-- ese costo la app conoce el ingreso pero no el margen. Aquí se registra el
-- ciclo de proveedor durante la importación.
--
-- El COSTO ES POR CUENTA MADRE, no por perfil: solo se registra cuando la fila
-- CREA la cuenta (la primera de cada correo). Las demás filas de la misma
-- cuenta no vuelven a sumar costo.
--
-- Valorización a PARALELA (no BCV): los egresos nacen en USDT y se valorizan
-- con la tasa paralela (docs/01-alcance-y-reglas.md §7). Se fija el snapshot en
-- Bs al crear el ciclo para que el margen se pueda leer en bolívares; si no hay
-- paralela utilizable, el costo queda solo en USDT (el margen en Bs se completa
-- cuando se registre un pago con tasa).
--
-- No se registra PAGO (Caja): en la migración no se inventan salidas de caja en
-- fechas arbitrarias. El costo se devenga; los pagos reales se registran cuando
-- toque renovar con el proveedor.
-- ============================================================================

-- La versión de 0022 (17 argumentos) se reemplaza por una con costo/proveedor.
drop function if exists public.importar_servicio_existente(
  uuid, uuid, integer, text, text, text, text, integer, text, text, uuid, text, text,
  date, date, numeric, uuid);

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
  p_proveedor_nombre   text default null
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

    -- Costo del proveedor: solo al crear la cuenta madre y si hay un importe.
    if p_costo_usdt is not null and p_costo_usdt > 0 then
      v_ciclo_id := public.registrar_ciclo_proveedor(
        v_cuenta_id, p_costo_usdt,
        coalesce(p_inicio, current_date), null, 'migración');

      -- Valorización a paralela para poder leer el margen en bolívares.
      select * into v_par from public.tasa_utilizable('paralela');
      if v_par.id is not null then
        update public.ciclos_proveedor
        set tasa_paralela_id   = v_par.id,
            costo_ves_snapshot = round(p_costo_usdt * v_par.bs_por_usd, 2)
        where id = v_ciclo_id;
      end if;
    end if;
  end if;

  -- --- Unidad (perfil) -------------------------------------------------------
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
  v_nombre_cliente := nullif(btrim(coalesce(p_cliente_nombre, '')), '');
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

  -- --- Cliente: se reutiliza por nombre, o se crea ----------------------------
  select id into v_cliente_id
  from public.clientes
  where lower(nombre) = lower(v_nombre_cliente) and archived_at is null
  limit 1;

  if v_cliente_id is null then
    insert into public.clientes (nombre, whatsapp_original, whatsapp_normalizado)
    values (
      v_nombre_cliente,
      nullif(btrim(coalesce(p_cliente_whatsapp, '')), ''),
      nullif(regexp_replace(coalesce(p_cliente_whatsapp, ''), '[^0-9+]', '', 'g'), ''))
    returning id into v_cliente_id;
  elsif nullif(btrim(coalesce(p_cliente_whatsapp, '')), '') is not null then
    update public.clientes
    set whatsapp_original = coalesce(whatsapp_original, btrim(p_cliente_whatsapp)),
        whatsapp_normalizado = coalesce(
          whatsapp_normalizado,
          nullif(regexp_replace(p_cliente_whatsapp, '[^0-9+]', '', 'g'), ''))
    where id = v_cliente_id;
  end if;

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

  -- `fecha_venta` nula a propósito: una carga inicial no es una venta del día.
  insert into public.periodos_servicio (
    suscripcion_id, vendedor_id, tipo_operacion, sesion_carga_inicial_id,
    fecha_venta, inicio, fecha_renovacion, cantidad_periodos,
    estado_datos_financieros
  ) values (
    v_suscripcion_id, p_vendedor_id, 'carga_inicial', p_sesion_id,
    null,
    coalesce(p_inicio, current_date),
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
    'suscripcion_id', v_suscripcion_id, 'periodo_id', v_periodo_id,
    'cobrado', (p_monto_ves is not null and p_monto_ves > 0));
end;
$$;

comment on function public.importar_servicio_existente is
  'Importa una fila del Excel de forma atómica: cuenta (reutilizada por huella '
  'del correo, con su costo de proveedor la primera vez), perfil, cliente, '
  'período de carga inicial y cobro opcional. Exige una sesión de carga abierta.';

revoke execute on function public.importar_servicio_existente(
  uuid, uuid, integer, text, text, text, text, integer, text, text, uuid, text, text,
  date, date, numeric, uuid, numeric, text) from public;
grant execute on function public.importar_servicio_existente(
  uuid, uuid, integer, text, text, text, text, integer, text, text, uuid, text, text,
  date, date, numeric, uuid, numeric, text) to authenticated;
