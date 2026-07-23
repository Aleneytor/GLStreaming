-- ============================================================================
-- 0017 — Egresos: pagos a proveedor y gastos operativos (Fase 4)
-- ----------------------------------------------------------------------------
-- El lado del costo. Todo egreso nace en USDT y se valoriza con la tasa
-- PARALELA (nunca BCV): es la tasa a la que el negocio realmente compra.
--
-- REGLAS DE DOMINIO QUE IMPLEMENTA (docs/01-alcance-y-reglas.md §7):
--   * COSTO y PAGO son dos hechos distintos: el costo se devenga durante la
--     cobertura del ciclo; el pago afecta la Caja en su fecha efectiva. Por eso
--     son dos filas y no una.
--   * Siempre se paga el ciclo completo: `monto_pago_usdt = costo_ciclo_usdt`.
--     El administrador edita UN solo importe.
--   * Costo cero es válido y NO inventa una salida de Caja.
--   * Pagar 1-2 días tarde solo mueve la fecha en Caja: no toca el inicio, la
--     cobertura, el día ancla ni la próxima renovación.
--   * Reintentar la operación no duplica el pago.
--   * Un mismo desembolso nunca se registra por las dos rutas (ciclo vs. gasto).
--   * Los reversos llevan signo contrario, no borran el original y no pueden
--     superar lo confirmado.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Categorías de gasto — vocabulario cerrado inicial (docs §7)
-- ----------------------------------------------------------------------------
insert into public.categorias_gasto (nombre)
values
  ('recarga_banco'),
  ('compra_producto'),
  ('comision'),
  ('servicio_herramienta'),
  ('publicidad'),
  ('otro_negocio')
on conflict (nombre) do nothing;

-- ----------------------------------------------------------------------------
-- registrar_pago_proveedor — salida de Caja por un ciclo ya registrado
-- ----------------------------------------------------------------------------
create or replace function public.registrar_pago_proveedor(
  p_ciclo_id   uuid,
  p_fecha_pago date default current_date,
  p_referencia text default null,
  p_tipo       text default 'renovacion'
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_ciclo    public.ciclos_proveedor;
  v_paralela public.tasas_cambio;
  v_pago_id  uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede registrar pagos.' using errcode = '42501';
  end if;
  if p_tipo not in ('inicial', 'renovacion') then
    raise exception 'Tipo de pago inválido: %', p_tipo;
  end if;

  select * into v_ciclo from public.ciclos_proveedor where id = p_ciclo_id for update;
  if not found then
    raise exception 'Ciclo de proveedor no encontrado.';
  end if;

  -- Costo cero es un ciclo válido (por ejemplo, una cuenta propia): no hay
  -- desembolso que registrar y no se inventa una salida de Caja.
  if v_ciclo.costo_usdt = 0 then
    return null;
  end if;

  -- Reintentar no duplica.
  if exists (
    select 1 from public.pagos_proveedor
    where ciclo_proveedor_id = p_ciclo_id
      and tipo in ('inicial', 'renovacion') and estado = 'confirmado'
  ) then
    raise exception 'Ese ciclo ya está pagado.';
  end if;

  select * into v_paralela from public.tasa_utilizable('paralela');
  if v_paralela.id is null then
    raise exception
      'No hay una tasa paralela confirmada en las últimas 24 h. Actualízala antes de pagar.';
  end if;

  -- El ciclo congela su valorización la primera vez que se confirma el pago.
  update public.ciclos_proveedor
  set tasa_paralela_id   = coalesce(tasa_paralela_id, v_paralela.id),
      costo_ves_snapshot = coalesce(costo_ves_snapshot,
                                    round(v_ciclo.costo_usdt * v_paralela.bs_por_usd, 2))
  where id = p_ciclo_id;

  insert into public.pagos_proveedor (
    ciclo_proveedor_id, tipo, monto_usdt, tasa_paralela_id, monto_ves_snapshot,
    fecha_pago, confirmado_at, estado, referencia_no_sensible, created_by
  ) values (
    p_ciclo_id, p_tipo, v_ciclo.costo_usdt, v_paralela.id,
    round(v_ciclo.costo_usdt * v_paralela.bs_por_usd, 2),
    coalesce(p_fecha_pago, current_date), now(), 'confirmado',
    nullif(btrim(coalesce(p_referencia, '')), ''), auth.uid()
  )
  returning id into v_pago_id;

  insert into public.eventos_auditoria (actor_id, accion, entidad, entidad_id, resultado, metadata)
  values (auth.uid(), 'pago_proveedor', 'pagos_proveedor', v_pago_id::text, 'ok',
          jsonb_build_object('ciclo_id', p_ciclo_id, 'usdt', v_ciclo.costo_usdt,
                             'paralela', v_paralela.bs_por_usd));

  return v_pago_id;
end;
$$;

comment on function public.registrar_pago_proveedor is
  'Paga un ciclo completo en USDT y congela la paralela. Costo cero no genera '
  'pago; reintentar no duplica; la fecha solo afecta a Caja.';

-- ----------------------------------------------------------------------------
-- registrar_renovacion_y_pago — la acción real del administrador
-- ----------------------------------------------------------------------------
-- Un solo importe de negocio (`costo_ciclo_usdt`) crea el ciclo nuevo y, si es
-- mayor que cero, su único pago. El día ancla se HEREDA del ciclo anterior: la
-- fecha en que uno se acuerde de renovar no debe mover el calendario pactado.
create or replace function public.registrar_renovacion_y_pago(
  p_cuenta_id  uuid,
  p_costo_usdt numeric,
  p_inicio     date default current_date,
  p_dia_ancla  integer default null,
  p_referencia text default null,
  p_pagar      boolean default true,
  p_fecha_pago date default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_ancla  integer;
  v_ciclo_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede renovar con el proveedor.' using errcode = '42501';
  end if;

  v_ancla := p_dia_ancla;
  if v_ancla is null then
    select dia_ancla_proveedor into v_ancla
    from public.ciclos_proveedor
    where cuenta_id = p_cuenta_id and estado = 'vigente'
    order by inicio desc
    limit 1;
  end if;

  v_ciclo_id := public.registrar_ciclo_proveedor(
    p_cuenta_id, p_costo_usdt, p_inicio, v_ancla, p_referencia);

  if p_pagar and p_costo_usdt > 0 then
    perform public.registrar_pago_proveedor(
      v_ciclo_id, coalesce(p_fecha_pago, p_inicio), p_referencia, 'renovacion');
  end if;

  return v_ciclo_id;
end;
$$;

comment on function public.registrar_renovacion_y_pago is
  'Renovación del proveedor en una transacción: un ciclo nuevo (con el ancla '
  'heredada) y, si el costo es mayor que cero y se marcó pagado, un único pago.';

-- ----------------------------------------------------------------------------
-- registrar_gasto_operativo — egreso del negocio fuera de ciclos
-- ----------------------------------------------------------------------------
create or replace function public.registrar_gasto_operativo(
  p_categoria    text,
  p_monto_usdt   numeric,
  p_fecha_gasto  date default current_date,
  p_descripcion  text default null,
  p_contraparte  text default null,
  p_plataforma_id uuid default null,
  p_cuenta_id    uuid default null,
  p_referencia   text default null,
  p_nota         text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_categoria_id uuid;
  v_paralela public.tasas_cambio;
  v_gasto_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede registrar gastos.' using errcode = '42501';
  end if;
  if p_monto_usdt is null or p_monto_usdt <= 0 then
    raise exception 'El gasto debe ser mayor que cero.';
  end if;

  select id into v_categoria_id
  from public.categorias_gasto
  where nombre = p_categoria and activa;
  if v_categoria_id is null then
    raise exception 'Categoría de gasto desconocida: %', p_categoria;
  end if;

  select * into v_paralela from public.tasa_utilizable('paralela');
  if v_paralela.id is null then
    raise exception
      'No hay una tasa paralela confirmada en las últimas 24 h. Actualízala antes de registrar el gasto.';
  end if;

  insert into public.gastos_operativos (
    categoria_id, tipo, descripcion, fecha_gasto, monto_usdt,
    tasa_paralela_id, monto_ves_snapshot, confirmado_at, contraparte,
    plataforma_id, cuenta_id, referencia_no_sensible, nota, estado, created_by
  ) values (
    v_categoria_id, 'gasto', nullif(btrim(coalesce(p_descripcion, '')), ''),
    coalesce(p_fecha_gasto, current_date), p_monto_usdt,
    v_paralela.id, round(p_monto_usdt * v_paralela.bs_por_usd, 2), now(),
    nullif(btrim(coalesce(p_contraparte, '')), ''),
    p_plataforma_id, p_cuenta_id,
    nullif(btrim(coalesce(p_referencia, '')), ''),
    nullif(btrim(coalesce(p_nota, '')), ''),
    'confirmado', auth.uid()
  )
  returning id into v_gasto_id;

  insert into public.eventos_auditoria (actor_id, accion, entidad, entidad_id, resultado, metadata)
  values (auth.uid(), 'gasto_operativo', 'gastos_operativos', v_gasto_id::text, 'ok',
          jsonb_build_object('categoria', p_categoria, 'usdt', p_monto_usdt,
                             'paralela', v_paralela.bs_por_usd));

  return v_gasto_id;
end;
$$;

comment on function public.registrar_gasto_operativo is
  'Gasto empresarial en USDT valorizado con la paralela del momento. Los gastos '
  'personales quedan fuera del sistema.';

-- ----------------------------------------------------------------------------
-- Reversos
-- ----------------------------------------------------------------------------
create or replace function public.revertir_gasto_operativo(
  p_gasto_id uuid,
  p_motivo   text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_g public.gastos_operativos;
  v_id uuid;
begin
  if not public.es_admin() then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  select * into v_g from public.gastos_operativos where id = p_gasto_id for update;
  if not found then raise exception 'Gasto no encontrado.'; end if;
  if v_g.tipo <> 'gasto' or v_g.estado <> 'confirmado' then
    raise exception 'Solo se revierte un gasto confirmado.';
  end if;
  if exists (
    select 1 from public.gastos_operativos
    where gasto_original_id = p_gasto_id and tipo = 'reverso' and estado = 'confirmado'
  ) then
    raise exception 'Ese gasto ya fue revertido.';
  end if;

  -- Signo contrario y las MISMAS tasas congeladas: el reverso no se revaloriza
  -- con la tasa de hoy, porque anula un movimiento del pasado.
  insert into public.gastos_operativos (
    categoria_id, tipo, descripcion, fecha_gasto, monto_usdt,
    tasa_paralela_id, monto_ves_snapshot, confirmado_at, contraparte,
    plataforma_id, cuenta_id, nota, estado, gasto_original_id, created_by
  ) values (
    v_g.categoria_id, 'reverso', v_g.descripcion, current_date, -v_g.monto_usdt,
    v_g.tasa_paralela_id, -v_g.monto_ves_snapshot, now(), v_g.contraparte,
    v_g.plataforma_id, v_g.cuenta_id, nullif(btrim(coalesce(p_motivo, '')), ''),
    'confirmado', p_gasto_id, auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.revertir_pago_proveedor(
  p_pago_id uuid,
  p_motivo  text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_p public.pagos_proveedor;
  v_id uuid;
begin
  if not public.es_admin() then
    raise exception 'No autorizado.' using errcode = '42501';
  end if;

  select * into v_p from public.pagos_proveedor where id = p_pago_id for update;
  if not found then raise exception 'Pago no encontrado.'; end if;
  if v_p.tipo = 'reverso' or v_p.estado <> 'confirmado' then
    raise exception 'Solo se revierte un pago confirmado.';
  end if;
  if exists (
    select 1 from public.pagos_proveedor
    where pago_original_id = p_pago_id and tipo = 'reverso' and estado = 'confirmado'
  ) then
    raise exception 'Ese pago ya fue revertido.';
  end if;

  insert into public.pagos_proveedor (
    ciclo_proveedor_id, tipo, monto_usdt, tasa_paralela_id, monto_ves_snapshot,
    fecha_pago, confirmado_at, estado, pago_original_id,
    referencia_no_sensible, created_by
  ) values (
    v_p.ciclo_proveedor_id, 'reverso', -v_p.monto_usdt, v_p.tasa_paralela_id,
    -v_p.monto_ves_snapshot, current_date, now(), 'confirmado', p_pago_id,
    nullif(btrim(coalesce(p_motivo, '')), ''), auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- v_ciclos_proveedor_estado — bandeja de "Pagos a proveedores"
-- ----------------------------------------------------------------------------
create or replace view public.v_ciclos_proveedor_estado
with (security_invoker = true) as
select
  c.id                as ciclo_id,
  c.cuenta_id,
  cu.alias            as cuenta_alias,
  pl.nombre           as plataforma_nombre,
  pp.nombre           as producto_nombre,
  c.proveedor_nombre_snapshot,
  c.inicio,
  c.proxima_renovacion,
  c.dia_ancla_proveedor,
  c.costo_usdt,
  c.costo_ves_snapshot,
  c.estado,
  (c.proxima_renovacion - current_date) as dias_para_renovar,
  exists (
    select 1 from public.pagos_proveedor pg
    where pg.ciclo_proveedor_id = c.id
      and pg.tipo in ('inicial', 'renovacion') and pg.estado = 'confirmado'
  ) as pagado,
  -- Un ciclo de costo cero no espera pago: no debe aparecer como "pendiente".
  (c.costo_usdt = 0) as sin_desembolso
from public.ciclos_proveedor c
join public.cuentas cu               on cu.id = c.cuenta_id
join public.productos_plataforma pp  on pp.id = cu.producto_plataforma_id
join public.plataformas pl           on pl.id = pp.plataforma_id
where c.estado = 'vigente';

comment on view public.v_ciclos_proveedor_estado is
  'Ciclos vigentes con su próxima renovación y si ya están pagados. Vencer '
  'genera aviso, nunca un pago automático.';

-- ============================================================================
-- Permisos
-- ============================================================================
revoke execute on function public.registrar_pago_proveedor(uuid, date, text, text) from public;
grant  execute on function public.registrar_pago_proveedor(uuid, date, text, text) to authenticated;
revoke execute on function public.registrar_renovacion_y_pago(uuid, numeric, date, integer, text, boolean, date) from public;
grant  execute on function public.registrar_renovacion_y_pago(uuid, numeric, date, integer, text, boolean, date) to authenticated;
revoke execute on function public.registrar_gasto_operativo(text, numeric, date, text, text, uuid, uuid, text, text) from public;
grant  execute on function public.registrar_gasto_operativo(text, numeric, date, text, text, uuid, uuid, text, text) to authenticated;
revoke execute on function public.revertir_gasto_operativo(uuid, text) from public;
grant  execute on function public.revertir_gasto_operativo(uuid, text) to authenticated;
revoke execute on function public.revertir_pago_proveedor(uuid, text) from public;
grant  execute on function public.revertir_pago_proveedor(uuid, text) to authenticated;

grant select on public.v_ciclos_proveedor_estado to authenticated;

create index if not exists idx_pagos_prov_fecha on public.pagos_proveedor (fecha_pago);
create index if not exists idx_ciclos_proxima on public.ciclos_proveedor (proxima_renovacion);
