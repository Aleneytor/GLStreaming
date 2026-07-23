-- ============================================================================
-- 0011 — Registro del ciclo de proveedor (costo y vencimiento)
-- ----------------------------------------------------------------------------
-- Fase 2: el asistente de alta debe registrar el "ciclo financiero cuando
-- corresponda" y calcular los avisos de renovación del proveedor.
--
-- ALCANCE DE ESTA FASE: se registra CUÁNTO cuesta el ciclo y CUÁNDO vence.
-- NO se registran pagos ni movimientos de Caja: eso es la Fase 4, donde el
-- pago se valoriza a tasa paralela y se separa el devengo del flujo de caja.
-- Por eso aquí `tasa_paralela_id` y `costo_ves_snapshot` quedan nulos: todavía
-- no hay integración de tasas (además el secreto de Kuanto sigue sin rotar).
--
-- El DÍA ANCLA es fijo y se recupera: ancla 31 baja a 28/29 en febrero pero
-- vuelve a 31 en marzo (DEC-26). La lógica equivalente en TypeScript está en
-- src/domain/fechas.ts (proximaRenovacionProveedor), con pruebas.
-- ============================================================================

create or replace function public.registrar_ciclo_proveedor(
  p_cuenta_id    uuid,
  p_costo_usdt   numeric,
  p_inicio       date default current_date,
  p_dia_ancla    integer default null,
  p_referencia   text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_ciclo_id uuid;
  v_proveedor_id uuid;
  v_nombre text;
  v_contacto text;
  v_ancla integer;
  v_anio integer;
  v_mes integer;
  v_ultimo_dia integer;
  v_proxima date;
  v_cap_fisica integer;
  v_cap_vendible integer;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede registrar ciclos.' using errcode = '42501';
  end if;

  if p_costo_usdt is null or p_costo_usdt < 0 then
    raise exception 'El costo debe ser cero o mayor.';  -- costo cero es válido
  end if;

  select c.proveedor_operativo_id, c.capacidad, c.capacidad_vendible_habilitada
    into v_proveedor_id, v_cap_fisica, v_cap_vendible
  from public.cuentas c
  where c.id = p_cuenta_id;

  if not found then
    raise exception 'Cuenta no encontrada.';
  end if;

  if v_proveedor_id is null then
    raise exception 'La cuenta no tiene proveedor asignado: indícalo antes de registrar el ciclo.';
  end if;

  select p.nombre_o_alias, p.telefono_original
    into v_nombre, v_contacto
  from public.proveedores p
  where p.id = v_proveedor_id;

  -- Ancla: la indicada o, por defecto, el día del inicio.
  v_ancla := coalesce(p_dia_ancla, extract(day from p_inicio)::integer);
  if v_ancla < 1 or v_ancla > 31 then
    raise exception 'El día de renovación debe estar entre 1 y 31.';
  end if;

  -- Próxima renovación: mes siguiente al inicio, recortada al último día válido
  -- del mes destino sin perder el ancla.
  v_anio := extract(year from (p_inicio + interval '1 month'))::integer;
  v_mes  := extract(month from (p_inicio + interval '1 month'))::integer;
  v_ultimo_dia := extract(day from (make_date(v_anio, v_mes, 1) + interval '1 month - 1 day'))::integer;
  v_proxima := make_date(v_anio, v_mes, least(v_ancla, v_ultimo_dia));

  -- Solo hay un ciclo vigente por cuenta: el anterior queda reemplazado.
  update public.ciclos_proveedor
  set estado = 'reemplazado'
  where cuenta_id = p_cuenta_id and estado = 'vigente';

  insert into public.ciclos_proveedor (
    cuenta_id, proveedor_id, proveedor_nombre_snapshot, proveedor_contacto_snapshot,
    inicio, proxima_renovacion, dia_ancla_proveedor,
    capacidad_fisica_snapshot, capacidad_vendible_snapshot,
    costo_usdt, estado, confirmado_at, referencia_no_sensible
  ) values (
    p_cuenta_id, v_proveedor_id, coalesce(v_nombre, 'Sin nombre'), v_contacto,
    p_inicio, v_proxima, v_ancla,
    v_cap_fisica, v_cap_vendible,
    p_costo_usdt, 'vigente', now(), nullif(btrim(coalesce(p_referencia, '')), '')
  )
  returning id into v_ciclo_id;

  return v_ciclo_id;
end;
$$;

comment on function public.registrar_ciclo_proveedor is
  'Registra el ciclo vigente de una cuenta: costo en USDT, inicio, día ancla y '
  'próxima renovación (ancla recuperable). No crea pagos: eso es la Fase 4.';

revoke execute on function public.registrar_ciclo_proveedor(uuid, numeric, date, integer, text) from public;
grant  execute on function public.registrar_ciclo_proveedor(uuid, numeric, date, integer, text) to authenticated;
