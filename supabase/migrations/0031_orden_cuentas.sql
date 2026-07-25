-- ============================================================================
-- 0031 — Orden manual de las cuentas en el inventario
-- ----------------------------------------------------------------------------
-- El administrador quiere colocar las cuentas a su gusto dentro de cada
-- producto (p. ej. las «completas» al final). Se añade una columna `orden` y
-- una función que sube/baja una cuenta o la manda a un extremo, intercambiando
-- el orden con su vecina dentro del MISMO producto.
--
-- El inventario ordena por `orden` descendente (mayor arriba). Se inicializa
-- con el epoch de `created_at`, así el orden por defecto es el de siempre
-- («más nueva arriba») hasta que el usuario lo cambie.
-- ============================================================================

alter table public.cuentas add column if not exists orden numeric;

update public.cuentas
set orden = extract(epoch from created_at)
where orden is null;

alter table public.cuentas alter column orden set default extract(epoch from now());

-- ----------------------------------------------------------------------------
-- mover_cuenta — sube/baja o manda al inicio/final dentro de su producto
-- ----------------------------------------------------------------------------
create or replace function public.mover_cuenta(p_cuenta_id uuid, p_accion text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_prod  uuid;
  v_orden numeric;
  v_vec_id    uuid;
  v_vec_orden numeric;
  v_extremo   numeric;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede reordenar.' using errcode = '42501';
  end if;

  select producto_plataforma_id, orden into v_prod, v_orden
  from public.cuentas where id = p_cuenta_id;
  if not found then
    raise exception 'Cuenta no encontrada.';
  end if;

  if p_accion = 'subir' then
    -- La vecina justo por encima (el menor orden que aún sea mayor que el mío).
    select id, orden into v_vec_id, v_vec_orden
    from public.cuentas
    where producto_plataforma_id = v_prod and orden > v_orden
    order by orden asc limit 1;
    if found then
      update public.cuentas set orden = v_vec_orden where id = p_cuenta_id;
      update public.cuentas set orden = v_orden where id = v_vec_id;
    end if;

  elsif p_accion = 'bajar' then
    select id, orden into v_vec_id, v_vec_orden
    from public.cuentas
    where producto_plataforma_id = v_prod and orden < v_orden
    order by orden desc limit 1;
    if found then
      update public.cuentas set orden = v_vec_orden where id = p_cuenta_id;
      update public.cuentas set orden = v_orden where id = v_vec_id;
    end if;

  elsif p_accion = 'inicio' then
    -- Arriba del todo: por encima del mayor orden del producto.
    select coalesce(max(orden), 0) + 1 into v_extremo
    from public.cuentas where producto_plataforma_id = v_prod;
    update public.cuentas set orden = v_extremo where id = p_cuenta_id;

  elsif p_accion = 'final' then
    select coalesce(min(orden), 0) - 1 into v_extremo
    from public.cuentas where producto_plataforma_id = v_prod;
    update public.cuentas set orden = v_extremo where id = p_cuenta_id;

  else
    raise exception 'Acción de orden desconocida: %', p_accion;
  end if;
end;
$$;

comment on function public.mover_cuenta is
  'Reordena una cuenta dentro de su producto: subir/bajar (intercambia con la '
  'vecina) o inicio/final (a un extremo). El inventario ordena por `orden` desc.';

revoke execute on function public.mover_cuenta(uuid, text) from public;
grant  execute on function public.mover_cuenta(uuid, text) to authenticated;
