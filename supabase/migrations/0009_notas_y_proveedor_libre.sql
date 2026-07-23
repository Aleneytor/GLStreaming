-- ============================================================================
-- 0009 — Notas por cuenta y proveedor por nombre libre
-- ----------------------------------------------------------------------------
-- Aclaración operativa del usuario (23/07/2026): al cargar una cuenta suele
-- anotar cómo pagó (por ejemplo "Yo, con la tarjeta X el día Y"). El proveedor
-- sigue siendo una entidad (los ciclos guardan instantánea de su etiqueta), pero
-- la interfaz debe permitir escribirlo libremente y crearlo al vuelo, y además
-- guardar notas propias por cuenta.
--
-- Regla de seguridad vigente: las notas son texto libre NO SENSIBLE. Nunca deben
-- contener números completos de tarjeta ni códigos de seguridad (ver
-- docs/03-arquitectura-y-seguridad.md, sección de datos de tarjetas).
-- ============================================================================

alter table public.cuentas add column if not exists notas text;

comment on column public.cuentas.notas is
  'Notas libres del administrador (ej. cómo se pagó la cuenta). No sensible: '
  'prohibido anotar PAN completo, vencimiento o CVV.';

-- La firma cambia (se añaden p_notas y p_proveedor_nombre): se reemplaza.
drop function if exists public.crear_cuenta_con_unidades(
  uuid, integer, text, uuid, text, text, text, text[]);

create or replace function public.crear_cuenta_con_unidades(
  p_producto_id        uuid,
  p_capacidad          integer,
  p_alias              text default null,
  p_proveedor_id       uuid default null,
  p_login_cifrado      text default null,
  p_login_fingerprint  text default null,
  p_contrasena_cifrada text default null,
  p_nombres_unidades   text[] default null,
  p_notas              text default null,
  p_proveedor_nombre   text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_producto public.productos_plataforma;
  v_cuenta_id uuid;
  v_proveedor_id uuid;
  v_nombre_prov text;
  v_vendible integer;
  i integer;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede crear cuentas.' using errcode = '42501';
  end if;

  select * into v_producto
  from public.productos_plataforma
  where id = p_producto_id;

  if not found then
    raise exception 'Producto no encontrado.';
  end if;

  if v_producto.titularidad_predeterminada = 'cliente' then
    raise exception
      'El producto % es propiedad del cliente: usa la carga de servicio existente.',
      v_producto.codigo;
  end if;

  if p_capacidad is null or p_capacidad <= 0 then
    raise exception 'La capacidad debe ser mayor que cero.';
  elsif v_producto.regla_capacidad = 'fija'
        and p_capacidad <> v_producto.capacidad_fija then
    raise exception 'El producto % exige capacidad %.',
      v_producto.codigo, v_producto.capacidad_fija;
  elsif v_producto.regla_capacidad = 'rango'
        and (p_capacidad < v_producto.capacidad_min
             or p_capacidad > v_producto.capacidad_max) then
    raise exception 'La capacidad de % debe estar entre % y %.',
      v_producto.codigo, v_producto.capacidad_min, v_producto.capacidad_max;
  end if;

  if p_login_fingerprint is not null and exists (
    select 1
    from public.credenciales_cuenta cc
    join public.cuentas c               on c.id = cc.cuenta_id
    join public.productos_plataforma pp on pp.id = c.producto_plataforma_id
    where cc.login_fingerprint = p_login_fingerprint
      and pp.plataforma_id = v_producto.plataforma_id
      and cc.eliminada_at is null
  ) then
    raise exception 'Ya existe una cuenta de esta plataforma con ese correo.';
  end if;

  -- Proveedor: por id, o por nombre libre (se reutiliza si ya existe, si no se crea).
  v_nombre_prov := nullif(btrim(coalesce(p_proveedor_nombre, '')), '');
  if p_proveedor_id is not null then
    v_proveedor_id := p_proveedor_id;
  elsif v_nombre_prov is not null then
    select id into v_proveedor_id
    from public.proveedores
    where lower(nombre_o_alias) = lower(v_nombre_prov)
      and activo
    limit 1;

    if v_proveedor_id is null then
      insert into public.proveedores (tipo, nombre_o_alias)
      values (
        case when lower(v_nombre_prov) = 'yo' then 'propio' else 'tercero' end,
        v_nombre_prov
      )
      returning id into v_proveedor_id;
    end if;
  end if;

  v_vendible := least(
    coalesce(v_producto.capacidad_vendible_predeterminada, p_capacidad),
    p_capacidad
  );

  insert into public.cuentas (
    producto_plataforma_id, alias, capacidad, capacidad_vendible_habilitada,
    titular_tipo, reutilizable, proveedor_operativo_id, estado, notas
  ) values (
    p_producto_id, nullif(btrim(coalesce(p_alias, '')), ''), p_capacidad, v_vendible,
    v_producto.titularidad_predeterminada, v_producto.reutilizable_predeterminado,
    v_proveedor_id, 'activa', nullif(btrim(coalesce(p_notas, '')), '')
  )
  returning id into v_cuenta_id;

  if v_producto.tipo_inventario = 'cuenta_con_unidades' then
    for i in 1..p_capacidad loop
      insert into public.unidades_inventario (
        cuenta_id, numero_slot, nombre_visible, tipo_unidad
      ) values (
        v_cuenta_id,
        i,
        coalesce(nullif(btrim(coalesce(p_nombres_unidades[i], '')), ''), 'Perfil ' || i),
        v_producto.tipo_unidad_fisica
      );
    end loop;
  end if;

  if p_login_cifrado is not null then
    insert into public.credenciales_cuenta (
      cuenta_id, login_cifrado, login_fingerprint, contrasena_cifrada, titular_tipo
    ) values (
      v_cuenta_id, p_login_cifrado, p_login_fingerprint, p_contrasena_cifrada,
      v_producto.titularidad_predeterminada
    );
  end if;

  return v_cuenta_id;
end;
$$;

comment on function public.crear_cuenta_con_unidades is
  'Alta atómica de cuenta + unidades + credenciales cifradas, con notas libres '
  'y proveedor por nombre (se crea si no existe). Los secretos llegan ya '
  'cifrados desde la app; la clave nunca vive en Postgres.';

revoke execute on function public.crear_cuenta_con_unidades(
  uuid, integer, text, uuid, text, text, text, text[], text, text) from public;
grant execute on function public.crear_cuenta_con_unidades(
  uuid, integer, text, uuid, text, text, text, text[], text, text) to authenticated;
