-- ============================================================================
-- 0061 — Retirar el teléfono del vendedor guardado como WhatsApp del cliente
-- ----------------------------------------------------------------------------
-- Capa: datos (limpieza de la cartera) — complementa el cambio del importador.
--
-- Problema corregido: el importador guardaba el teléfono del vendedor como
-- "referencia comercial provisional" del cliente (whatsapp_original /
-- whatsapp_normalizado) cuando la fila traía un cliente final sin WhatsApp.
-- En /clientes eso hacía que el cliente de un revendedor pareciera cliente
-- propio con el teléfono del revendedor, y el botón de WhatsApp abría un chat
-- con el vendedor (no con el cliente).
--
-- Decisión confirmada por el usuario (2026-08-08): el teléfono del vendedor
-- NUNCA es contacto del cliente. Solo queda como referencia en la
-- configuración del vendedor (vendedores.telefono_*). El importador ya no lo
-- copia (cambio en src/domain/importacion.ts); esta migración limpia lo ya
-- importado.
--
-- Hallazgo de la base real: vendedores.telefono_* está VACÍO en los datos
-- históricos (la importación vieja nunca persistió el teléfono del vendedor).
-- Por eso, antes de limpiar, esta migración RECONSTRUYE el teléfono de cada
-- vendedor desde el patrón de su cartera:
--   1) "espejo": el cliente que se llama igual que el vendedor (venta directa
--      a él mismo) — su teléfono es, con seguridad, el del vendedor.
--   2) si no hay espejo, el número que comparten al menos 2 clientes distintos
--      suyos (la firma típica del fallback antiguo, que copiaba ese número a
--      todos sus clientes).
-- Luego lo devuelve a vendedores.telefono_* (donde siempre debió vivir) y
-- retira el WhatsApp de los clientes cuyo número coincide con el teléfono de
-- un vendedor que les vendió UN servicio Y cuyo nombre difiere del vendedor.
--
-- Se conserva el caso legítimo "cliente = revendedor" (venta directa a él
-- mismo: el teléfono es suyo), porque el discriminador exige que el nombre del
-- cliente difiera del vendedor. Los vendedores sin patrón concluyente quedan
-- intactos (sin teléfono reconstruido y sin limpieza): es la regla conservadora
-- que evita borrar un WhatsApp real de un cliente.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Reconstruir el teléfono de cada vendedor desde la cartera.
-- ---------------------------------------------------------------------------
create temp table telefono_vendedor_reconstruido on commit drop as
with pares as (
  select distinct
    v.id               as vendedor_id,
    v.nombre           as vendedor_nombre,
    c.id               as cliente_id,
    c.nombre           as cliente_nombre,
    c.whatsapp_normalizado as telefono
  from public.vendedores v
  join public.suscripciones s on s.vendedor_origen_id = v.id
  join public.clientes c on c.id = s.cliente_id
  where c.archived_at is null
    and coalesce(c.whatsapp_normalizado, '') <> ''
),
espejo as (
  -- Cliente que se llama igual que el vendedor: su teléfono es el del vendedor.
  select distinct vendedor_id, telefono
  from pares
  where lower(btrim(cliente_nombre)) = lower(btrim(vendedor_nombre))
),
candidatos as (
  select vendedor_id, vendedor_nombre, telefono,
         count(distinct cliente_id) as cuantos
  from pares
  group by vendedor_id, vendedor_nombre, telefono
)
select c.vendedor_id, c.vendedor_nombre, c.telefono
from candidatos c
where c.telefono = (
  -- Por vendedor, elegir un solo número: el espejo primero, luego el más
  -- compartido. El espejo es inequívoco; el compartido exige >= 2 clientes.
  select c2.telefono
  from candidatos c2
  where c2.vendedor_id = c.vendedor_id
  order by
    (exists (select 1 from espejo e where e.vendedor_id = c2.vendedor_id
             and e.telefono = c2.telefono)) desc,
    c2.cuantos desc,
    c2.telefono asc
  limit 1
)
and (
  exists (select 1 from espejo e where e.vendedor_id = c.vendedor_id
          and e.telefono = c.telefono)
  or c.cuantos >= 2
);

-- ---------------------------------------------------------------------------
-- 2) Devolver ese teléfono a la configuración del vendedor.
--    Solo rellena los vendedores que aún no tienen teléfono guardado.
-- ---------------------------------------------------------------------------
update public.vendedores v
set telefono_original = t.telefono,
    telefono_normalizado = t.telefono
from telefono_vendedor_reconstruido t
where t.vendedor_id = v.id
  and coalesce(v.telefono_normalizado, '') = '';

-- ---------------------------------------------------------------------------
-- 3) Retirar el teléfono del vendedor del WhatsApp de sus clientes.
--    El discriminador "nombre del cliente <> nombre del vendedor" preserva la
--    venta directa al propio revendedor.
-- ---------------------------------------------------------------------------
update public.clientes c
set whatsapp_original = null,
    whatsapp_normalizado = null
where c.archived_at is null
  and coalesce(c.whatsapp_normalizado, '') <> ''
  and exists (
    select 1
    from public.suscripciones s
    join telefono_vendedor_reconstruido t
      on t.vendedor_id = s.vendedor_origen_id
    where s.cliente_id = c.id
      and t.telefono = c.whatsapp_normalizado
      and lower(btrim(t.vendedor_nombre)) <> lower(btrim(c.nombre))
  );

commit;
