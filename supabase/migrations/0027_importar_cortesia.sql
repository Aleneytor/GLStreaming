-- ============================================================================
-- 0027 — Servicios de cortesía (costo 0) en la importación
-- ----------------------------------------------------------------------------
-- De vez en cuando se entrega un servicio gratis a un familiar o amigo, y se
-- anota para tener el registro. En el Excel el importe aparece como «$ -».
--
-- Antes eso quedaba como «pendiente de cobro» y molestaba en «Por cobrar». Un
-- servicio de cortesía es DISTINTO de uno sin cobrar: su dato financiero está
-- resuelto (es 0), no pendiente. Se marca el período como `completo` con
-- `monto_ves_esperado = 0`, y la bandeja de por cobrar lo excluye.
--
-- Se distingue por el monto que llega: 0 = cortesía (resuelto), null = todavía
-- sin cobrar (pendiente). El importador ya pasa 0 cuando el Excel trae «$ -».
-- ============================================================================

-- La bandeja «Por cobrar» ignora los períodos de cortesía (esperado 0 y ya
-- resueltos): no son deudas, son regalos anotados.
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
  -- Sin un cobro confirmado (un reverso lo deja de nuevo pendiente)...
  and not exists (
    select 1 from public.pagos_cliente pc
    where pc.periodo_servicio_id = p.id
      and pc.tipo = 'cobro' and pc.estado = 'confirmado'
      and not exists (
        select 1 from public.pagos_cliente rv
        where rv.pago_original_id = pc.id
          and rv.tipo = 'reverso' and rv.estado = 'confirmado')
  )
  -- ...y que no sea una cortesía ya resuelta (esperado 0).
  and not (p.estado_datos_financieros = 'completo'
           and coalesce(p.monto_ves_esperado, 0) = 0);

comment on view public.v_periodos_por_cobrar is
  'Períodos vigentes sin cobro confirmado. Excluye las cortesías (esperado 0 y '
  'resueltas): no son deudas. Vencer no implica impago.';

-- ----------------------------------------------------------------------------
-- marcar_cortesia — un período gratis queda resuelto, no pendiente
-- ----------------------------------------------------------------------------
-- Pequeño helper para no duplicar la marca entre las ramas de la importación
-- (y disponible por si se quiere marcar cortesía desde otro flujo).
create or replace function public.marcar_periodo_cortesia(p_periodo_id uuid)
returns void
language sql
set search_path = ''
as $$
  update public.periodos_servicio
  set estado_datos_financieros = 'completo', monto_ves_esperado = 0
  where id = p_periodo_id;
$$;

revoke execute on function public.marcar_periodo_cortesia(uuid) from public;
grant  execute on function public.marcar_periodo_cortesia(uuid) to authenticated;
