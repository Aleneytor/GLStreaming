-- ============================================================================
-- 0060 — Endurecer seguridad de funciones definer (search_path estricto)
-- ----------------------------------------------------------------------------
-- Capa: núcleo transaccional (ventas) + finanzas privadas del administrador.
--
-- Regla que implementa (convención del proyecto, ver docs/03-arquitectura-y-seguridad):
--   toda función `security definer` debe ejecutar con `search_path = ''` y
--   nombres totalmente calificados (`public.*`, `auth.uid()`), para que ningún
--   objeto con nombre genérico pueda secuestrar el path (escalamiento clásico
--   de privilegios).
--
-- Problemas corregidos:
--   1) vender_unidad (0053) quedó con `set search_path = public`, apartándose
--      del estándar del proyecto. Además traía un UUID de modalidad quemado
--      como default ('1111...1101'): si la resolución dinámica del frontend
--      fallaba, se intentaba esa modalidad inexistente en otra plataforma y el
--      error salía confuso ("modalidad no permitida") en vez de uno claro.
--   2) editar_gasto_personal y eliminar_gasto_personal (0059) también usaban
--      `set search_path = public`.
--
-- Esta migración NO cambia firmas ni lógica: re-escribe las mismas funciones
-- con search_path vacío. El cuerpo ya calificaba todo (public.*, auth.uid()),
-- así que el cambio es mecánico. Los cuerpos se copian tal cual.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. vender_unidad: search_path='' + p_modalidad_id sin UUID quemado.
--    El default del UUID quemado pasa a null. No se puede quitar el default
--    por completo: Postgres (42P13) exige que todo parámetro posterior a uno
--    con default tenga default (p_unidad_id lo tiene), y reordenar la firma
--    rompería las llamadas posicionales históricas. Con default null, omitir
--    la modalidad la deja en null y el guard existente lanza
--    "Faltan la cuenta o la modalidad." en vez de intentar un UUID inexistente.
--    La firma en tipos no cambia; los llamadores internos (0045, 0057), las
--    suites SQL y el frontend ya pasan p_modalidad_id explícitamente.
-- ----------------------------------------------------------------------------
create or replace function public.vender_unidad(
  p_cuenta_id           uuid,
  p_unidad_id           uuid default null,
  p_modalidad_id        uuid default null,
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

-- ----------------------------------------------------------------------------
-- 2. Gastos personales (0059): search_path=''.
-- ----------------------------------------------------------------------------
create or replace function public.editar_gasto_personal(
  p_gasto_id uuid,
  p_fecha_gasto date,
  p_concepto text,
  p_descripcion text,
  p_nota text,
  p_moneda_original text,
  p_monto_original numeric,
  p_tasa_tipo text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gasto public.gastos_personales%rowtype;
  v_tasa public.tasas_cambio;
  v_monto_usd numeric(12,2);
  v_monto_ves numeric(14,2);
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  if p_gasto_id is null then
    raise exception 'Falta el gasto.';
  end if;

  if p_fecha_gasto is null then
    raise exception 'Falta la fecha del gasto.';
  end if;

  if coalesce(btrim(p_concepto), '') = '' then
    raise exception 'Falta el concepto.';
  end if;

  if p_moneda_original not in ('usd', 'ves') then
    raise exception 'Moneda inválida.';
  end if;

  if p_tasa_tipo not in ('bcv', 'paralela') then
    raise exception 'Tipo de tasa inválido.';
  end if;

  if p_monto_original is null or p_monto_original <= 0 then
    raise exception 'El monto debe ser mayor que cero.';
  end if;

  select *
    into v_gasto
  from public.gastos_personales
  where id = p_gasto_id;

  if not found then
    raise exception 'No existe el gasto personal indicado.';
  end if;

  select *
    into v_tasa
  from public.tasa_utilizable(p_tasa_tipo);

  if p_moneda_original = 'usd' then
    v_monto_usd := round(p_monto_original, 2);
    v_monto_ves := round(p_monto_original * v_tasa.bs_por_usd, 2);
  else
    v_monto_ves := round(p_monto_original, 2);
    v_monto_usd := round(p_monto_original / nullif(v_tasa.bs_por_usd, 0), 2);
  end if;

  update public.gastos_personales
  set
    fecha_gasto = p_fecha_gasto,
    concepto = btrim(p_concepto),
    descripcion = nullif(btrim(coalesce(p_descripcion, '')), ''),
    nota = nullif(btrim(coalesce(p_nota, '')), ''),
    moneda_original = p_moneda_original,
    monto_original = round(p_monto_original, 2),
    tasa_tipo = p_tasa_tipo,
    tasa_id = v_tasa.id,
    tasa_bs_por_usd_snapshot = v_tasa.bs_por_usd,
    monto_usd = v_monto_usd,
    monto_ves = v_monto_ves
  where id = p_gasto_id;

  return p_gasto_id;
end;
$$;

grant execute on function public.editar_gasto_personal(
  uuid, date, text, text, text, text, numeric, text
) to authenticated;

create or replace function public.eliminar_gasto_personal(
  p_gasto_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  if p_gasto_id is null then
    raise exception 'Falta el gasto.';
  end if;

  delete from public.gastos_personales
  where id = p_gasto_id;

  if not found then
    raise exception 'No existe el gasto personal indicado.';
  end if;
end;
$$;

grant execute on function public.eliminar_gasto_personal(uuid) to authenticated;

commit;
