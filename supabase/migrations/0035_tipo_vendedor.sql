-- ============================================================================
-- 0035 — Distinguir REVENDEDOR de INTERMEDIARIO en `vendedores`
-- ----------------------------------------------------------------------------
-- El dueño distingue dos figuras que hoy viven mezcladas en `vendedores`:
--   · REVENDEDOR: persona afiliada, tendrá usuario y verá SUS clientes por el
--     portal (DEC-97). Ej.: Gabriel Nadales, Roman, NubeDigital. Puede cobrar a
--     tasa PARALELA (marca `cobra_en_paralela`, migración 0034).
--   · INTERMEDIARIO: alguien que le compró varios servicios para sus conocidos.
--     No se le afilia ni se le da usuario, y **siempre se le cobra a BCV** (no es
--     revendedor). Ej.: Gabriel Rosales, Oriana Pereyra, Yuselyn.
--
-- Se agrega `tipo` con vocabulario controlado. Regla de dominio: un
-- intermediario NO puede cobrar a paralela (CHECK), así BCV queda garantizado a
-- nivel de datos, no solo de UI.
--
-- Backfill: quien ya tiene `usuario_id` (cuenta web) se marca `revendedor`; el
-- resto queda `intermediario` por defecto y el dueño reclasifica desde la UI.
-- ============================================================================

alter table public.vendedores
  add column if not exists tipo text not null default 'intermediario';

-- Los que ya tienen usuario web eran revendedores de facto.
update public.vendedores set tipo = 'revendedor' where usuario_id is not null;

-- Coherencia previa al CHECK: un intermediario nunca cobra a paralela.
update public.vendedores set cobra_en_paralela = false where tipo = 'intermediario';

alter table public.vendedores
  drop constraint if exists vendedores_tipo_check;
alter table public.vendedores
  add constraint vendedores_tipo_check check (tipo in ('revendedor', 'intermediario'));

-- Regla de dominio: solo un revendedor puede cobrar a paralela.
alter table public.vendedores
  drop constraint if exists vendedores_intermediario_bcv_check;
alter table public.vendedores
  add constraint vendedores_intermediario_bcv_check
  check (not (tipo = 'intermediario' and cobra_en_paralela));

comment on column public.vendedores.tipo is
  'revendedor = afiliado con usuario/portal, puede cobrar a paralela; '
  'intermediario = compra para conocidos, sin usuario, siempre a BCV.';
