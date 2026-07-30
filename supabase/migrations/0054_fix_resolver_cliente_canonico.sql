-- ============================================================================
-- 0054 — Corrige la selección única en resolver_cliente_canonico
-- ----------------------------------------------------------------------------
-- PostgreSQL no implementa min(uuid), así que la primera versión de 0053
-- fallaba al buscar un candidato único por nombre sin teléfono. Esta revisión
-- separa el conteo de la lectura del id.
-- ============================================================================

create or replace function public.resolver_cliente_canonico(
  p_nombre text,
  p_whatsapp text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_nombre text := nullif(btrim(coalesce(p_nombre, '')), '');
  v_whatsapp_original text := nullif(btrim(coalesce(p_whatsapp, '')), '');
  v_whatsapp_normalizado text := nullif(
    regexp_replace(coalesce(p_whatsapp, ''), '[^0-9+]', '', 'g'),
    ''
  );
  v_candidatos integer := 0;
begin
  if v_nombre is null then
    raise exception 'Indica el cliente.';
  end if;

  if v_whatsapp_normalizado is not null then
    select id into v_id
    from public.clientes
    where archived_at is null
      and lower(btrim(nombre)) = lower(v_nombre)
      and whatsapp_normalizado = v_whatsapp_normalizado
    order by created_at
    limit 1;

    if v_id is null then
      select count(*)
      into v_candidatos
      from public.clientes
      where archived_at is null
        and lower(btrim(nombre)) = lower(v_nombre)
        and coalesce(whatsapp_normalizado, '') = '';

      if v_candidatos = 1 then
        select id into v_id
        from public.clientes
        where archived_at is null
          and lower(btrim(nombre)) = lower(v_nombre)
          and coalesce(whatsapp_normalizado, '') = ''
        order by created_at
        limit 1;
      end if;
    end if;
  else
    select count(*)
    into v_candidatos
    from public.clientes
    where archived_at is null
      and lower(btrim(nombre)) = lower(v_nombre)
      and coalesce(whatsapp_normalizado, '') = '';

    if v_candidatos = 1 then
      select id into v_id
      from public.clientes
      where archived_at is null
        and lower(btrim(nombre)) = lower(v_nombre)
        and coalesce(whatsapp_normalizado, '') = ''
      order by created_at
      limit 1;
    end if;
  end if;

  if v_id is null then
    insert into public.clientes (nombre, whatsapp_original, whatsapp_normalizado)
    values (v_nombre, v_whatsapp_original, v_whatsapp_normalizado)
    returning id into v_id;
  else
    update public.clientes
    set whatsapp_original = coalesce(whatsapp_original, v_whatsapp_original),
        whatsapp_normalizado = coalesce(whatsapp_normalizado, v_whatsapp_normalizado)
    where id = v_id;
  end if;

  return v_id;
end;
$$;
