-- ============================================================================
-- 0018 — Caja diaria (Fase 4)
-- ----------------------------------------------------------------------------
-- Caja NO mezcla tres hechos distintos (docs/01-alcance-y-reglas.md §7):
--   1. VENTAS del día  → operaciones comerciales con `fecha_venta` = día.
--   2. CAJA del día    → dinero que entró o salió ese día.
--   3. RESULTADO del día → ingreso y costo DEVENGADOS por prestar servicio ese
--      día, aunque la venta o el pago hayan ocurrido en otra fecha.
--
-- Aquí se resuelven (1) y (2). El devengo (3) necesita prorrateo y vive en la
-- migración del cierre mensual, para que el día y el mes usen exactamente el
-- mismo motor y la reconciliación `suma(días) = mes` se cumpla por construcción.
--
-- DÍA DE NEGOCIO: siempre `America/Caracas`. Un cobro registrado a las 21:00 de
-- Caracas es del mismo día, aunque en UTC ya sea el siguiente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- v_movimientos_caja — cada entrada y salida real, con su signo
-- ----------------------------------------------------------------------------
-- Convención de signo: POSITIVO entra en caja, NEGATIVO sale. Así el flujo del
-- día es una simple suma y los reversos se cancelan solos.
create or replace view public.v_movimientos_caja
with (security_invoker = true) as
-- Cobros de clientes (entrada, en Bs por definición)
select
  pc.id                                                as movimiento_id,
  'cobro_cliente'::text                                as tipo,
  (pc.ocurrido_at at time zone 'America/Caracas')::date as fecha,
  pc.monto_ves                                         as monto_ves,
  null::numeric                                        as monto_usdt,
  cl.nombre                                            as concepto,
  pl.nombre                                            as plataforma_nombre,
  pc.referencia                                        as referencia,
  pc.periodo_servicio_id                               as origen_id,
  pc.created_by
from public.pagos_cliente pc
join public.periodos_servicio ps     on ps.id = pc.periodo_servicio_id
join public.suscripciones s          on s.id = ps.suscripcion_id
join public.clientes cl              on cl.id = s.cliente_id
join public.productos_plataforma pp  on pp.id = s.producto_plataforma_id
join public.plataformas pl           on pl.id = pp.plataforma_id
where pc.estado = 'confirmado' and pc.tipo = 'cobro'

union all

-- Reversos a clientes (salida: devolución de dinero ya cobrado)
select
  pc.id,
  'reverso_cliente',
  (pc.ocurrido_at at time zone 'America/Caracas')::date,
  -pc.monto_ves,
  null::numeric,
  cl.nombre,
  pl.nombre,
  pc.referencia,
  pc.periodo_servicio_id,
  pc.created_by
from public.pagos_cliente pc
join public.periodos_servicio ps     on ps.id = pc.periodo_servicio_id
join public.suscripciones s          on s.id = ps.suscripcion_id
join public.clientes cl              on cl.id = s.cliente_id
join public.productos_plataforma pp  on pp.id = s.producto_plataforma_id
join public.plataformas pl           on pl.id = pp.plataforma_id
where pc.estado = 'confirmado' and pc.tipo = 'reverso'

union all

-- Pagos al proveedor (salida). El reverso ya viene con monto negativo, así que
-- negar aquí lo convierte correctamente en una entrada.
select
  pg.id,
  'pago_proveedor',
  pg.fecha_pago,
  -pg.monto_ves_snapshot,
  -pg.monto_usdt,
  coalesce(c.proveedor_nombre_snapshot, 'Proveedor') || ' · ' || coalesce(cu.alias, pp.nombre),
  pl.nombre,
  pg.referencia_no_sensible,
  pg.ciclo_proveedor_id,
  pg.created_by
from public.pagos_proveedor pg
join public.ciclos_proveedor c       on c.id = pg.ciclo_proveedor_id
join public.cuentas cu               on cu.id = c.cuenta_id
join public.productos_plataforma pp  on pp.id = cu.producto_plataforma_id
join public.plataformas pl           on pl.id = pp.plataforma_id
where pg.estado = 'confirmado'

union all

-- Gastos operativos (salida)
select
  g.id,
  'gasto_operativo',
  g.fecha_gasto,
  -g.monto_ves_snapshot,
  -g.monto_usdt,
  cg.nombre || coalesce(' · ' || g.descripcion, ''),
  pl.nombre,
  g.referencia_no_sensible,
  g.categoria_id,
  g.created_by
from public.gastos_operativos g
join public.categorias_gasto cg      on cg.id = g.categoria_id
left join public.plataformas pl      on pl.id = g.plataforma_id
where g.estado = 'confirmado';

comment on view public.v_movimientos_caja is
  'Movimientos reales de caja con signo: positivo entra, negativo sale. '
  'Los egresos conservan además su monto fuente en USDT.';

-- ----------------------------------------------------------------------------
-- v_caja_diaria — totales por día de negocio
-- ----------------------------------------------------------------------------
create or replace view public.v_caja_diaria
with (security_invoker = true) as
select
  fecha,
  sum(monto_ves) filter (where monto_ves > 0)          as entradas_ves,
  -sum(monto_ves) filter (where monto_ves < 0)         as salidas_ves,
  sum(monto_ves)                                       as flujo_ves,
  -coalesce(sum(monto_usdt) filter (where monto_usdt < 0), 0) as egresos_usdt,
  count(*)                                             as movimientos
from public.v_movimientos_caja
group by fecha;

comment on view public.v_caja_diaria is
  'Entradas, salidas y flujo neto por día de negocio (America/Caracas).';

-- ----------------------------------------------------------------------------
-- v_ventas_diarias — el hecho COMERCIAL, distinto del hecho de caja
-- ----------------------------------------------------------------------------
-- Una venta pagada hoy con servicio futuro pertenece a las ventas de hoy, pero
-- su ingreso no se devenga hasta que empieza el servicio. Por eso esta vista
-- vive aparte de la de caja y no se suman entre sí.
create or replace view public.v_ventas_diarias
with (security_invoker = true) as
select
  ps.fecha_venta                                        as fecha,
  count(*) filter (where ps.tipo_operacion = 'venta_nueva')   as ventas_nuevas,
  count(*) filter (where ps.tipo_operacion in ('renovacion', 'renovacion_tardia')) as renovaciones,
  coalesce(sum(ps.precio_comercial_usd), 0)             as ventas_usd,
  coalesce(sum(ps.monto_ves_esperado), 0)               as ventas_esperadas_ves
from public.periodos_servicio ps
where ps.estado = 'vigente' and ps.fecha_venta is not null
group by ps.fecha_venta;

comment on view public.v_ventas_diarias is
  'Ventas y renovaciones por fecha comercial. No es caja: el cobro puede '
  'ocurrir otro día y el servicio devengarse en otro mes.';

grant select on public.v_movimientos_caja to authenticated;
grant select on public.v_caja_diaria      to authenticated;
grant select on public.v_ventas_diarias   to authenticated;
