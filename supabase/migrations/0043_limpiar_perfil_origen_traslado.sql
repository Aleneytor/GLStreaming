-- Al trasladar por falla, el nombre operativo viaja al destino y debe
-- desaparecer del cupo anterior. La asignación histórica conserva el vínculo.

create or replace function public.limpiar_nombre_origen_traslado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.fin is null
     and new.fin is not null
     and new.motivo_fin = 'traslado_falla'
     and new.unidad_id is not null then
    update public.unidades_inventario
    set nombre_visible = null
    where id = new.unidad_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limpiar_nombre_origen_traslado
  on public.asignaciones_inventario;
create trigger trg_limpiar_nombre_origen_traslado
after update of fin, motivo_fin on public.asignaciones_inventario
for each row execute function public.limpiar_nombre_origen_traslado();

-- Sanea traslados efectuados antes de este arreglo. Solo toca el cupo origen
-- de una asignación cerrada por traslado que no tenga otra asignación abierta.
update public.unidades_inventario u
set nombre_visible = null
where u.nombre_visible is not null
  and exists (
    select 1
    from public.asignaciones_inventario a
    where a.unidad_id = u.id
      and a.fin is not null
      and a.motivo_fin = 'traslado_falla'
  )
  and not exists (
    select 1
    from public.asignaciones_inventario vigente
    where vigente.unidad_id = u.id
      and vigente.fin is null
  );

comment on function public.limpiar_nombre_origen_traslado() is
  'Limpia el nombre operativo del cupo origen al cerrarlo por traslado de falla.';
