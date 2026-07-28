-- Mantiene coherente el estado operativo de la cuenta y sus cupos. Después de
-- resolver una falla, reactivar la cuenta debe volver a publicar solo los cupos
-- preparados; no debe quedar una cuenta activa con unidades en mantenimiento.

create or replace function public.actualizar_cuenta(
  p_cuenta_id        uuid,
  p_alias            text default null,
  p_proveedor_nombre text default null,
  p_notas            text default null,
  p_estado           text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_proveedor_id uuid;
  v_nombre_prov  text;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede editar cuentas.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.cuentas where id = p_cuenta_id) then
    raise exception 'Cuenta no encontrada.';
  end if;

  if p_estado is not null
     and p_estado not in ('activa', 'mantenimiento', 'suspendida', 'archivada') then
    raise exception 'Estado inválido: %', p_estado;
  end if;

  v_nombre_prov := nullif(btrim(coalesce(p_proveedor_nombre, '')), '');
  if v_nombre_prov is not null then
    select id into v_proveedor_id
    from public.proveedores
    where lower(nombre_o_alias) = lower(v_nombre_prov) and activo
    limit 1;

    if v_proveedor_id is null then
      insert into public.proveedores (tipo, nombre_o_alias)
      values (
        case when lower(v_nombre_prov) = 'yo' then 'propio' else 'tercero' end,
        v_nombre_prov
      )
      returning id into v_proveedor_id;
    end if;
  end if;

  update public.cuentas
  set alias                  = nullif(btrim(coalesce(p_alias, '')), ''),
      notas                  = nullif(btrim(coalesce(p_notas, '')), ''),
      proveedor_operativo_id = v_proveedor_id,
      estado                 = coalesce(p_estado, estado),
      archived_at            = case when p_estado = 'archivada' then now() else archived_at end
  where id = p_cuenta_id;

  if p_estado = 'activa' then
    update public.unidades_inventario
    set estado_operativo = 'habilitada'
    where cuenta_id = p_cuenta_id
      and archived_at is null
      and estado_operativo = 'mantenimiento'
      and estado_preparacion = 'lista';
  elsif p_estado = 'mantenimiento' then
    update public.unidades_inventario
    set estado_operativo = 'mantenimiento'
    where cuenta_id = p_cuenta_id
      and archived_at is null
      and estado_operativo = 'habilitada';
  end if;
end;
$$;

comment on function public.actualizar_cuenta is
  'Edita campos seguros y sincroniza mantenimiento/activación con los cupos preparados.';

-- Sanea cuentas que el administrador ya reactivó después de un traslado.
update public.unidades_inventario u
set estado_operativo = 'habilitada'
from public.cuentas c
where c.id = u.cuenta_id
  and c.estado = 'activa'
  and u.archived_at is null
  and u.estado_operativo = 'mantenimiento'
  and u.estado_preparacion = 'lista'
  and exists (
    select 1
    from public.asignaciones_inventario a
    where a.cuenta_id = c.id and a.motivo_fin = 'traslado_falla'
  );
