-- ============================================================================
-- 0051 · Intermediarios con base BCV o paralela
-- ----------------------------------------------------------------------------
-- El tipo describe la relación comercial/portal; la base describe cómo paga.
-- Un intermediario sin usuario puede pagar por EUR, Zelle u otra vía valorada
-- a paralela, igual que un revendedor. Venta directa continúa usando BCV.
-- ============================================================================

alter table public.vendedores
  drop constraint if exists vendedores_intermediario_bcv_check;

comment on column public.vendedores.tipo is
  'revendedor = afiliado con portal; intermediario = compra para conocidos sin portal. '
  'El tipo no decide la tasa de cobro.';

comment on column public.vendedores.cobra_en_paralela is
  'Si true, las ventas y renovaciones del vendedor o intermediario usan tasa paralela; '
  'si false usan BCV. Las ventas directas sin vendedor usan BCV.';
