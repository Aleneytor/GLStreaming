-- ============================================================================
-- 0028 — Importar Spotify: familias (madre + miembros) e individuales
-- ----------------------------------------------------------------------------
-- Spotify no encaja en el importador general porque tiene DOS capas separadas
-- (docs/plataformas/spotify.md):
--
--   COBERTURA  = de dónde sale el Premium. Puede ser una familia (una cuenta
--                madre con 5 cupos de miembro) o un individual, y este último
--                se activa con GPay propio o lo da un proveedor externo.
--   IDENTIDAD  = el login/biblioteca con el que ENTRA el cliente. En una
--                familia cada miembro tiene el SUYO propio; en un individual
--                la identidad es la cuenta misma.
--
-- Por eso una fila de familia trae dos pares de credenciales: las de la madre
-- (columnas Correo/Contraseña) y las del miembro (Correo Cliente/Clave
-- Cliente). El importador general solo sabe de una.
--
-- VENDER EL USO DE LA MADRE: una familia admite hasta SEIS ventas — los cinco
-- miembros más el uso de la propia cuenta madre, que el cliente usa con el
-- login de la madre. Esa sexta venta NO consume un cupo de miembro, así que se
-- registra con alcance `principal` y `consume_capacidad = false`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- identidad_spotify_por_huella — reutiliza la identidad o la crea
-- ----------------------------------------------------------------------------
create or replace function public.identidad_spotify_por_huella(
  p_login_cifrado      text,
  p_login_fingerprint  text,
  p_contrasena_cifrada text,
  p_tipo_correo        text default 'gmail_propio'
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.identidades_spotify
  where login_fingerprint = p_login_fingerprint
    and archived_at is null
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.identidades_spotify (
    titular_tipo, tipo_correo, login_cifrado, login_fingerprint, contrasena_cifrada, estado
  ) values (
    'negocio', p_tipo_correo, p_login_cifrado, p_login_fingerprint, p_contrasena_cifrada, 'activa'
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.identidad_spotify_por_huella is
  'Devuelve la identidad de Spotify con esa huella de correo, o la crea. La '
  'huella permite reconocerla sin guardar el correo en claro.';

-- ----------------------------------------------------------------------------
-- importar_spotify_familiar — UNA FILA = UN MIEMBRO de la familia
-- ----------------------------------------------------------------------------
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
  p_prov_inicio         date default null
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

    -- La cobertura dice CÓMO aporta Premium esta cuenta: aquí, una familia.
    -- La identidad de la madre se guarda para poder vender su uso después.
    insert into public.coberturas_spotify (cuenta_id, tipo, identidad_madre_id, estado_admision)
    values (
      v_cuenta_id, 'familiar',
      public.identidad_spotify_por_huella(
        p_madre_login_cifrado, p_madre_login_fingerprint, p_madre_contrasena_cifrada, 'dominio_gl'),
      'abierta')
    on conflict (cuenta_id) do nothing;

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

  -- Sin cliente, la fila solo deja la familia creada con sus cupos libres.
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

  -- La identidad propia del miembro: con ella entra a Spotify.
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
  'Importa un miembro de una familia Spotify: crea la cuenta madre y su '
  'cobertura la primera vez, ocupa un cupo y enlaza la identidad propia del '
  'miembro (el login con el que entra).';

-- ----------------------------------------------------------------------------
-- importar_spotify_individual — individual, o venta del USO DE LA MADRE
-- ----------------------------------------------------------------------------
create or replace function public.importar_spotify_individual(
  p_sesion_id          uuid,
  p_producto_id        uuid,   -- spotify-individual
  p_login_cifrado      text,
  p_login_fingerprint  text,
  p_contrasena_cifrada text,
  p_modalidad_id       uuid default null,   -- «Individual»
  p_cobertura_tipo     text default 'individual_proveedor',
  p_gmail_pagador_cifrado     text default null,
  p_gmail_pagador_fingerprint text default null,
  p_origen_gpay        text default null,   -- gpay_usa | gpay_nigeria
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
  v_identidad_id   uuid;
  v_cliente_id     uuid;
  v_suscripcion_id uuid;
  v_periodo_id     uuid;
  v_ciclo_id       uuid;
  v_par            public.tasas_cambio;
  v_nombre_cliente text;
  v_modalidad_id   uuid := p_modalidad_id;
  v_alcance        text := 'cuenta';
  v_consume        boolean := true;
  v_capacidad      integer := 1;
  v_creada_cuenta  boolean := false;
  v_es_madre       boolean := false;
  v_familia        record;
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

  -- ¿Este correo es en realidad una FAMILIA ya importada? Entonces no es un
  -- individual nuevo: es la venta del USO DE LA MADRE de esa familia. El
  -- cliente entra con el login de la madre y no gasta un cupo de miembro.
  select c.id, c.capacidad, pp.id as producto_id
    into v_familia
  from public.cuentas c
  join public.credenciales_cuenta cr    on cr.cuenta_id = c.id
  join public.productos_plataforma pp   on pp.id = c.producto_plataforma_id
  where cr.login_fingerprint = p_login_fingerprint
    and pp.codigo = 'spotify-familiar'
    and c.archived_at is null
  limit 1;

  if found then
    v_es_madre  := true;
    v_cuenta_id := v_familia.id;
    v_capacidad := v_familia.capacidad;
    v_alcance   := 'principal';
    v_consume   := false;   -- el uso de la madre NO ocupa un cupo de miembro

    select m.id into v_modalidad_id
    from public.modalidades m
    join public.producto_modalidades pm on pm.modalidad_id = m.id
    where pm.producto_plataforma_id = v_familia.producto_id
      and m.alcance_asignacion = 'principal' and pm.activa
    limit 1;

    if v_modalidad_id is null then
      raise exception 'La familia no tiene modalidad de uso de la madre.';
    end if;

    if exists (
      select 1 from public.asignaciones_inventario a
      where a.cuenta_id = v_cuenta_id and a.fin is null and a.alcance = 'principal'
    ) then
      raise exception 'El uso de la madre de esa familia ya está vendido.';
    end if;
  else
    -- --- Individual de verdad: su propia cuenta y su cobertura --------------
    select c.id into v_cuenta_id
    from public.cuentas c
    join public.credenciales_cuenta cr on cr.cuenta_id = c.id
    where cr.login_fingerprint = p_login_fingerprint
      and c.producto_plataforma_id = p_producto_id
      and c.archived_at is null
    limit 1;

    if v_cuenta_id is null then
      v_cuenta_id := public.crear_cuenta_con_unidades(
        p_producto_id, 1, null, null,
        p_login_cifrado, p_login_fingerprint, p_contrasena_cifrada,
        null, null,
        coalesce(nullif(btrim(coalesce(p_proveedor_nombre, '')), ''), 'Yo'));
      v_creada_cuenta := true;

      insert into public.coberturas_spotify (cuenta_id, tipo)
      values (v_cuenta_id, coalesce(p_cobertura_tipo, 'individual_proveedor'))
      on conflict (cuenta_id) do nothing;

      -- El Gmail que paga por GPay se guarda SOLO como referencia: nunca su
      -- contraseña ni datos de tarjeta (DEC-84: un Gmail no financia dos).
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

    if exists (
      select 1 from public.asignaciones_inventario a
      where a.cuenta_id = v_cuenta_id and a.fin is null
    ) then
      raise exception 'Esa cuenta individual ya está vendida.';
    end if;
  end if;

  -- Sin cliente, queda el inventario cargado y nada vendido.
  if v_nombre_cliente is null then
    return jsonb_build_object(
      'cuenta_id', v_cuenta_id, 'cuenta_creada', v_creada_cuenta,
      'ciclo_id', v_ciclo_id, 'es_uso_madre', v_es_madre, 'vendida', false);
  end if;

  v_cliente_id := public.importar_cliente(v_nombre_cliente, p_cliente_whatsapp);

  insert into public.suscripciones (
    cliente_id, producto_plataforma_id, modalidad_id, vendedor_origen_id, estado
  )
  select v_cliente_id, c.producto_plataforma_id, v_modalidad_id, p_vendedor_id, 'activa'
  from public.cuentas c where c.id = v_cuenta_id
  returning id into v_suscripcion_id;

  insert into public.asignaciones_inventario (
    suscripcion_id, producto_plataforma_id, modalidad_id, alcance,
    cuenta_id, unidad_id, consume_capacidad,
    capacidad_fisica_snapshot, capacidad_vendible_consumida_snapshot, inicio
  )
  select v_suscripcion_id, c.producto_plataforma_id, v_modalidad_id, v_alcance,
         v_cuenta_id, null, v_consume,
         v_capacidad, case when v_consume then v_capacidad else 0 end,
         coalesce(p_inicio, current_date)::timestamptz
  from public.cuentas c where c.id = v_cuenta_id;

  -- La identidad con la que entra: su propio login (o el de la madre).
  v_identidad_id := public.identidad_spotify_por_huella(
    p_login_cifrado, p_login_fingerprint, p_contrasena_cifrada, 'gmail_propio');
  insert into public.vinculos_identidad_spotify (suscripcion_id, identidad_spotify_id)
  values (v_suscripcion_id, v_identidad_id);

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
    'cuenta_id', v_cuenta_id, 'identidad_id', v_identidad_id,
    'cuenta_creada', v_creada_cuenta, 'ciclo_id', v_ciclo_id,
    'es_uso_madre', v_es_madre, 'vendida', true, 'alcance', v_alcance,
    'suscripcion_id', v_suscripcion_id, 'periodo_id', v_periodo_id,
    'cobrado', (p_monto_ves is not null and p_monto_ves > 0));
end;
$$;

comment on function public.importar_spotify_individual is
  'Importa un Spotify individual (GPay propio o proveedor externo). Si el '
  'correo resulta ser una familia ya importada, no duplica la cuenta: registra '
  'la venta del USO DE LA MADRE, que no consume cupo de miembro.';

-- ============================================================================
-- Permisos
-- ============================================================================
revoke execute on function public.identidad_spotify_por_huella(text, text, text, text) from public;
grant  execute on function public.identidad_spotify_por_huella(text, text, text, text) to authenticated;
revoke execute on function public.importar_spotify_familiar(
  uuid, uuid, integer, text, text, text, text, text, text, text, integer, uuid, text, text,
  date, date, numeric, uuid, numeric, text, date) from public;
grant  execute on function public.importar_spotify_familiar(
  uuid, uuid, integer, text, text, text, text, text, text, text, integer, uuid, text, text,
  date, date, numeric, uuid, numeric, text, date) to authenticated;
revoke execute on function public.importar_spotify_individual(
  uuid, uuid, text, text, text, uuid, text, text, text, text, text, text,
  date, date, numeric, uuid, numeric, text, date) from public;
grant  execute on function public.importar_spotify_individual(
  uuid, uuid, text, text, text, uuid, text, text, text, text, text, text,
  date, date, numeric, uuid, numeric, text, date) to authenticated;
