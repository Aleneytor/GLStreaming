-- ============================================================================
-- 0012 — Edición de unidades (nombre de perfil y PIN)
-- ----------------------------------------------------------------------------
-- Completa el CRUD de unidades que pide la Fase 2. El nombre del perfil y el
-- PIN son DOS DE LOS CUATRO datos del paquete de acceso que recibe el cliente
-- (correo, contraseña, nombre de perfil y PIN), así que sin poder editarlos el
-- inventario queda incompleto para vender.
--
-- El PIN llega YA CIFRADO desde la aplicación, igual que las credenciales: la
-- clave nunca entra a Postgres. Se guarda en `secretos_unidad`.
--
-- Se actualizan varias unidades en una sola llamada para que renombrar los
-- perfiles de una cuenta sea atómico.
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

    -- La unidad debe pertenecer a la cuenta indicada (evita editar ajenas).
    if not exists (
      select 1 from public.unidades_inventario
      where id = v_unidad_id and cuenta_id = p_cuenta_id
    ) then
      raise exception 'La unidad % no pertenece a esta cuenta.', v_unidad_id;
    end if;

    if v_nombre is not null then
      update public.unidades_inventario
      set nombre_visible = v_nombre
      where id = v_unidad_id;
    end if;

    -- PIN nulo = no se toca; PIN presente = se guarda cifrado y se marca rotado.
    if v_pin is not null then
      insert into public.secretos_unidad (unidad_id, pin_cifrado, rotada_at)
      values (v_unidad_id, v_pin, now())
      on conflict (unidad_id) do update
        set pin_cifrado = excluded.pin_cifrado,
            rotada_at   = now();
    end if;

    v_actualizadas := v_actualizadas + 1;
  end loop;

  return v_actualizadas;
end;
$$;

comment on function public.actualizar_unidades is
  'Renombra perfiles y guarda sus PIN (ya cifrados por la app) de forma atómica. '
  'Verifica que cada unidad pertenezca a la cuenta indicada.';

revoke execute on function public.actualizar_unidades(uuid, uuid[], text[], text[]) from public;
grant  execute on function public.actualizar_unidades(uuid, uuid[], text[], text[]) to authenticated;
