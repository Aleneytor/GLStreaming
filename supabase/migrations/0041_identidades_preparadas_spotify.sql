-- ============================================================================
-- 0041 · Identidades preparadas en cupos libres de Spotify familiar
--
-- Un miembro de Spotify no es un «perfil + PIN»: usa su propio correo y clave.
-- El negocio puede dejar esas credenciales preparadas antes de vender el cupo.
-- Preparar una identidad NO ocupa inventario; la asignación sigue siendo la
-- única fuente de verdad de una venta. Al vender, un trigger enlaza la identidad
-- a la suscripción en la misma transacción y libera la marca de preparación.
-- ============================================================================

alter table public.identidades_spotify
  add column unidad_preparada_id uuid
    references public.unidades_inventario (id) on delete set null;

create unique index idx_identidad_spotify_unidad_preparada
  on public.identidades_spotify (unidad_preparada_id)
  where unidad_preparada_id is not null;

comment on column public.identidades_spotify.unidad_preparada_id is
  'Cupo familiar libre para el que este correo/clave ya está preparado. No '
  'representa venta ni ocupación; se limpia al crear el vínculo de suscripción.';

create or replace function public.preparar_identidad_spotify(
  p_unidad_id          uuid,
  p_login_cifrado      text,
  p_login_fingerprint  text,
  p_contrasena_cifrada text,
  p_tipo_correo        text default 'dominio_gl'
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_identidad_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede preparar identidades Spotify.'
      using errcode = '42501';
  end if;
  if p_login_fingerprint is null or btrim(p_login_fingerprint) = '' then
    raise exception 'Falta el correo de la identidad Spotify.';
  end if;
  if not exists (
    select 1
    from public.unidades_inventario u
    join public.cuentas c on c.id = u.cuenta_id
    join public.coberturas_spotify cs on cs.cuenta_id = c.id and cs.tipo = 'familiar'
    where u.id = p_unidad_id
      and u.archived_at is null
      and c.archived_at is null
  ) then
    raise exception 'El cupo no pertenece a una familia Spotify activa.';
  end if;
  if exists (
    select 1 from public.asignaciones_inventario a
    where a.unidad_id = p_unidad_id and a.fin is null
  ) then
    raise exception 'El cupo ya está vendido; no puede recibir una identidad preparada.';
  end if;

  v_identidad_id := public.identidad_spotify_por_huella(
    p_login_cifrado, p_login_fingerprint, p_contrasena_cifrada, p_tipo_correo
  );

  if exists (
    select 1 from public.vinculos_identidad_spotify v
    where v.identidad_spotify_id = v_identidad_id and v.fin is null
  ) then
    raise exception 'Esa identidad Spotify ya está vinculada a una venta activa.';
  end if;

  -- Si el mismo cupo se vuelve a importar, reemplaza la preparación anterior.
  update public.identidades_spotify
  set unidad_preparada_id = null
  where unidad_preparada_id = p_unidad_id and id <> v_identidad_id;

  update public.identidades_spotify
  set unidad_preparada_id = p_unidad_id,
      login_cifrado = p_login_cifrado,
      contrasena_cifrada = p_contrasena_cifrada,
      tipo_correo = p_tipo_correo,
      estado = 'activa',
      archived_at = null,
      secretos_eliminados_at = null
  where id = v_identidad_id;

  return v_identidad_id;
end;
$$;

create or replace function public.vincular_identidad_preparada_spotify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identidad_id uuid;
begin
  if new.unidad_id is null then return new; end if;

  select i.id into v_identidad_id
  from public.identidades_spotify i
  join public.unidades_inventario u on u.id = i.unidad_preparada_id
  join public.coberturas_spotify cs on cs.cuenta_id = u.cuenta_id and cs.tipo = 'familiar'
  where i.unidad_preparada_id = new.unidad_id
  for update of i;

  if v_identidad_id is null then return new; end if;

  -- Un traslado familiar conserva su identidad actual. No debe consumir otra
  -- identidad que estuviera preparada para una venta nueva en el destino.
  if exists (
    select 1 from public.vinculos_identidad_spotify v
    where v.suscripcion_id = new.suscripcion_id and v.fin is null
  ) then
    raise exception 'Ese cupo tiene otra identidad Spotify preparada; elige un cupo sin reserva técnica.';
  end if;

  insert into public.vinculos_identidad_spotify (
    suscripcion_id, identidad_spotify_id, inicio, created_by
  ) values (
    new.suscripcion_id, v_identidad_id, new.inicio, new.created_by
  );

  update public.identidades_spotify
  set unidad_preparada_id = null
  where id = v_identidad_id;

  return new;
end;
$$;

create trigger trg_asignacion_vincula_identidad_spotify
  after insert on public.asignaciones_inventario
  for each row execute function public.vincular_identidad_preparada_spotify();

revoke execute on function public.preparar_identidad_spotify(uuid, text, text, text, text)
  from public;
grant execute on function public.preparar_identidad_spotify(uuid, text, text, text, text)
  to authenticated;

revoke execute on function public.vincular_identidad_preparada_spotify() from public;

