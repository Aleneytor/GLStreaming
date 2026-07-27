-- ============================================================================
-- 0036 — Renovación y pago de proveedor por lote
-- ----------------------------------------------------------------------------
-- Un desembolso real puede cubrir muchas cuentas del mismo proveedor. Todas
-- comparten `fecha_pago`, referencia y lote, pero cada cuenta conserva su propio
-- calendario: el ciclo nuevo empieza en la `proxima_renovacion` que ya tenía.
-- El costo se edita por cuenta y las asignaciones suman el total del lote.
-- ============================================================================

create table public.lotes_pago_proveedor (
  id                    uuid primary key default gen_random_uuid(),
  proveedor_id          uuid not null references public.proveedores (id) on delete restrict,
  fecha_pago            date not null,
  monto_total_usdt      numeric not null check (monto_total_usdt > 0),
  cantidad_cuentas      integer not null check (cantidad_cuentas > 0),
  referencia_no_sensible text,
  created_by            uuid references public.usuarios (id) on delete set null,
  created_at            timestamptz not null default now()
);

comment on table public.lotes_pago_proveedor is
  'Desembolso real que agrupa pagos de varios ciclos del mismo proveedor. La '
  'fecha del lote afecta a Caja; no sustituye las fechas de cobertura.';

alter table public.pagos_proveedor
  add column lote_pago_id uuid references public.lotes_pago_proveedor (id) on delete restrict;

create index idx_pagos_proveedor_lote
  on public.pagos_proveedor (lote_pago_id)
  where lote_pago_id is not null;

alter table public.lotes_pago_proveedor enable row level security;

create policy lotes_pago_proveedor_admin_all on public.lotes_pago_proveedor
  for all to authenticated
  using (public.es_admin())
  with check (public.es_admin());

revoke all on table public.lotes_pago_proveedor from anon;
grant select on table public.lotes_pago_proveedor to authenticated;

create or replace function public.registrar_renovaciones_proveedor_lote(
  p_items       jsonb,
  p_fecha_pago  date,
  p_referencia  text default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_item          jsonb;
  v_cuenta_id     uuid;
  v_costo         numeric;
  v_ciclo_actual  public.ciclos_proveedor;
  v_proveedor_id  uuid;
  v_proveedor_item uuid;
  v_ids           uuid[] := array[]::uuid[];
  v_total         numeric := 0;
  v_cantidad      integer := 0;
  v_lote_id       uuid;
  v_ciclo_nuevo   uuid;
  v_proxima_nueva date;
  v_resultados    jsonb := '[]'::jsonb;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede registrar pagos por lote.'
      using errcode = '42501';
  end if;

  if p_fecha_pago is null then
    raise exception 'Indica la fecha real del pago.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Selecciona al menos una cuenta para renovar.';
  end if;

  -- Valida y bloquea los ciclos en orden estable. Los bloqueos duran hasta que
  -- termina la función, de modo que el lote completo es atómico.
  for v_item in
    select e.value
    from jsonb_array_elements(p_items) e(value)
    order by e.value ->> 'cuenta_id'
  loop
    begin
      v_cuenta_id := (v_item ->> 'cuenta_id')::uuid;
      v_costo := (v_item ->> 'costo_usdt')::numeric;
    exception when others then
      raise exception 'Una cuenta o costo del lote tiene formato inválido.';
    end;

    if v_cuenta_id = any(v_ids) then
      raise exception 'Una cuenta está repetida en el lote.';
    end if;
    if v_costo is null or v_costo < 0 then
      raise exception 'El costo de cada cuenta debe ser cero o mayor.';
    end if;

    select cp.* into v_ciclo_actual
    from public.ciclos_proveedor cp
    where cp.cuenta_id = v_cuenta_id and cp.estado = 'vigente'
    order by cp.inicio desc
    limit 1
    for update;

    if not found then
      raise exception 'La cuenta % no tiene un ciclo vigente con fecha de renovación.', v_cuenta_id;
    end if;
    if v_ciclo_actual.proxima_renovacion is null then
      raise exception 'La cuenta % no tiene próxima renovación.', v_cuenta_id;
    end if;

    select c.proveedor_operativo_id into v_proveedor_item
    from public.cuentas c
    where c.id = v_cuenta_id;

    if v_proveedor_item is null then
      raise exception 'La cuenta % no tiene proveedor asignado.', v_cuenta_id;
    end if;
    if v_proveedor_id is null then
      v_proveedor_id := v_proveedor_item;
    elsif v_proveedor_id <> v_proveedor_item then
      raise exception 'Un pago por lote solo puede incluir cuentas del mismo proveedor.';
    end if;

    v_ids := array_append(v_ids, v_cuenta_id);
    v_total := v_total + v_costo;
    v_cantidad := v_cantidad + 1;
  end loop;

  if v_total <= 0 then
    raise exception 'El total pagado del lote debe ser mayor que cero.';
  end if;

  insert into public.lotes_pago_proveedor (
    proveedor_id, fecha_pago, monto_total_usdt, cantidad_cuentas,
    referencia_no_sensible, created_by
  ) values (
    v_proveedor_id, p_fecha_pago, v_total, v_cantidad,
    nullif(btrim(coalesce(p_referencia, '')), ''), auth.uid()
  )
  returning id into v_lote_id;

  for v_item in
    select e.value
    from jsonb_array_elements(p_items) e(value)
    order by e.value ->> 'cuenta_id'
  loop
    v_cuenta_id := (v_item ->> 'cuenta_id')::uuid;
    v_costo := (v_item ->> 'costo_usdt')::numeric;

    select cp.* into v_ciclo_actual
    from public.ciclos_proveedor cp
    where cp.cuenta_id = v_cuenta_id and cp.estado = 'vigente'
    order by cp.inicio desc
    limit 1;

    v_ciclo_nuevo := public.registrar_renovacion_y_pago(
      v_cuenta_id,
      v_costo,
      v_ciclo_actual.proxima_renovacion,
      v_ciclo_actual.dia_ancla_proveedor,
      p_referencia,
      true,
      p_fecha_pago
    );

    update public.pagos_proveedor
    set lote_pago_id = v_lote_id
    where ciclo_proveedor_id = v_ciclo_nuevo
      and tipo = 'renovacion'
      and estado = 'confirmado';

    select cp.proxima_renovacion into v_proxima_nueva
    from public.ciclos_proveedor cp
    where cp.id = v_ciclo_nuevo;

    v_resultados := v_resultados || jsonb_build_array(jsonb_build_object(
      'cuenta_id', v_cuenta_id,
      'ciclo_id', v_ciclo_nuevo,
      'costo_usdt', v_costo,
      'inicio', v_ciclo_actual.proxima_renovacion,
      'proxima_renovacion', v_proxima_nueva
    ));
  end loop;

  return jsonb_build_object(
    'lote_id', v_lote_id,
    'cantidad', v_cantidad,
    'total_usdt', v_total,
    'fecha_pago', p_fecha_pago,
    'cuentas', v_resultados
  );
end;
$$;

comment on function public.registrar_renovaciones_proveedor_lote(jsonb, date, text) is
  'Renueva y paga varias cuentas del mismo proveedor en una transacción. Cada '
  'ciclo comienza en su propia próxima renovación y todos comparten fecha de pago.';

revoke execute on function public.registrar_renovaciones_proveedor_lote(jsonb, date, text) from public;
grant execute on function public.registrar_renovaciones_proveedor_lote(jsonb, date, text) to authenticated;

