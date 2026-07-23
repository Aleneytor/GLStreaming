-- ============================================================================
-- 0019 — Motor financiero: devengo, resultado diario y cierre mensual (Fase 4)
-- ----------------------------------------------------------------------------
-- El corazón del cierre. UNA sola función, `resumen_financiero(inicio, fin)`,
-- calcula todo para cualquier rango semiabierto [inicio, fin). El día y el mes
-- usan exactamente el mismo motor, así que la regla de reconciliación
--     suma(resultado_diario_ves del mes) = resultado_del_cierre_mensual_ves
-- se cumple POR CONSTRUCCIÓN y no por una segunda implementación que hay que
-- mantener sincronizada.
--
-- PRORRATEO (docs/01-alcance-y-reglas.md §7): ni el precio del cliente ni el
-- costo del proveedor pertenecen al mes en que se cobraron, sino a los días en
-- que realmente se prestó el servicio.
--     dias_periodo  = fecha_renovacion - inicio
--     dias_en_rango = dias(interseccion(periodo, rango))
--     devengado     = monto * dias_en_rango / dias_periodo
--
-- CADA CIFRA USA SUS PROPIAS TASAS CONGELADAS. Nunca se revaloriza el pasado
-- con la publicación de hoy: por eso el ingreso económico divide entre la
-- paralela guardada en el cobro, no entre la paralela actual.
--
-- LÍMITE CONOCIDO DE ESTA REBANADA: la ocupación se reporta como capacidad,
-- ocupada, pagada y ociosa. El desglose fino de los días ocupados sin período
-- pagado (cortesía / pausa / reserva / bloqueo / saneamiento) todavía NO se
-- calcula; esas columnas de `cierres_mensuales` quedan en cero a propósito, no
-- por un error de cálculo.
-- ============================================================================

alter table public.cierres_mensuales
  add column if not exists dias_unidad_ocupados  numeric not null default 0,
  add column if not exists dias_unidad_capacidad numeric not null default 0;

-- ----------------------------------------------------------------------------
-- resumen_financiero — todos los totales de un rango [inicio, fin)
-- ----------------------------------------------------------------------------
create or replace function public.resumen_financiero(
  p_inicio date,
  p_fin    date
)
returns table (
  ingreso_contractual_usd                    numeric,
  ingreso_comercial_devengado_usd            numeric,
  ves_esperados_devengados_clientes          numeric,
  ingreso_cobrado_devengado_ves              numeric,
  ingreso_economico_devengado_usd_paralela   numeric,
  costo_proveedor_devengado_usdt             numeric,
  costo_proveedor_devengado_ves              numeric,
  margen_bruto_ves                           numeric,
  margen_bruto_economico_usd_paralela        numeric,
  gastos_operativos_usdt                     numeric,
  gastos_operativos_ves                      numeric,
  ajustes_clientes_ves                       numeric,
  ajustes_economicos_usd_paralela            numeric,
  resultado_operativo_ves                    numeric,
  resultado_operativo_economico_usd_paralela numeric,
  cobros_ves                                 numeric,
  reembolsos_clientes_ves                    numeric,
  pagos_proveedor_usdt                       numeric,
  pagos_proveedor_ves                        numeric,
  flujo_caja_valorizado_ves                  numeric,
  dias_unidad_capacidad                      numeric,
  dias_unidad_ocupados                       numeric,
  dias_unidad_pagados                        numeric,
  dias_unidad_disponibles                    numeric,
  costo_ocioso_ves                           numeric
)
language sql
stable
set search_path = ''
as $$
with rango as (
  select p_inicio as ini, p_fin as fin
),

-- --- Períodos de servicio que tocan el rango, con su cobro neto -------------
periodos as (
  select
    ps.id,
    ps.precio_comercial_usd,
    ps.monto_ves_esperado,
    ps.fecha_venta,
    (ps.fecha_renovacion - ps.inicio)::numeric as dias_periodo,
    (least(ps.fecha_renovacion, r.fin) - greatest(ps.inicio, r.ini))::numeric as dias_en_rango,
    cobro.monto_ves as cobrado_ves,
    tp.bs_por_usd   as paralela_cobro,
    coalesce(asig.capacidad_vendible_consumida_snapshot, 1)::numeric as unidades
  from public.periodos_servicio ps
  cross join rango r
  -- El cobro cuenta solo si no fue revertido: un reverso lo deja sin efecto.
  left join lateral (
    select pc.monto_ves, pc.tasa_paralela_id
    from public.pagos_cliente pc
    where pc.periodo_servicio_id = ps.id
      and pc.tipo = 'cobro' and pc.estado = 'confirmado'
      and not exists (
        select 1 from public.pagos_cliente rv
        where rv.pago_original_id = pc.id
          and rv.tipo = 'reverso' and rv.estado = 'confirmado')
    limit 1
  ) cobro on true
  left join public.tasas_cambio tp on tp.id = cobro.tasa_paralela_id
  left join lateral (
    select a.capacidad_vendible_consumida_snapshot
    from public.asignaciones_inventario a
    where a.suscripcion_id = ps.suscripcion_id and a.consume_capacidad
    order by a.inicio desc
    limit 1
  ) asig on true
  where ps.estado = 'vigente'
    and ps.inicio < r.fin
    and ps.fecha_renovacion > r.ini
),

-- --- Ciclos de proveedor, recortados por el siguiente ciclo de la cuenta ----
-- Un ciclo 'reemplazado' cubrió días reales, pero solo hasta que empezó el
-- siguiente: sin este recorte se contaría dos veces el mismo costo.
ciclos_base as (
  select
    c.id, c.cuenta_id, c.inicio, c.costo_usdt, c.costo_ves_snapshot,
    coalesce(c.capacidad_vendible_snapshot, c.capacidad_fisica_snapshot, 1)::numeric as capacidad,
    least(
      c.proxima_renovacion,
      coalesce(
        lead(c.inicio) over (partition by c.cuenta_id order by c.inicio, c.created_at),
        c.proxima_renovacion)
    ) as fin_efectivo,
    (c.proxima_renovacion - c.inicio)::numeric as dias_ciclo
  from public.ciclos_proveedor c
  where c.estado in ('vigente', 'reemplazado')
),
ciclos as (
  select
    cb.*,
    (least(cb.fin_efectivo, r.fin) - greatest(cb.inicio, r.ini))::numeric as dias_en_rango
  from ciclos_base cb
  cross join rango r
  where cb.inicio < r.fin and cb.fin_efectivo > r.ini and cb.dias_ciclo > 0
),

-- --- Ocupación real del inventario ------------------------------------------
asignaciones as (
  select
    a.cuenta_id,
    (least(coalesce((a.fin at time zone 'America/Caracas')::date, r.fin), r.fin)
       - greatest((a.inicio at time zone 'America/Caracas')::date, r.ini))::numeric as dias,
    coalesce(a.capacidad_vendible_consumida_snapshot, 1)::numeric as unidades
  from public.asignaciones_inventario a
  cross join rango r
  where a.consume_capacidad
    and (a.inicio at time zone 'America/Caracas')::date < r.fin
    and (a.fin is null or (a.fin at time zone 'America/Caracas')::date > r.ini)
),
ocupacion_cuenta as (
  select cuenta_id, sum(dias * unidades) as dias_unidad
  from asignaciones
  where dias > 0
  group by cuenta_id
),

-- --- Movimientos de caja del rango ------------------------------------------
caja as (
  select
    coalesce(sum(m.monto_ves) filter (where m.tipo = 'cobro_cliente'), 0)     as cobros_ves,
    coalesce(-sum(m.monto_ves) filter (where m.tipo = 'reverso_cliente'), 0)  as reembolsos_ves,
    coalesce(-sum(m.monto_usdt) filter (where m.tipo = 'pago_proveedor'), 0)  as pagos_prov_usdt,
    coalesce(-sum(m.monto_ves) filter (where m.tipo = 'pago_proveedor'), 0)   as pagos_prov_ves,
    coalesce(sum(m.monto_ves), 0)                                            as flujo_ves,
    coalesce(sum(m.monto_ves) filter (where m.tipo = 'reverso_cliente'), 0)   as ajuste_clientes_ves
  from public.v_movimientos_caja m
  cross join rango r
  where m.fecha >= r.ini and m.fecha < r.fin
),

gastos as (
  select
    coalesce(sum(g.monto_usdt), 0)         as usdt,
    coalesce(sum(g.monto_ves_snapshot), 0) as ves
  from public.gastos_operativos g
  cross join rango r
  where g.estado = 'confirmado'
    and g.fecha_gasto >= r.ini and g.fecha_gasto < r.fin
),

-- --- Agregados de devengo ----------------------------------------------------
ing as (
  select
    coalesce(sum(p.precio_comercial_usd)
      filter (where p.fecha_venta >= (select ini from rango)
                and p.fecha_venta <  (select fin from rango)), 0) as contractual_usd,
    coalesce(sum(p.precio_comercial_usd * p.dias_en_rango / p.dias_periodo), 0) as comercial_usd,
    coalesce(sum(p.monto_ves_esperado   * p.dias_en_rango / p.dias_periodo), 0) as esperado_ves,
    coalesce(sum(p.cobrado_ves          * p.dias_en_rango / p.dias_periodo), 0) as cobrado_ves,
    coalesce(sum((p.cobrado_ves / nullif(p.paralela_cobro, 0)) * p.dias_en_rango / p.dias_periodo), 0)
      as economico_usd,
    coalesce(sum(p.dias_en_rango * p.unidades) filter (where p.cobrado_ves is not null), 0)
      as dias_unidad_pagados
  from periodos p
  where p.dias_periodo > 0 and p.dias_en_rango > 0
),

cos as (
  select
    coalesce(sum(c.costo_usdt         * c.dias_en_rango / c.dias_ciclo), 0) as usdt,
    coalesce(sum(c.costo_ves_snapshot * c.dias_en_rango / c.dias_ciclo), 0) as ves,
    coalesce(sum(c.capacidad * c.dias_en_rango), 0)                         as capacidad_dias,
    -- Costo ocioso: la parte devengada del ciclo que corresponde a capacidad
    -- que nadie ocupó. Si no hay capacidad declarada, no se inventa.
    coalesce(sum(
      case when c.capacidad * c.dias_en_rango > 0 then
        c.costo_ves_snapshot * (c.dias_en_rango / c.dias_ciclo)
          * (greatest(0, c.capacidad * c.dias_en_rango - coalesce(oc.dias_unidad, 0))
             / (c.capacidad * c.dias_en_rango))
      else 0 end), 0) as ocioso_ves
  from ciclos c
  left join ocupacion_cuenta oc on oc.cuenta_id = c.cuenta_id
  where c.dias_en_rango > 0
),

ocu as (
  select coalesce(sum(dias * unidades), 0) as ocupados
  from asignaciones where dias > 0
)

select
  ing.contractual_usd,
  ing.comercial_usd,
  ing.esperado_ves,
  ing.cobrado_ves,
  ing.economico_usd,
  cos.usdt,
  cos.ves,
  ing.cobrado_ves - cos.ves                              as margen_bruto_ves,
  ing.economico_usd - cos.usdt                           as margen_economico,
  gastos.usdt,
  gastos.ves,
  caja.ajuste_clientes_ves,
  -- El ajuste económico usa la paralela congelada del cobro original, que es la
  -- que viaja en el reverso (ver `revertir_cobro_cliente`).
  coalesce((
    select -sum(pc.monto_ves / nullif(tp.bs_por_usd, 0))
    from public.pagos_cliente pc
    left join public.tasas_cambio tp on tp.id = pc.tasa_paralela_id
    cross join rango r
    where pc.tipo = 'reverso' and pc.estado = 'confirmado'
      and (pc.ocurrido_at at time zone 'America/Caracas')::date >= r.ini
      and (pc.ocurrido_at at time zone 'America/Caracas')::date <  r.fin
  ), 0)                                                  as ajustes_economicos,
  (ing.cobrado_ves - cos.ves) - gastos.ves + caja.ajuste_clientes_ves as resultado_ves,
  (ing.economico_usd - cos.usdt) - gastos.usdt + coalesce((
    select -sum(pc.monto_ves / nullif(tp.bs_por_usd, 0))
    from public.pagos_cliente pc
    left join public.tasas_cambio tp on tp.id = pc.tasa_paralela_id
    cross join rango r
    where pc.tipo = 'reverso' and pc.estado = 'confirmado'
      and (pc.ocurrido_at at time zone 'America/Caracas')::date >= r.ini
      and (pc.ocurrido_at at time zone 'America/Caracas')::date <  r.fin
  ), 0)                                                  as resultado_economico,
  caja.cobros_ves,
  caja.reembolsos_ves,
  caja.pagos_prov_usdt,
  caja.pagos_prov_ves,
  caja.flujo_ves,
  cos.capacidad_dias,
  ocu.ocupados,
  ing.dias_unidad_pagados,
  greatest(0, cos.capacidad_dias - ocu.ocupados)         as disponibles,
  cos.ocioso_ves
from ing, cos, caja, gastos, ocu;
$$;

comment on function public.resumen_financiero is
  'Totales devengados y de caja de un rango [inicio, fin). Misma función para '
  'el día y para el mes: así los días suman exactamente el cierre mensual.';

-- ----------------------------------------------------------------------------
-- calcular_cierre_mensual — genera o regenera el BORRADOR de un mes
-- ----------------------------------------------------------------------------
-- Un mes ya cerrado no se sobrescribe en silencio: hay que reabrirlo primero,
-- lo que crea una versión nueva y deja rastro de quién y por qué.
create or replace function public.calcular_cierre_mensual(p_mes date)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_ini date;
  v_fin date;
  v_r   record;
  v_id  uuid;
  v_version integer;
  v_estado  text;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede calcular el cierre.' using errcode = '42501';
  end if;

  v_ini := date_trunc('month', p_mes)::date;
  v_fin := (v_ini + interval '1 month')::date;

  select id, version, estado into v_id, v_version, v_estado
  from public.cierres_mensuales
  where mes = v_ini and estado <> 'reemplazado'
  order by version desc
  limit 1;

  if v_id is not null and v_estado = 'cerrado' then
    raise exception
      'El mes % ya está cerrado. Reábrelo si necesitas recalcularlo.', to_char(v_ini, 'MM/YYYY');
  end if;

  select * into v_r from public.resumen_financiero(v_ini, v_fin);

  if v_id is null then
    insert into public.cierres_mensuales (mes, inicio, fin, version, estado)
    values (v_ini, v_ini, v_fin, 1, 'borrador')
    returning id into v_id;
  end if;

  update public.cierres_mensuales set
    ingreso_contractual_usd                    = v_r.ingreso_contractual_usd,
    ingreso_comercial_devengado_usd            = v_r.ingreso_comercial_devengado_usd,
    ves_esperados_devengados_clientes          = v_r.ves_esperados_devengados_clientes,
    ingreso_cobrado_devengado_ves              = v_r.ingreso_cobrado_devengado_ves,
    ingreso_economico_devengado_usd_paralela   = v_r.ingreso_economico_devengado_usd_paralela,
    costo_proveedor_devengado_usdt             = v_r.costo_proveedor_devengado_usdt,
    costo_proveedor_devengado_ves              = v_r.costo_proveedor_devengado_ves,
    margen_bruto_ves                           = v_r.margen_bruto_ves,
    margen_bruto_economico_usd_paralela        = v_r.margen_bruto_economico_usd_paralela,
    gastos_operativos_usdt                     = v_r.gastos_operativos_usdt,
    gastos_operativos_ves                      = v_r.gastos_operativos_ves,
    ajustes_clientes_ves                       = v_r.ajustes_clientes_ves,
    ajustes_economicos_usd_paralela            = v_r.ajustes_economicos_usd_paralela,
    resultado_operativo_ves                    = v_r.resultado_operativo_ves,
    resultado_operativo_economico_usd_paralela = v_r.resultado_operativo_economico_usd_paralela,
    cobros_ves                                 = v_r.cobros_ves,
    reembolsos_clientes_ves                    = v_r.reembolsos_clientes_ves,
    pagos_proveedor_usdt                       = v_r.pagos_proveedor_usdt,
    pagos_proveedor_ves                        = v_r.pagos_proveedor_ves,
    flujo_caja_valorizado_ves                  = v_r.flujo_caja_valorizado_ves,
    dias_unidad_capacidad                      = v_r.dias_unidad_capacidad,
    dias_unidad_ocupados                       = v_r.dias_unidad_ocupados,
    dias_unidad_pagados                        = v_r.dias_unidad_pagados,
    dias_unidad_disponibles                    = v_r.dias_unidad_disponibles,
    costo_ocioso_ves                           = v_r.costo_ocioso_ves,
    tasa_bcv_id      = (select id from public.tasas_cambio
                        where tipo = 'bcv' and estado = 'vigente'
                        order by obtenida_at desc limit 1),
    tasa_paralela_id = (select id from public.tasas_cambio
                        where tipo = 'paralela' and estado = 'vigente'
                        order by obtenida_at desc limit 1),
    estado         = case when estado = 'reabierto' then 'reabierto' else 'borrador' end,
    calculado_at   = now(),
    source_watermark = now()
  where id = v_id;

  -- El detalle explica cómo se formó cada total: se regenera completo, porque
  -- es una foto derivada, no un hecho independiente.
  delete from public.detalles_cierre_mensual where cierre_id = v_id;

  insert into public.detalles_cierre_mensual (
    cierre_id, fecha_negocio, tipo, origen_id, monto_fuente, moneda_fuente,
    monto_devengado_ves, monto_devengado_usd_comercial, dias_periodo, dias_en_mes)
  select
    v_id, d.fecha, 'ingreso_servicio', d.periodo_id, d.precio, 'usd',
    d.cobrado_devengado, d.comercial_devengado, d.dias_periodo, d.dias_en_mes
  from (
    select
      ps.id as periodo_id,
      greatest(ps.inicio, v_ini) as fecha,
      ps.precio_comercial_usd as precio,
      (ps.fecha_renovacion - ps.inicio) as dias_periodo,
      (least(ps.fecha_renovacion, v_fin) - greatest(ps.inicio, v_ini)) as dias_en_mes,
      coalesce(pc.monto_ves, 0)
        * (least(ps.fecha_renovacion, v_fin) - greatest(ps.inicio, v_ini))
        / nullif(ps.fecha_renovacion - ps.inicio, 0) as cobrado_devengado,
      ps.precio_comercial_usd
        * (least(ps.fecha_renovacion, v_fin) - greatest(ps.inicio, v_ini))
        / nullif(ps.fecha_renovacion - ps.inicio, 0) as comercial_devengado
    from public.periodos_servicio ps
    left join lateral (
      select pc.monto_ves from public.pagos_cliente pc
      where pc.periodo_servicio_id = ps.id
        and pc.tipo = 'cobro' and pc.estado = 'confirmado'
      limit 1
    ) pc on true
    where ps.estado = 'vigente'
      and ps.inicio < v_fin and ps.fecha_renovacion > v_ini
  ) d;

  insert into public.detalles_cierre_mensual (
    cierre_id, fecha_negocio, cuenta_id, tipo, origen_id, monto_fuente,
    moneda_fuente, monto_devengado_ves, dias_periodo, dias_en_mes)
  select
    v_id, greatest(c.inicio, v_ini), c.cuenta_id, 'costo_proveedor', c.id,
    c.costo_usdt, 'usdt',
    c.costo_ves_snapshot * (least(c.proxima_renovacion, v_fin) - greatest(c.inicio, v_ini))
      / nullif(c.proxima_renovacion - c.inicio, 0),
    (c.proxima_renovacion - c.inicio),
    (least(c.proxima_renovacion, v_fin) - greatest(c.inicio, v_ini))
  from public.ciclos_proveedor c
  where c.estado in ('vigente', 'reemplazado')
    and c.inicio < v_fin and c.proxima_renovacion > v_ini;

  return v_id;
end;
$$;

comment on function public.calcular_cierre_mensual is
  'Genera o regenera el borrador de un mes con el detalle que lo explica. '
  'Un mes cerrado exige reapertura versionada.';

-- ----------------------------------------------------------------------------
-- cerrar_mes / reabrir_mes — la política de datos tardíos (CLOSE-02)
-- ----------------------------------------------------------------------------
create or replace function public.cerrar_mes(p_mes date)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_ini date;
  v_id  uuid;
begin
  if not public.es_admin() then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  v_ini := date_trunc('month', p_mes)::date;

  -- Se recalcula siempre justo antes de cerrar: cerrar un borrador viejo
  -- congelaría cifras que ya no coinciden con los hechos.
  v_id := public.calcular_cierre_mensual(v_ini);

  update public.cierres_mensuales
  set estado = 'cerrado', cerrado_at = now(), cerrado_por_id = auth.uid()
  where id = v_id;

  insert into public.eventos_auditoria (actor_id, accion, entidad, entidad_id, resultado, metadata)
  values (auth.uid(), 'cerrar_mes', 'cierres_mensuales', v_id::text, 'ok',
          jsonb_build_object('mes', v_ini));

  return v_id;
end;
$$;

create or replace function public.reabrir_mes(p_mes date, p_motivo text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_ini date;
  v_ant public.cierres_mensuales;
  v_id  uuid;
begin
  if not public.es_admin() then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_motivo, '')), '') is null then
    raise exception 'Indica el motivo de la reapertura: queda en la auditoría.';
  end if;

  v_ini := date_trunc('month', p_mes)::date;

  select * into v_ant
  from public.cierres_mensuales
  where mes = v_ini and estado = 'cerrado'
  order by version desc
  limit 1;

  if not found then
    raise exception 'No hay un cierre cerrado para %.', to_char(v_ini, 'MM/YYYY');
  end if;

  -- El cierre anterior NO se borra ni se edita: queda marcado como reemplazado
  -- y nace una versión nueva. El pasado siempre se puede auditar.
  update public.cierres_mensuales set estado = 'reemplazado' where id = v_ant.id;

  insert into public.cierres_mensuales (mes, inicio, fin, version, estado)
  values (v_ini, v_ant.inicio, v_ant.fin, v_ant.version + 1, 'reabierto')
  returning id into v_id;

  insert into public.eventos_auditoria (actor_id, accion, entidad, entidad_id, resultado, metadata)
  values (auth.uid(), 'reabrir_mes', 'cierres_mensuales', v_id::text, 'ok',
          jsonb_build_object('mes', v_ini, 'version', v_ant.version + 1, 'motivo', p_motivo));

  perform public.calcular_cierre_mensual(v_ini);
  return v_id;
end;
$$;

comment on function public.reabrir_mes is
  'Reapertura versionada: el cierre anterior queda como reemplazado y se crea '
  'una versión nueva con motivo y actor auditados (CLOSE-02).';

-- ============================================================================
-- Permisos
-- ============================================================================
revoke execute on function public.resumen_financiero(date, date) from public;
grant  execute on function public.resumen_financiero(date, date) to authenticated;
revoke execute on function public.calcular_cierre_mensual(date) from public;
grant  execute on function public.calcular_cierre_mensual(date) to authenticated;
revoke execute on function public.cerrar_mes(date) from public;
grant  execute on function public.cerrar_mes(date) to authenticated;
revoke execute on function public.reabrir_mes(date, text) from public;
grant  execute on function public.reabrir_mes(date, text) to authenticated;
