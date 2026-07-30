-- ============================================================================
-- 0053 — Clientes canónicos por nombre+teléfono y teléfono en vendedores
-- ----------------------------------------------------------------------------
-- Problemas detectados en operación real:
--   1) "Franklin" con mismo nombre y mismo teléfono podía terminar duplicado
--      como dos clientes distintos, porque la reutilización miraba solo nombre.
--   2) En Spotify familiar, si faltaba el nombre comercial del cliente, el
--      importador podía acabar creando un cliente cuyo "nombre" era su correo
--      de acceso. Ese correo es credencial, no identidad comercial.
--   3) El importador ya preserva metadatos del vendedor, pero no su teléfono.
--
-- Esta migración:
--   - añade teléfono a vendedores;
--   - centraliza la resolución de clientes en una función canónica;
--   - hace que ventas nuevas e importaciones usen esa función única.
-- ============================================================================

alter table public.vendedores
  add column if not exists telefono_original text,
  add column if not exists telefono_normalizado text;

comment on column public.vendedores.telefono_original is
  'WhatsApp o teléfono tal cual lo usa el negocio. Texto: preserva + y ceros.';
comment on column public.vendedores.telefono_normalizado is
  'Versión normalizada para búsquedas y conciliación de filas importadas.';

create or replace function public.resolver_cliente_canonico(
  p_nombre text,
  p_whatsapp text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_nombre text := nullif(btrim(coalesce(p_nombre, '')), '');
  v_whatsapp_original text := nullif(btrim(coalesce(p_whatsapp, '')), '');
  v_whatsapp_normalizado text := nullif(
    regexp_replace(coalesce(p_whatsapp, ''), '[^0-9+]', '', 'g'),
    ''
  );
  v_candidatos integer := 0;
begin
  if v_nombre is null then
    raise exception 'Indica el cliente.';
  end if;

  -- Caso ideal: nombre y teléfono coinciden exactamente.
  if v_whatsapp_normalizado is not null then
    select id into v_id
    from public.clientes
    where archived_at is null
      and lower(btrim(nombre)) = lower(v_nombre)
      and whatsapp_normalizado = v_whatsapp_normalizado
    order by created_at
    limit 1;

    -- Si antes existía solo por nombre y aún no tenía teléfono, se completa
    -- ese mismo registro en lugar de crear un duplicado.
    if v_id is null then
      select count(*), min(id)
      into v_candidatos, v_id
      from public.clientes
      where archived_at is null
        and lower(btrim(nombre)) = lower(v_nombre)
        and coalesce(whatsapp_normalizado, '') = '';

      if v_candidatos <> 1 then
        v_id := null;
      end if;
    end if;
  else
    -- Sin teléfono solo se reutiliza un nombre si es inequívoco y no arrastra
    -- un teléfono ajeno.
    select count(*), min(id)
    into v_candidatos, v_id
    from public.clientes
    where archived_at is null
      and lower(btrim(nombre)) = lower(v_nombre)
      and coalesce(whatsapp_normalizado, '') = '';

    if v_candidatos <> 1 then
      v_id := null;
    end if;
  end if;

  if v_id is null then
    insert into public.clientes (nombre, whatsapp_original, whatsapp_normalizado)
    values (v_nombre, v_whatsapp_original, v_whatsapp_normalizado)
    returning id into v_id;
  else
    update public.clientes
    set whatsapp_original = coalesce(whatsapp_original, v_whatsapp_original),
        whatsapp_normalizado = coalesce(whatsapp_normalizado, v_whatsapp_normalizado)
    where id = v_id;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.resolver_cliente_canonico(text, text) from public;
grant execute on function public.resolver_cliente_canonico(text, text) to authenticated;

comment on function public.resolver_cliente_canonico is
  'Resuelve el cliente comercial por nombre+teléfono. Con teléfono, exige la pareja exacta o completa un registro único sin teléfono; sin teléfono, solo reutiliza un nombre inequívoco.';

create or replace function public.importar_cliente(
  p_nombre text,
  p_whatsapp text
)
returns uuid
language plpgsql
set search_path = ''
as $$
begin
  return public.resolver_cliente_canonico(p_nombre, p_whatsapp);
end;
$$;

revoke execute on function public.importar_cliente(text, text) from public;
grant  execute on function public.importar_cliente(text, text) to authenticated;

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

  v_nombre_cliente := nullif(btrim(coalesce(p_cliente_nombre, '')), '');

  if p_cliente_id is not null then
    v_cliente_id := p_cliente_id;
    if not exists (select 1 from public.clientes where id = v_cliente_id) then
      raise exception 'Cliente no encontrado.';
    end if;
    select nombre into v_nombre_cliente from public.clientes where id = v_cliente_id;
  elsif v_nombre_cliente is not null then
    v_cliente_id := public.resolver_cliente_canonico(v_nombre_cliente, p_cliente_whatsapp);
  else
    raise exception 'Indica el cliente.';
  end if;

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
