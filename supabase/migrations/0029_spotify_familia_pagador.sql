-- ============================================================================
-- 0029 — La familia de Spotify también puede tener Gmail pagador
-- ----------------------------------------------------------------------------
-- Una familia que NO se vendió como individual sigue teniendo un pagador: si
-- el Premium sale de GPay propio, la hoja anota el Gmail que paga dentro de la
-- celda «Proveedor» (junto al rótulo «yo(gpay usa)»).
--
-- Antes solo el importador de INDIVIDUALES guardaba ese dato, así que en las
-- familias el correo del pagador acababa formando parte del NOMBRE del
-- proveedor —un texto pegado, inútil para consultarlo después—. Ahora se
-- guarda donde corresponde: `controles_pago_spotify`, que es una referencia y
-- NUNCA almacena la contraseña de ese Gmail ni datos de tarjeta (`DEC-84`).
--
-- La tabla ya lo permitía: su clave es la cobertura, sea individual o familiar.
-- ============================================================================

drop function if exists public.importar_spotify_familiar(
  uuid, uuid, integer, text, text, text, text, text, text, text, integer, uuid, text, text,
  date, date, numeric, uuid, numeric, text, date);

create or replace function public.importar_spotify_familiar(
  p_sesion_id           uuid,
  p_producto_id         uuid,
  p_capacidad           integer,
  -- Cuenta madre (da el Premium)
  p_madre_login_cifrado      text,
  p_madre_login_fingerprint  text,
  p_madre_contrasena_cifrada text,
  -- Identidad del miembro (con la que entra el cliente)
  p_miembro_login_cifrado      text default null,
  p_miembro_login_fingerprint  text default null,
  p_miembro_contrasena_cifrada text default null,
  p_miembro_tipo_correo        text default 'gmail_propio',
  p_numero_slot         integer default 1,
  p_modalidad_id        uuid default null,
  p_cliente_nombre      text default null,
  p_cliente_whatsapp    text default null,
  p_inicio              date default null,
  p_fecha_renovacion    date default null,
  p_monto_ves           numeric default null,
  p_vendedor_id         uuid default null,
  p_costo_usdt          numeric default null,
  p_proveedor_nombre    text default null,
  p_prov_inicio         date default null,
  -- Gmail que paga la familia por GPay (solo referencia)
  p_gmail_pagador_cifrado     text default null,
  p_gmail_pagador_fingerprint text default null,
  p_origen_gpay               text default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_cuenta_id      uuid;
  v_unidad_id      uuid;
  v_identidad_id   uuid;
  v_cliente_id     uuid;
  v_suscripcion_id uuid;
  v_periodo_id     uuid;
  v_ciclo_id       uuid;
  v_par            public.tasas_cambio;
  v_nombre_cliente text;
  v_creada_cuenta  boolean := false;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede importar.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.sesiones_carga_inicial
    where id = p_sesion_id and estado = 'abierta'
  ) then
    raise exception 'No hay una sesión de carga abierta.';
  end if;

  v_nombre_cliente := nullif(btrim(coalesce(p_cliente_nombre, '')), '');

  -- --- La cuenta madre: se reutiliza por la huella de su correo -------------
  select c.id into v_cuenta_id
  from public.cuentas c
  join public.credenciales_cuenta cr on cr.cuenta_id = c.id
  where cr.login_fingerprint = p_madre_login_fingerprint
    and c.producto_plataforma_id = p_producto_id
    and c.archived_at is null
  limit 1;

  if v_cuenta_id is null then
    v_cuenta_id := public.crear_cuenta_con_unidades(
      p_producto_id, p_capacidad, null, null,
      p_madre_login_cifrado, p_madre_login_fingerprint, p_madre_contrasena_cifrada,
      null, null,
      coalesce(nullif(btrim(coalesce(p_proveedor_nombre, '')), ''), 'Yo'));
    v_creada_cuenta := true;

    insert into public.coberturas_spotify (cuenta_id, tipo, identidad_madre_id, estado_admision)
    values (
      v_cuenta_id, 'familiar',
      public.identidad_spotify_por_huella(
        p_madre_login_cifrado, p_madre_login_fingerprint, p_madre_contrasena_cifrada, 'dominio_gl'),
      'abierta')
    on conflict (cuenta_id) do nothing;

    -- El Gmail que paga la familia: referencia, nunca su contraseña.
    if p_gmail_pagador_fingerprint is not null then
      insert into public.controles_pago_spotify (
        cobertura_cuenta_id, gmail_cifrado, gmail_fingerprint, origen
      ) values (
        v_cuenta_id, p_gmail_pagador_cifrado, p_gmail_pagador_fingerprint, p_origen_gpay
      )
      on conflict (gmail_fingerprint) do nothing;
    end if;

    if p_costo_usdt is not null and p_costo_usdt > 0 then
      v_ciclo_id := public.registrar_ciclo_proveedor(
        v_cuenta_id, p_costo_usdt,
        coalesce(p_prov_inicio, p_inicio, current_date), null, 'migración');
      select * into v_par from public.tasa_utilizable('paralela');
      if v_par.id is not null then
        update public.ciclos_proveedor
        set tasa_paralela_id = v_par.id,
            costo_ves_snapshot = round(p_costo_usdt * v_par.bs_por_usd, 2)
        where id = v_ciclo_id;
      end if;
    end if;
  end if;

  -- --- El cupo de miembro ----------------------------------------------------
  select id into v_unidad_id
  from public.unidades_inventario
  where cuenta_id = v_cuenta_id and numero_slot = p_numero_slot;

  if v_unidad_id is null then
    raise exception 'La familia no tiene un cupo %: revisa la capacidad.', p_numero_slot;
  end if;

  if v_nombre_cliente is null then
    return jsonb_build_object(
      'cuenta_id', v_cuenta_id, 'unidad_id', v_unidad_id,
      'cuenta_creada', v_creada_cuenta, 'ciclo_id', v_ciclo_id, 'vendida', false);
  end if;

  if p_modalidad_id is null then
    raise exception 'Falta la modalidad para asignar el miembro.';
  end if;
  if exists (
    select 1 from public.asignaciones_inventario a
    where a.unidad_id = v_unidad_id and a.fin is null
  ) then
    raise exception 'El cupo % de esa familia ya está ocupado.', p_numero_slot;
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

  if p_miembro_login_fingerprint is not null then
    v_identidad_id := public.identidad_spotify_por_huella(
      p_miembro_login_cifrado, p_miembro_login_fingerprint,
      p_miembro_contrasena_cifrada, p_miembro_tipo_correo);

    insert into public.vinculos_identidad_spotify (suscripcion_id, identidad_spotify_id)
    values (v_suscripcion_id, v_identidad_id);
  end if;

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
    'cuenta_id', v_cuenta_id, 'unidad_id', v_unidad_id, 'identidad_id', v_identidad_id,
    'cuenta_creada', v_creada_cuenta, 'ciclo_id', v_ciclo_id, 'vendida', true,
    'alcance', 'unidad', 'suscripcion_id', v_suscripcion_id, 'periodo_id', v_periodo_id,
    'cobrado', (p_monto_ves is not null and p_monto_ves > 0));
end;
$$;

comment on function public.importar_spotify_familiar is
  'Importa un miembro de una familia Spotify: crea la cuenta madre, su '
  'cobertura y (si paga por GPay) su Gmail pagador la primera vez; ocupa un '
  'cupo y enlaza la identidad propia del miembro.';

revoke execute on function public.importar_spotify_familiar(
  uuid, uuid, integer, text, text, text, text, text, text, text, integer, uuid, text, text,
  date, date, numeric, uuid, numeric, text, date, text, text, text) from public;
grant  execute on function public.importar_spotify_familiar(
  uuid, uuid, integer, text, text, text, text, text, text, text, integer, uuid, text, text,
  date, date, numeric, uuid, numeric, text, date, text, text, text) to authenticated;
