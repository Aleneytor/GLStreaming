-- ============================================================================
-- 0045 · Bloqueo de admisión y venta familiar con identidad Spotify
--
-- `no se puede` es una restricción de toda la familia, no un miembro ficticio.
-- Toda asignación nueva se blinda en PostgreSQL. Para cupos sin identidad
-- preparada, la venta crea y enlaza el correo/clave en la misma transacción.
-- ============================================================================

create or replace function public.validar_admision_spotify_asignacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.unidad_id is not null and exists (
    select 1
    from public.coberturas_spotify cs
    where cs.cuenta_id = new.cuenta_id
      and cs.tipo = 'familiar'
      and cs.estado_admision <> 'abierta'
  ) then
    raise exception 'Spotify bloqueó temporalmente las incorporaciones en esta familia.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validar_admision_spotify_asignacion
  on public.asignaciones_inventario;
create trigger trg_validar_admision_spotify_asignacion
  before insert on public.asignaciones_inventario
  for each row execute function public.validar_admision_spotify_asignacion();

revoke execute on function public.validar_admision_spotify_asignacion() from public;

create or replace function public.vender_miembro_spotify_con_identidad(
  p_cuenta_id           uuid,
  p_unidad_id           uuid,
  p_modalidad_id        uuid,
  p_cliente_nombre      text,
  p_cliente_whatsapp    text,
  p_precio_usd          numeric,
  p_inicio              date,
  p_vendedor_id         uuid,
  p_monto_usd           numeric,
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
  v_suscripcion_id uuid;
  v_cliente_id uuid;
  v_identidad_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede registrar ventas.' using errcode = '42501';
  end if;
  if p_tipo_correo not in ('dominio_gl', 'correo_cliente') then
    raise exception 'Elige si el correo pertenece al dominio GL o al cliente.';
  end if;
  if nullif(btrim(coalesce(p_login_fingerprint, '')), '') is null
     or nullif(btrim(coalesce(p_login_cifrado, '')), '') is null
     or nullif(btrim(coalesce(p_contrasena_cifrada, '')), '') is null then
    raise exception 'Indica el correo y la contraseña del miembro Spotify.';
  end if;
  if not exists (
    select 1 from public.coberturas_spotify cs
    where cs.cuenta_id = p_cuenta_id
      and cs.tipo = 'familiar'
      and cs.estado_admision = 'abierta'
  ) then
    raise exception 'La familia Spotify no está abierta para miembros nuevos.';
  end if;
  if exists (
    select 1
    from public.identidades_spotify i
    join public.vinculos_identidad_spotify v
      on v.identidad_spotify_id = i.id and v.fin is null
    where i.login_fingerprint = p_login_fingerprint
  ) then
    raise exception 'Ese correo Spotify ya está vinculado a otro servicio activo.';
  end if;

  v_suscripcion_id := public.vender_unidad(
    p_cuenta_id => p_cuenta_id,
    p_unidad_id => p_unidad_id,
    p_modalidad_id => p_modalidad_id,
    p_cliente_nombre => p_cliente_nombre,
    p_cliente_whatsapp => p_cliente_whatsapp,
    p_precio_usd => p_precio_usd,
    p_inicio => p_inicio,
    p_vendedor_id => p_vendedor_id,
    p_monto_usd => p_monto_usd
  );

  select s.cliente_id into v_cliente_id
  from public.suscripciones s
  where s.id = v_suscripcion_id;

  if p_tipo_correo = 'dominio_gl' then
    v_identidad_id := public.identidad_spotify_por_huella(
      p_login_cifrado,
      p_login_fingerprint,
      p_contrasena_cifrada,
      'dominio_gl'
    );
  else
    insert into public.identidades_spotify (
      titular_tipo, cliente_titular_id, tipo_correo,
      login_cifrado, login_fingerprint, contrasena_cifrada,
      estado, reutilizable
    ) values (
      'cliente', v_cliente_id, 'correo_cliente',
      p_login_cifrado, p_login_fingerprint, p_contrasena_cifrada,
      'activa', false
    ) returning id into v_identidad_id;
  end if;

  insert into public.vinculos_identidad_spotify (
    suscripcion_id, identidad_spotify_id, inicio, created_by
  ) values (
    v_suscripcion_id, v_identidad_id, coalesce(p_inicio, current_date)::timestamptz,
    auth.uid()
  );

  return v_suscripcion_id;
end;
$$;

revoke execute on function public.vender_miembro_spotify_con_identidad(
  uuid, uuid, uuid, text, text, numeric, date, uuid, numeric, text, text, text, text
) from public, anon;
grant execute on function public.vender_miembro_spotify_con_identidad(
  uuid, uuid, uuid, text, text, numeric, date, uuid, numeric, text, text, text, text
) to authenticated;
