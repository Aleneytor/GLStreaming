-- ============================================================================
-- 0038 — Borrar varias cuentas de una (corrección de cargas masivas)
-- ----------------------------------------------------------------------------
-- Al importar es fácil pegar toda una plataforma por error (p. ej. Disney+).
-- Borrarlas una a una es tedioso. Esta función recibe una lista de cuentas y
-- reutiliza `eliminar_cuenta` para cada una, dentro de UNA sola transacción: o
-- se borran todas, o ninguna. Admin-only, como el borrado individual.
-- ============================================================================

create or replace function public.eliminar_cuentas(p_cuenta_ids uuid[])
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_n  integer := 0;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede borrar cuentas.' using errcode = '42501';
  end if;

  if p_cuenta_ids is null or array_length(p_cuenta_ids, 1) is null then
    raise exception 'No se indicaron cuentas para borrar.';
  end if;

  -- `eliminar_cuenta` valida cada id y arrastra todo su historial. Al correr
  -- dentro de esta función, todo el lote comparte una sola transacción.
  foreach v_id in array p_cuenta_ids loop
    perform public.eliminar_cuenta(v_id);
    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

comment on function public.eliminar_cuentas(uuid[]) is
  'Borra varias cuentas (y todo su historial) en una transacción. Reutiliza '
  'eliminar_cuenta. Herramienta de corrección admin-only.';

revoke execute on function public.eliminar_cuentas(uuid[]) from public;
grant  execute on function public.eliminar_cuentas(uuid[]) to authenticated;
