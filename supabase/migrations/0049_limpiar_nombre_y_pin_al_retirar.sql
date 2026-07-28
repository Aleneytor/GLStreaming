-- ============================================================================
-- 0049 — Un retiro confirmado deja el cupo realmente limpio
-- ----------------------------------------------------------------------------
-- Antes, confirmar_limpieza solo habilitaba la unidad: conservaba el nombre y
-- PIN del cliente anterior. Además, actualizar_unidades trataba un nombre vacío
-- como “no cambiar”, por lo que el editor decía Guardado y restauraba el texto.
-- ============================================================================

create or replace function public.actualizar_unidades(
  p_cuenta_id      uuid,
  p_unidad_ids     uuid[],
  p_nombres        text[],
  p_pins_cifrados  text[]
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  i integer;
  v_unidad_id uuid;
  v_nombre text;
  v_pin text;
  v_actualizadas integer := 0;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede editar unidades.' using errcode = '42501';
  end if;

  if p_unidad_ids is null or array_length(p_unidad_ids, 1) is null then
    return 0;
  end if;

  for i in 1..array_length(p_unidad_ids, 1) loop
    v_unidad_id := p_unidad_ids[i];
    v_nombre := nullif(btrim(coalesce(p_nombres[i], '')), '');
    v_pin := p_pins_cifrados[i];

    if not exists (
      select 1
      from public.unidades_inventario
      where id = v_unidad_id and cuenta_id = p_cuenta_id
    ) then
      raise exception 'La unidad % no pertenece a esta cuenta.', v_unidad_id;
    end if;

    -- El campo siempre se aplica: texto vacío significa borrar el nombre.
    update public.unidades_inventario
    set nombre_visible = v_nombre
    where id = v_unidad_id;

    -- PIN nulo sigue significando “no cambiar”; el retiro confirmado lo
    -- destruye por separado porque allí sí existe una intención explícita.
    if v_pin is not null then
      insert into public.secretos_unidad (unidad_id, pin_cifrado, rotada_at)
      values (v_unidad_id, v_pin, now())
      on conflict (unidad_id) do update
        set pin_cifrado = excluded.pin_cifrado,
            rotada_at = now();
    end if;

    v_actualizadas := v_actualizadas + 1;
  end loop;

  return v_actualizadas;
end;
$$;

comment on function public.actualizar_unidades(uuid, uuid[], text[], text[]) is
  'Edita nombres y PIN cifrado. Un nombre vacío borra nombre_visible; un PIN '
  'nulo conserva el existente.';

create or replace function public.confirmar_limpieza(
  p_operacion_id uuid,
  p_evidencia    text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_op public.operaciones_remotas;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede confirmar la limpieza.' using errcode = '42501';
  end if;

  select * into v_op
  from public.operaciones_remotas
  where id = p_operacion_id
  for update;

  if not found then
    raise exception 'Operación no encontrada.';
  end if;
  if v_op.estado = 'confirmada' then
    return;
  end if;

  update public.operaciones_remotas
  set estado = 'confirmada',
      estado_revocacion = 'cumplida',
      finalizada_por_id = auth.uid(),
      finalizada_at = now(),
      evidencia_no_sensible = p_evidencia
  where id = p_operacion_id;

  if v_op.unidad_id is not null then
    delete from public.secretos_unidad where unidad_id = v_op.unidad_id;
    update public.unidades_inventario
    set estado_preparacion = 'lista',
        nombre_visible = null
    where id = v_op.unidad_id;
  elsif v_op.cuenta_id is not null then
    delete from public.secretos_unidad su
    using public.unidades_inventario u
    where u.id = su.unidad_id
      and u.cuenta_id = v_op.cuenta_id
      and u.estado_preparacion = 'pendiente_limpieza';

    update public.unidades_inventario
    set estado_preparacion = 'lista',
        nombre_visible = null
    where cuenta_id = v_op.cuenta_id
      and estado_preparacion = 'pendiente_limpieza';
  end if;

  if v_op.asignacion_id is not null then
    update public.asignaciones_inventario
    set estado_cierre = 'ninguno'
    where id = v_op.asignacion_id;
  end if;
end;
$$;

comment on function public.confirmar_limpieza(uuid, text) is
  'Confirma el retiro externo, destruye nombre/PIN residuales, habilita el cupo '
  'y cierra la retención de la asignación.';

-- Sanea retiros unitarios ya confirmados que nunca fueron reasignados. En la
-- base previa a esta migración existe una sola fila: Rossy Cohello.
delete from public.secretos_unidad su
using public.operaciones_remotas o, public.unidades_inventario u
where o.unidad_id = u.id
  and su.unidad_id = u.id
  and o.estado = 'confirmada'
  and not exists (
    select 1 from public.asignaciones_inventario a
    where a.unidad_id = u.id and a.fin is null
  );

update public.unidades_inventario u
set nombre_visible = null
from public.operaciones_remotas o
where o.unidad_id = u.id
  and o.estado = 'confirmada'
  and not exists (
    select 1 from public.asignaciones_inventario a
    where a.unidad_id = u.id and a.fin is null
  );
