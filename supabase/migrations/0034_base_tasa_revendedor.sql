-- ============================================================================
-- 0034 — Base de tasa por revendedor: BCV (directa) o Paralela (revendedor)
-- ----------------------------------------------------------------------------
-- Situación de negocio (confirmada por el dueño, 2026-07-27):
--   · Sus ventas DIRECTAS se cobran a tasa BCV.
--   · Algunos REVENDEDORES cobran a tasa PARALELA (el cliente les paga los
--     bolívares calculados a paralela).
--   · Los egresos ya se valorizan a paralela.
--
-- El motor financiero (0019) ya lee el ingreso económico a paralela
-- (`monto_ves / paralela`), así que la GANANCIA ya sale correcta con solo
-- registrar los bolívares reales. Lo que faltaba era la ergonomía de ENTRADA:
--   1. Al ingresar en USD, convertir a Bs con la tasa correcta (BCV o paralela).
--   2. Que el `precio_comercial_usd` (la columna «Ingreso») muestre el número
--      real: para un revendedor-paralela, `Bs / paralela`, no `Bs / BCV`.
--
-- La base la decide una marca del REVENDEDOR de la suscripción
-- (`vendedores.cobra_en_paralela`), leída vía `suscripciones.vendedor_origen_id`.
-- Así toda venta Y toda renovación de ese revendedor heredan la base sola, sin
-- que el operador tenga que elegir nada. Venta directa (sin revendedor) o
-- revendedor sin la marca → BCV, como siempre.
--
-- La lectura económica NO cambia: sigue siendo `monto_ves / paralela`. Ambas
-- tasas se siguen congelando en el cobro.
-- ============================================================================

alter table public.vendedores
  add column if not exists cobra_en_paralela boolean not null default false;

comment on column public.vendedores.cobra_en_paralela is
  'Si true, las ventas/renovaciones de este revendedor se cobran a tasa '
  'PARALELA: el USD se deriva y se convierte desde USD con la paralela '
  'congelada, no con BCV. Ventas directas y revendedores sin la marca van a BCV.';

-- ----------------------------------------------------------------------------
-- registrar_cobro_cliente — la base de tasa depende del revendedor
-- ----------------------------------------------------------------------------
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
  v_base_paralela boolean;
  v_tasa_base numeric;
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
  -- Se resuelven ANTES de validar el monto porque, si el cobro se indicó en
  -- dólares, hace falta la tasa base para traducirlo a bolívares.
  if v_periodo.tasa_bcv_id is not null then
    select * into v_bcv from public.tasas_cambio where id = v_periodo.tasa_bcv_id;
  else
    select * into v_bcv from public.tasa_utilizable('bcv');
    if v_bcv.id is null then
      raise exception
        'No hay una tasa BCV confirmada en las últimas 24 h. Actualízala antes de cobrar.';
    end if;
  end if;

  if v_periodo.tasa_paralela_id is not null then
    select * into v_paralela from public.tasas_cambio where id = v_periodo.tasa_paralela_id;
  else
    select * into v_paralela from public.tasa_utilizable('paralela');
  end if;

  -- Base de tasa: la marca del revendedor de la suscripción. La suscripción
  -- (no el período) es la que guarda al revendedor, así la base se hereda en
  -- cada renovación sin depender de que el período traiga el vendedor.
  select coalesce(v.cobra_en_paralela, false) into v_base_paralela
  from public.suscripciones s
  left join public.vendedores v on v.id = s.vendedor_origen_id
  where s.id = v_periodo.suscripcion_id;

  if coalesce(v_base_paralela, false) then
    -- Cobro a paralela: aquí la paralela NO es opcional, se usa para el dinero.
    if v_paralela.id is null then
      raise exception
        'Este cobro es a tasa paralela (revendedor) pero no hay una paralela confirmada. Actualízala antes de cobrar.';
    end if;
    v_tasa_base := v_paralela.bs_por_usd;
  else
    v_tasa_base := v_bcv.bs_por_usd;
  end if;

  -- Entrada en USD: se convierte a bolívares con la tasa base (paralela para el
  -- revendedor marcado, BCV en directa). El bolívar resultante es el hecho.
  if p_monto_usd is not null and p_monto_usd > 0 then
    if p_monto_ves is not null then
      raise exception 'Indica el cobro en una sola moneda: bolívares o dólares, no ambos.';
    end if;
    p_monto_ves := round(p_monto_usd * v_tasa_base, 2);
  end if;

  if p_monto_ves is null or p_monto_ves <= 0 then
    raise exception 'Indica cuánto recibiste (en bolívares o en dólares).';
  end if;

  -- El USD comercial se deriva a la MISMA base: para un revendedor-paralela,
  -- `Bs / paralela` (el valor real); en directa, `Bs / BCV`.
  v_precio := round(p_monto_ves / v_tasa_base, 2);

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
      'base_tasa', case when coalesce(v_base_paralela, false) then 'paralela' else 'bcv' end,
      'usd_indicado', p_monto_usd, 'usd_derivado', v_precio,
      'bcv', v_bcv.bs_por_usd, 'paralela', v_paralela.bs_por_usd)
  );

  return v_pago_id;
end;
$$;

comment on function public.registrar_cobro_cliente is
  'Registra el dinero recibido por un período y congela BCV y paralela. La base '
  'de tasa la decide el revendedor de la suscripción (vendedores.cobra_en_paralela): '
  'paralela para revendedores marcados, BCV en directa. Se puede indicar en Bs '
  '(p_monto_ves) o en USD (p_monto_usd); el bolívar es el hecho que se guarda.';
