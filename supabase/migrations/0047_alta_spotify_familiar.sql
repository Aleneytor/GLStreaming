-- ============================================================================
-- 0047 · Alta manual completa de Spotify familiar
--
-- El formulario “Nueva cuenta” debe crear el mismo recurso compuesto que el
-- importador: cuenta, cinco cupos, identidad administradora, cobertura abierta
-- y Gmail pagador opcional. No crea miembros ni ventas.
-- ============================================================================

create or replace function public.crear_familia_spotify(
  p_producto_id              uuid,
  p_capacidad                integer,
  p_alias                    text,
  p_proveedor_nombre         text,
  p_notas                    text,
  p_login_cifrado            text,
  p_login_fingerprint        text,
  p_contrasena_cifrada       text,
  p_gmail_pagador_cifrado    text default null,
  p_gmail_pagador_fingerprint text default null,
  p_origen_gpay              text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cuenta_id uuid;
  v_identidad_madre_id uuid;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede crear familias Spotify.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.productos_plataforma
    where id = p_producto_id and codigo = 'spotify-familiar' and activo
  ) then
    raise exception 'El producto elegido no es Spotify familiar.';
  end if;
  if p_capacidad <> 5 then
    raise exception 'Una familia Spotify debe tener exactamente cinco miembros.';
  end if;
  if p_origen_gpay is not null and p_origen_gpay not in ('gpay_usa', 'gpay_nigeria') then
    raise exception 'Origen de GPay no válido.';
  end if;

  v_cuenta_id := public.crear_cuenta_con_unidades(
    p_producto_id, p_capacidad, p_alias, null,
    p_login_cifrado, p_login_fingerprint, p_contrasena_cifrada,
    null, p_notas, coalesce(nullif(btrim(coalesce(p_proveedor_nombre, '')), ''), 'Yo')
  );
  v_identidad_madre_id := public.identidad_spotify_por_huella(
    p_login_cifrado, p_login_fingerprint, p_contrasena_cifrada, 'dominio_gl'
  );

  insert into public.coberturas_spotify (
    cuenta_id, tipo, identidad_madre_id, estado_admision
  ) values (v_cuenta_id, 'familiar', v_identidad_madre_id, 'abierta');

  if p_gmail_pagador_fingerprint is not null then
    insert into public.controles_pago_spotify (
      cobertura_cuenta_id, gmail_cifrado, gmail_fingerprint, origen
    ) values (
      v_cuenta_id, p_gmail_pagador_cifrado,
      p_gmail_pagador_fingerprint, coalesce(p_origen_gpay, 'gpay_usa')
    );
  end if;

  return v_cuenta_id;
end;
$$;

revoke execute on function public.crear_familia_spotify(
  uuid, integer, text, text, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.crear_familia_spotify(
  uuid, integer, text, text, text, text, text, text, text, text, text
) to authenticated;
