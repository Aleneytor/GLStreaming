-- ============================================================================
-- 0050 — Control administrativo completo de familias Spotify
-- ----------------------------------------------------------------------------
-- Expone la admisión abierta/bloqueada en el editor y conserva las tres
-- titularidades reales: dominio GL, Gmail/correo propio y correo del cliente.
-- ============================================================================

create or replace function public.actualizar_admision_familia_spotify(
  p_cuenta_id uuid,
  p_estado text,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anterior text;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede cambiar la admisión Spotify.' using errcode = '42501';
  end if;
  if p_estado not in ('abierta', 'bloqueada_por_spotify') then
    raise exception 'Estado de admisión Spotify no válido.';
  end if;

  select estado_admision into v_anterior
  from public.coberturas_spotify
  where cuenta_id = p_cuenta_id and tipo = 'familiar'
  for update;

  if not found then
    raise exception 'La cuenta no es una familia Spotify.';
  end if;

  update public.coberturas_spotify
  set estado_admision = p_estado,
      motivo_bloqueo = case
        when p_estado = 'abierta' then null
        else coalesce(nullif(btrim(coalesce(p_motivo, '')), ''), 'Bloqueo indicado por el administrador')
      end,
      bloqueada_at = case
        when p_estado = 'bloqueada_por_spotify' then coalesce(bloqueada_at, now())
        else null
      end,
      desbloqueada_at = case
        when p_estado = 'abierta' and v_anterior is distinct from 'abierta' then now()
        when p_estado = 'abierta' then desbloqueada_at
        else null
      end
  where cuenta_id = p_cuenta_id and tipo = 'familiar';

  if v_anterior is distinct from p_estado then
    insert into public.eventos_auditoria (
      actor_id, accion, entidad, entidad_id, resultado, metadata
    ) values (
      auth.uid(), 'cambiar_admision_spotify', 'coberturas_spotify',
      p_cuenta_id::text, 'ok',
      jsonb_build_object('estado_anterior', v_anterior, 'estado_nuevo', p_estado)
    );
  end if;
end;
$$;

revoke execute on function public.actualizar_admision_familia_spotify(uuid, text, text)
  from public, anon;
grant execute on function public.actualizar_admision_familia_spotify(uuid, text, text)
  to authenticated;

create or replace function public.editar_acceso_miembro_spotify(
  p_unidad_id           uuid,
  p_suscripcion_id      uuid,
  p_login_cifrado       text,
  p_login_fingerprint   text,
  p_contrasena_cifrada  text,
  p_tipo_correo         text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cliente_id uuid;
  v_vinculo_id uuid;
  v_identidad_anterior_id uuid;
  v_identidad_nueva_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede editar accesos Spotify.' using errcode = '42501';
  end if;
  if p_tipo_correo not in ('dominio_gl', 'gmail_propio', 'correo_cliente') then
    raise exception 'Tipo de correo Spotify no válido.';
  end if;
  if nullif(btrim(coalesce(p_login_fingerprint, '')), '') is null
     or nullif(btrim(coalesce(p_login_cifrado, '')), '') is null
     or nullif(btrim(coalesce(p_contrasena_cifrada, '')), '') is null then
    raise exception 'Indica el correo y la contraseña del miembro Spotify.';
  end if;
  if not exists (
    select 1
    from public.unidades_inventario u
    join public.coberturas_spotify cs
      on cs.cuenta_id = u.cuenta_id and cs.tipo = 'familiar'
    where u.id = p_unidad_id and u.archived_at is null
  ) then
    raise exception 'El cupo no pertenece a una familia Spotify activa.';
  end if;

  if p_suscripcion_id is null then
    if p_tipo_correo = 'correo_cliente' then
      raise exception 'Un correo del cliente solo puede asignarse al registrar o editar su venta.';
    end if;
    return public.preparar_identidad_spotify(
      p_unidad_id, p_login_cifrado, p_login_fingerprint,
      p_contrasena_cifrada, p_tipo_correo
    );
  end if;

  select s.cliente_id into v_cliente_id
  from public.suscripciones s
  join public.asignaciones_inventario a
    on a.suscripcion_id = s.id and a.unidad_id = p_unidad_id and a.fin is null
  where s.id = p_suscripcion_id and s.estado in ('activa', 'pausada')
  for update of s;
  if v_cliente_id is null then
    raise exception 'No existe una venta activa o pausada de ese cliente en el cupo.';
  end if;

  select v.id, v.identidad_spotify_id
  into v_vinculo_id, v_identidad_anterior_id
  from public.vinculos_identidad_spotify v
  where v.suscripcion_id = p_suscripcion_id and v.fin is null
  for update;

  if exists (
    select 1
    from public.identidades_spotify i
    join public.vinculos_identidad_spotify v
      on v.identidad_spotify_id = i.id and v.fin is null
    where i.login_fingerprint = p_login_fingerprint
      and v.suscripcion_id <> p_suscripcion_id
  ) then
    raise exception 'Ese correo Spotify ya está vinculado a otro servicio activo.';
  end if;

  if p_tipo_correo in ('dominio_gl', 'gmail_propio') then
    v_identidad_nueva_id := public.identidad_spotify_por_huella(
      p_login_cifrado, p_login_fingerprint, p_contrasena_cifrada, p_tipo_correo
    );
    update public.identidades_spotify
    set titular_tipo = 'negocio', cliente_titular_id = null,
        tipo_correo = p_tipo_correo, login_cifrado = p_login_cifrado,
        contrasena_cifrada = p_contrasena_cifrada, estado = 'activa',
        reutilizable = true, archived_at = null, secretos_eliminados_at = null
    where id = v_identidad_nueva_id;
  else
    insert into public.identidades_spotify (
      titular_tipo, cliente_titular_id, tipo_correo,
      login_cifrado, login_fingerprint, contrasena_cifrada,
      estado, reutilizable
    ) values (
      'cliente', v_cliente_id, 'correo_cliente',
      p_login_cifrado, p_login_fingerprint, p_contrasena_cifrada,
      'activa', false
    ) returning id into v_identidad_nueva_id;
  end if;

  if v_vinculo_id is not null then
    update public.vinculos_identidad_spotify
    set fin = now(), motivo_fin = 'correccion_admin'
    where id = v_vinculo_id;
  end if;

  insert into public.vinculos_identidad_spotify (
    suscripcion_id, identidad_spotify_id, inicio, created_by
  ) values (p_suscripcion_id, v_identidad_nueva_id, now(), auth.uid());

  if v_identidad_anterior_id is not null
     and v_identidad_anterior_id <> v_identidad_nueva_id
     and exists (
       select 1 from public.identidades_spotify
       where id = v_identidad_anterior_id and tipo_correo = 'correo_cliente'
     ) then
    update public.identidades_spotify
    set estado = 'retirada', login_cifrado = null, contrasena_cifrada = null,
        secretos_eliminados_at = now(), archived_at = now()
    where id = v_identidad_anterior_id;
  end if;

  insert into public.eventos_auditoria (
    actor_id, accion, entidad, entidad_id, resultado, metadata
  ) values (
    auth.uid(), 'editar_acceso_spotify', 'suscripciones', p_suscripcion_id, 'ok',
    jsonb_build_object('unidad_id', p_unidad_id, 'tipo_correo', p_tipo_correo)
  );

  return v_identidad_nueva_id;
end;
$$;
