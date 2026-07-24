-- ============================================================================
-- 0030 — Portal del revendedor (Fase 5): la vista sabe cuándo vence cada venta
-- ----------------------------------------------------------------------------
-- El revendedor solo ve el mundo por `v_mis_ventas_revendedor` (su única
-- ventana, propiedad de postgres, filtrada por su identidad). Para que el
-- portal le sirva de verdad necesita saber CUÁNDO vence cada cliente y poder
-- contactarlo, así que la vista se amplía con:
--   * fecha_renovacion  → el fin del último período vigente (para avisar/renovar);
--   * nota_renovacion    → el recordatorio que dejó el admin, si lo hay;
--   * cliente_whatsapp_original → el teléfono tal cual, para escribirle.
--
-- Las columnas nuevas van AL FINAL: `create or replace view` no permite cambiar
-- las existentes, solo añadir. El revendedor sigue SIN ver stock ni tablas base
-- (DEC-97): la pasarela expone únicamente lo suyo, nada más.
-- ============================================================================

create or replace view public.v_mis_ventas_revendedor as
select
  s.id           as suscripcion_id,
  s.estado,
  s.recontactar_el,
  cl.nombre      as cliente,
  cl.whatsapp_normalizado as cliente_whatsapp,
  pl.nombre      as plataforma,
  pp.nombre      as producto,
  m.nombre       as modalidad,
  a.cuenta_id,
  a.unidad_id,
  -- --- Columnas nuevas (Fase 5) --------------------------------------------
  ult.fecha_renovacion,
  s.nota_renovacion,
  cl.whatsapp_original as cliente_whatsapp_original
from public.suscripciones s
join public.vendedores v            on v.id = s.vendedor_origen_id
join public.clientes cl             on cl.id = s.cliente_id
join public.productos_plataforma pp on pp.id = s.producto_plataforma_id
join public.plataformas pl          on pl.id = pp.plataforma_id
join public.modalidades m           on m.id = s.modalidad_id
left join public.asignaciones_inventario a
       on a.suscripcion_id = s.id and a.fin is null
-- El vencimiento que le importa al revendedor es el del último período vigente.
left join lateral (
  select max(ps.fecha_renovacion) as fecha_renovacion
  from public.periodos_servicio ps
  where ps.suscripcion_id = s.id and ps.estado = 'vigente'
) ult on true
where v.usuario_id = auth.uid();

comment on view public.v_mis_ventas_revendedor is
  'Única ventana del revendedor: SUS ventas (filtradas por auth.uid() vía su '
  'vendedor). No expone stock ni tablas base. Incluye el vencimiento del último '
  'período para que pueda avisar y renovar a sus clientes.';
