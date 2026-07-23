-- ============================================================================
-- 0016 — Cobros del cliente en bolívares (Fase 4)
-- ----------------------------------------------------------------------------
-- Primera pieza del motor financiero: convertir un período de servicio (que
-- nace con un precio en USD) en dinero real recibido en Bs.
--
-- REGLAS DE DOMINIO QUE IMPLEMENTA (docs/01-alcance-y-reglas.md §7):
--   * monto_ves_esperado = round_half_up(precio_comercial_usd * bcv, 2).
--   * NO existen abonos: el cobro confirmado iguala exactamente el esperado.
--   * La operación CONGELA las dos tasas (BCV, que explica el cobro, y paralela,
--     que da la lectura económica). Ninguna publicación posterior las recalcula.
--   * Un reverso referencia al pago original con signo contrario; nunca borra el
--     original ni puede revertirse dos veces.
--
-- CONTROL DE FRESCURA. Congelar una tasa es irreversible, así que no se permite
-- cobrar con una observación de más de 24 h (el mismo umbral que
-- MINUTOS_BLOQUEO en src/domain/tasas.ts). Para que ese control no dé falsos
-- positivos, se añade `revalidada_at`: cuando la fuente devuelve la MISMA
-- observación que ya teníamos (fin de semana, feriado, BCV sin publicar), no se
-- inserta una fila nueva pero sí se deja constancia de que se comprobó que
-- seguía siendo la última. Sin esta columna, el lunes se bloquearía un cobro
-- perfectamente válido con la tasa publicada el viernes.
-- ============================================================================

alter table public.tasas_cambio
  add column if not exists revalidada_at timestamptz;

comment on column public.tasas_cambio.revalidada_at is
  'Última vez que se comprobó que esta observación seguía siendo la más '
  'reciente de la fuente. No cambia el valor ni la vigencia: solo dice que el '
  'dato está confirmado al día, aunque la fuente no haya publicado nada nuevo.';

-- ----------------------------------------------------------------------------
-- tasa_utilizable — última observación de un tipo, si es lo bastante reciente
-- ----------------------------------------------------------------------------
create or replace function public.tasa_utilizable(p_tipo text)
returns public.tasas_cambio
language sql
stable
set search_path = ''
as $$
  select t.*
  from public.tasas_cambio t
  where t.tipo = p_tipo
    and t.estado = 'vigente'
    and coalesce(t.revalidada_at, t.obtenida_at) > now() - interval '24 hours'
  order by t.obtenida_at desc
  limit 1;
$$;

comment on function public.tasa_utilizable is
  'Tasa vigente de un tipo, solo si se confirmó en las últimas 24 h. Devuelve '
  'vacío si está rancia, para que ninguna operación congele un dato viejo.';

-- ----------------------------------------------------------------------------
-- registrar_cobro_cliente — el cliente pagó su período
-- ----------------------------------------------------------------------------
create or replace function public.registrar_cobro_cliente(
  p_periodo_id  uuid,
  p_monto_ves   numeric default null,   -- null = exactamente el esperado
  p_referencia  text    default null,
  p_ocurrido_at timestamptz default now()
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_periodo   public.periodos_servicio;
  v_bcv       public.tasas_cambio;
  v_paralela  public.tasas_cambio;
  v_esperado  numeric;
  v_monto     numeric;
  v_pago_id   uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede registrar cobros.' using errcode = '42501';
  end if;

  -- Se bloquea el período: dos operadores no pueden cobrarlo a la vez.
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
  if v_periodo.precio_comercial_usd is null then
    raise exception 'El período no tiene precio en USD: edítalo antes de cobrar.';
  end if;

  -- Un cobro revertido deja de contar: el período vuelve a estar pendiente y se
  -- puede volver a cobrar (una devolución seguida de un pago correcto es normal).
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

  -- --- Tasas: se reutilizan las ya congeladas; si no, se toman las vigentes ---
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
    -- La paralela solo da la lectura económica: si falta, el cobro NO se
    -- bloquea (el cliente paga a BCV), pero queda sin valorización económica.
    select * into v_paralela from public.tasa_utilizable('paralela');
  end if;

  -- --- Monto esperado: round_half_up(precio * bcv, 2) ---
  v_esperado := round(v_periodo.precio_comercial_usd * v_bcv.bs_por_usd, 2);
  v_monto := coalesce(p_monto_ves, v_esperado);

  -- No hay abonos: o se cobra completo, o no se registra.
  if v_monto <> v_esperado then
    raise exception
      'El cobro debe ser exactamente % Bs (precio % USD a % Bs/USD). No se registran abonos.',
      v_esperado, v_periodo.precio_comercial_usd, v_bcv.bs_por_usd;
  end if;

  -- --- Se congela el hecho en el período (solo si aún no estaba congelado) ---
  update public.periodos_servicio
  set tasa_bcv_id        = coalesce(tasa_bcv_id, v_bcv.id),
      tasa_paralela_id   = coalesce(tasa_paralela_id, v_paralela.id),
      monto_ves_esperado = coalesce(monto_ves_esperado, v_esperado),
      estado_datos_financieros = 'completo'
  where id = p_periodo_id;

  insert into public.pagos_cliente (
    periodo_servicio_id, tipo, monto_ves, monto_ves_esperado_snapshot,
    tasa_bcv_id, tasa_paralela_id, ocurrido_at, estado, referencia, created_by
  ) values (
    p_periodo_id, 'cobro', v_monto, v_esperado,
    v_bcv.id, v_paralela.id, coalesce(p_ocurrido_at, now()), 'confirmado',
    nullif(btrim(coalesce(p_referencia, '')), ''), auth.uid()
  )
  returning id into v_pago_id;

  insert into public.eventos_auditoria (actor_id, accion, entidad, entidad_id, resultado, metadata)
  values (
    auth.uid(), 'cobro_cliente', 'pagos_cliente', v_pago_id::text, 'ok',
    jsonb_build_object(
      'periodo_id', p_periodo_id,
      'monto_ves', v_monto,
      'bcv', v_bcv.bs_por_usd,
      'paralela', v_paralela.bs_por_usd)
  );

  return v_pago_id;
end;
$$;

comment on function public.registrar_cobro_cliente is
  'Cobra un período completo en Bs a la tasa BCV vigente y congela BCV y '
  'paralela en el período y en el pago. Rechaza abonos y tasas rancias.';

-- ----------------------------------------------------------------------------
-- revertir_cobro_cliente — devolución / error de registro
-- ----------------------------------------------------------------------------
create or replace function public.revertir_cobro_cliente(
  p_pago_id uuid,
  p_motivo  text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_pago     public.pagos_cliente;
  v_reverso_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede revertir cobros.' using errcode = '42501';
  end if;

  select * into v_pago from public.pagos_cliente where id = p_pago_id for update;
  if not found then
    raise exception 'Pago no encontrado.';
  end if;
  if v_pago.tipo <> 'cobro' or v_pago.estado <> 'confirmado' then
    raise exception 'Solo se revierte un cobro confirmado.';
  end if;
  -- Nunca se revierte más de lo cobrado.
  if exists (
    select 1 from public.pagos_cliente
    where pago_original_id = p_pago_id and tipo = 'reverso' and estado = 'confirmado'
  ) then
    raise exception 'Ese cobro ya fue revertido.';
  end if;

  -- El original NO se toca: el historial es inmutable. El reverso es la
  -- contrapartida, con las MISMAS tasas congeladas del cobro que anula.
  insert into public.pagos_cliente (
    periodo_servicio_id, tipo, monto_ves, monto_ves_esperado_snapshot,
    tasa_bcv_id, tasa_paralela_id, ocurrido_at, estado, pago_original_id,
    referencia, created_by
  ) values (
    v_pago.periodo_servicio_id, 'reverso', v_pago.monto_ves,
    v_pago.monto_ves_esperado_snapshot,
    v_pago.tasa_bcv_id, v_pago.tasa_paralela_id, now(), 'confirmado', p_pago_id,
    nullif(btrim(coalesce(p_motivo, '')), ''), auth.uid()
  )
  returning id into v_reverso_id;

  insert into public.eventos_auditoria (actor_id, accion, entidad, entidad_id, resultado, metadata)
  values (
    auth.uid(), 'reverso_cobro_cliente', 'pagos_cliente', v_reverso_id::text, 'ok',
    jsonb_build_object('pago_original_id', p_pago_id, 'monto_ves', v_pago.monto_ves,
                       'motivo', p_motivo)
  );

  return v_reverso_id;
end;
$$;

comment on function public.revertir_cobro_cliente is
  'Contrapartida de un cobro: fila nueva con signo contrario y las mismas tasas '
  'congeladas. No borra el original ni permite revertir dos veces.';

-- ----------------------------------------------------------------------------
-- v_periodos_por_cobrar — la bandeja de trabajo del administrador
-- ----------------------------------------------------------------------------
-- security_invoker: esta vista NO es un gateway. Lleva datos financieros de
-- todos los clientes, así que debe aplicar la RLS de quien pregunta (admin-only)
-- en lugar de los permisos de postgres. Un revendedor no obtiene ni una fila.
create or replace view public.v_periodos_por_cobrar
with (security_invoker = true) as
select
  p.id                      as periodo_id,
  p.suscripcion_id,
  p.tipo_operacion,
  p.fecha_venta,
  p.inicio,
  p.fecha_renovacion,
  p.precio_comercial_usd,
  p.monto_ves_esperado,
  p.estado_datos_financieros,
  s.cliente_id,
  cl.nombre                 as cliente_nombre,
  cl.whatsapp_original      as cliente_whatsapp,
  pl.nombre                 as plataforma_nombre,
  pp.nombre                 as producto_nombre,
  m.nombre                  as modalidad_nombre,
  v.nombre                  as vendedor_nombre
from public.periodos_servicio p
join public.suscripciones s          on s.id = p.suscripcion_id
join public.clientes cl              on cl.id = s.cliente_id
join public.productos_plataforma pp  on pp.id = s.producto_plataforma_id
join public.plataformas pl           on pl.id = pp.plataforma_id
left join public.modalidades m       on m.id = s.modalidad_id
left join public.vendedores v        on v.id = p.vendedor_id
where p.estado = 'vigente'
  -- Un cobro revertido no cuenta: el período vuelve a estar pendiente.
  and not exists (
    select 1 from public.pagos_cliente pc
    where pc.periodo_servicio_id = p.id
      and pc.tipo = 'cobro' and pc.estado = 'confirmado'
      and not exists (
        select 1 from public.pagos_cliente rv
        where rv.pago_original_id = pc.id
          and rv.tipo = 'reverso' and rv.estado = 'confirmado')
  );

comment on view public.v_periodos_por_cobrar is
  'Períodos vigentes sin cobro confirmado. Vencer no implica impago y cobrar no '
  'implica vencer: son dos ejes distintos y esta vista solo mira el dinero.';

-- ============================================================================
-- Permisos
-- ============================================================================
revoke execute on function public.registrar_cobro_cliente(uuid, numeric, text, timestamptz) from public;
grant  execute on function public.registrar_cobro_cliente(uuid, numeric, text, timestamptz) to authenticated;
revoke execute on function public.revertir_cobro_cliente(uuid, text) from public;
grant  execute on function public.revertir_cobro_cliente(uuid, text) to authenticated;
revoke execute on function public.tasa_utilizable(text) from public;
grant  execute on function public.tasa_utilizable(text) to authenticated;

grant select on public.v_periodos_por_cobrar to authenticated;

create index if not exists idx_pagos_cliente_periodo on public.pagos_cliente (periodo_servicio_id);
create index if not exists idx_pagos_cliente_fecha on public.pagos_cliente (ocurrido_at);
