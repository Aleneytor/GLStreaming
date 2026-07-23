-- ============================================================================
-- 0020 — Una tasa simulada nunca congela una operación
-- ----------------------------------------------------------------------------
-- Al conectar la fuente paralela real (Kuanto) apareció un riesgo que el diseño
-- anterior no cubría: mientras faltaban las credenciales, el adaptador guardaba
-- un valor SIMULADO marcado como tal, y `tasa_utilizable` lo daba por bueno.
-- Un cobro o un gasto podían quedar congelados para siempre con una tasa
-- inventada, que es justo lo que la Fase 4 prometía no hacer nunca
-- (docs/01-alcance-y-reglas.md §7: «nunca se inventa un valor»).
--
-- A partir de aquí, `fuente = 'simulada'` sirve para ver la pantalla y para
-- desarrollar, pero NO para registrar dinero: si la única tasa disponible es
-- simulada, la operación se bloquea con un mensaje claro en vez de guardar un
-- hecho financiero falso.
-- ============================================================================

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
    and coalesce(t.fuente, '') <> 'simulada'
    and coalesce(t.revalidada_at, t.obtenida_at) > now() - interval '24 hours'
  order by t.obtenida_at desc
  limit 1;
$$;

comment on function public.tasa_utilizable is
  'Tasa vigente de un tipo, solo si es REAL y se confirmó en las últimas 24 h. '
  'Devuelve vacío si está rancia o es simulada: ninguna operación debe congelar '
  'un dato inventado.';
