-- ============================================================================
-- 0055 · Spotify familiar reutiliza accesos del negocio al confirmar el retiro
-- ----------------------------------------------------------------------------
-- Al cancelar un miembro de Spotify familiar, la venta se cierra en GL pero el
-- acceso puede seguir perteneciendo al negocio. Si el correo era del dominio GL
-- o un Gmail propio reutilizable, confirmar el retiro debe:
--   1. cerrar el vínculo con la suscripción cancelada,
--   2. devolver ese acceso al mismo cupo como identidad preparada,
--   3. conservar intacta la identidad madre de la familia.
--
-- Solo los correos del cliente deben retirarse destruyendo sus secretos.
-- ============================================================================

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
  v_asignacion public.asignaciones_inventario;
  v_identidad_spotify public.identidades_spotify;
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

  if v_op.asignacion_id is not null then
    select * into v_asignacion
    from public.asignaciones_inventario
    where id = v_op.asignacion_id;
  end if;

  if v_asignacion.unidad_id is not null then
    select i.*
    into v_identidad_spotify
    from public.vinculos_identidad_spotify v
    join public.identidades_spotify i
      on i.id = v.identidad_spotify_id
    join public.unidades_inventario u
      on u.id = v_asignacion.unidad_id
     and u.cuenta_id = v_asignacion.cuenta_id
    join public.coberturas_spotify cs
      on cs.cuenta_id = u.cuenta_id
     and cs.tipo = 'familiar'
    where v.suscripcion_id = v_asignacion.suscripcion_id
      and v.fin is null
    for update of v, i;

    if found then
      update public.vinculos_identidad_spotify
      set fin = now(),
          motivo_fin = coalesce(motivo_fin, 'limpieza_confirmada')
      where suscripcion_id = v_asignacion.suscripcion_id
        and identidad_spotify_id = v_identidad_spotify.id
        and fin is null;

      if v_identidad_spotify.tipo_correo in ('dominio_gl', 'gmail_propio') then
        update public.identidades_spotify
        set unidad_preparada_id = null
        where unidad_preparada_id = v_asignacion.unidad_id
          and id <> v_identidad_spotify.id;

        update public.identidades_spotify
        set unidad_preparada_id = v_asignacion.unidad_id,
            titular_tipo = 'negocio',
            cliente_titular_id = null,
            estado = 'activa',
            reutilizable = true,
            archived_at = null,
            secretos_eliminados_at = null
        where id = v_identidad_spotify.id;
      else
        update public.identidades_spotify
        set unidad_preparada_id = null,
            estado = 'retirada',
            login_cifrado = null,
            contrasena_cifrada = null,
            archived_at = now(),
            secretos_eliminados_at = now()
        where id = v_identidad_spotify.id;
      end if;
    end if;
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
  'Confirma el retiro externo, limpia nombre/PIN residuales y, en Spotify '
  'familiar, recicla accesos reutilizables del negocio al mismo cupo mientras '
  'retira de forma irreversible los correos del cliente.';
