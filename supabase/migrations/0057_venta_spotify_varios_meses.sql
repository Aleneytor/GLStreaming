-- ----------------------------------------------------------------------------
-- 0057 — Venta de miembro Spotify por VARIOS meses (cantidad de períodos)
-- ----------------------------------------------------------------------------
-- La venta rápida podía cobrar solo 1 período: el modal no exponía la duración
-- y las funciones de Spotify no propagaban la cantidad de períodos. `vender_unidad`
-- (0053) sí acepta `p_cantidad_periodos` y calcula la renovación a N meses con
-- `fecha_renovacion_cliente(inicio, N)`; aquí se enhebra ese parámetro por las
-- dos funciones de la ruta Spotify-con-identidad, para poder registrar, p. ej.,
-- 2 meses en una sola venta. El precio sigue siendo el TOTAL del paquete.
--
-- No se reescribe 0045/0046 (historial inmutable): se dropean las firmas viejas
-- (13 args) y se recrean con el parámetro nuevo al final (14º, default 1, así la
-- compatibilidad se conserva). Solo cambia la firma y la llamada interna; el
-- resto del cuerpo es idéntico a 0045/0046.
-- ============================================================================

drop function if exists public.vender_miembro_spotify_reemplazando_identidad(
  uuid, uuid, uuid, text, text, numeric, date, uuid, numeric, text, text, text, text
);
drop function if exists public.vender_miembro_spotify_con_identidad(
  uuid, uuid, uuid, text, text, numeric, date, uuid, numeric, text, text, text, text
);

-- ----------------------------------------------------------------------------
-- Núcleo: registra la venta (delegando en vender_unidad) y vincula la identidad.
-- ----------------------------------------------------------------------------
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
  p_tipo_correo         text,
  p_cantidad_periodos   integer default 1
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
    p_cantidad_periodos => p_cantidad_periodos,
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
  uuid, uuid, uuid, text, text, numeric, date, uuid, numeric, text, text, text, text, integer
) from public, anon;
grant execute on function public.vender_miembro_spotify_con_identidad(
  uuid, uuid, uuid, text, text, numeric, date, uuid, numeric, text, text, text, text, integer
) to authenticated;

-- ----------------------------------------------------------------------------
-- Si el modal sustituye una identidad preparada, la desasocia y registra la
-- venta nueva dentro de la misma transacción. Un error restaura ambos cambios.
-- ----------------------------------------------------------------------------
create or replace function public.vender_miembro_spotify_reemplazando_identidad(
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
  p_tipo_correo         text,
  p_cantidad_periodos   integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_suscripcion_id uuid;
  v_identidad_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede registrar ventas.' using errcode = '42501';
  end if;

  update public.identidades_spotify
  set unidad_preparada_id = null
  where unidad_preparada_id = p_unidad_id;

  v_suscripcion_id := public.vender_miembro_spotify_con_identidad(
    p_cuenta_id, p_unidad_id, p_modalidad_id, p_cliente_nombre,
    p_cliente_whatsapp, p_precio_usd, p_inicio, p_vendedor_id, p_monto_usd,
    p_login_cifrado, p_login_fingerprint, p_contrasena_cifrada, p_tipo_correo,
    p_cantidad_periodos
  );

  select v.identidad_spotify_id into v_identidad_id
  from public.vinculos_identidad_spotify v
  where v.suscripcion_id = v_suscripcion_id and v.fin is null;
  update public.identidades_spotify
  set login_cifrado = p_login_cifrado,
      contrasena_cifrada = p_contrasena_cifrada
  where id = v_identidad_id;

  return v_suscripcion_id;
end;
$$;

revoke execute on function public.vender_miembro_spotify_reemplazando_identidad(
  uuid, uuid, uuid, text, text, numeric, date, uuid, numeric, text, text, text, text, integer
) from public, anon;
grant execute on function public.vender_miembro_spotify_reemplazando_identidad(
  uuid, uuid, uuid, text, text, numeric, date, uuid, numeric, text, text, text, text, integer
) to authenticated;
