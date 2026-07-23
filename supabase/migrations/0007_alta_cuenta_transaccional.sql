-- ============================================================================
-- 0007 — Alta de cuenta como transacción única
-- ----------------------------------------------------------------------------
-- Criterio de salida de la Fase 2: "carga confirmada como transacción única".
-- Esta función crea, todo o nada: la cuenta + sus unidades físicas + las
-- credenciales cifradas. Si algo falla, no queda una cuenta a medio construir.
--
-- Los secretos llegan YA CIFRADOS desde la aplicación (AES-256-GCM,
-- src/lib/crypto.ts): la clave nunca entra a Postgres. La base solo guarda el
-- texto cifrado y la huella HMAC para detectar duplicados.
--
-- SECURITY INVOKER (por defecto): corre con la identidad del llamante, así que
-- las políticas RLS aplican de verdad. Además se comprueba `es_admin()`
-- explícitamente para dar un mensaje claro.
-- ============================================================================

create or replace function public.crear_cuenta_con_unidades(
  p_producto_id        uuid,
  p_capacidad          integer,
  p_alias              text default null,
  p_proveedor_id       uuid default null,
  p_login_cifrado      text default null,
  p_login_fingerprint  text default null,
  p_contrasena_cifrada text default null,
  p_nombres_unidades   text[] default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_producto public.productos_plataforma;
  v_cuenta_id uuid;
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

  -- Un recurso propiedad del cliente (ej. YouTube) no se da de alta por aquí:
  -- va por el flujo de carga de servicio existente, que exige cliente titular.
  if v_producto.titularidad_predeterminada = 'cliente' then
    raise exception
      'El producto % es propiedad del cliente: usa la carga de servicio existente.',
      v_producto.codigo;
  end if;

  -- Capacidad coherente con la regla del producto (DEC-49).
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

  -- Duplicado: mismo login ya cargado en la MISMA plataforma (sin ver el valor).
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

  v_vendible := least(
    coalesce(v_producto.capacidad_vendible_predeterminada, p_capacidad),
    p_capacidad
  );

  insert into public.cuentas (
    producto_plataforma_id, alias, capacidad, capacidad_vendible_habilitada,
    titular_tipo, reutilizable, proveedor_operativo_id, estado
  ) values (
    p_producto_id, nullif(btrim(coalesce(p_alias, '')), ''), p_capacidad, v_vendible,
    v_producto.titularidad_predeterminada, v_producto.reutilizable_predeterminado,
    p_proveedor_id, 'activa'
  )
  returning id into v_cuenta_id;

  -- Estructura física completa: se crean exactamente sus slots.
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
  'Alta atómica de cuenta + unidades + credenciales cifradas. Los secretos '
  'llegan ya cifrados desde la app; la clave nunca vive en Postgres.';

revoke execute on function public.crear_cuenta_con_unidades(
  uuid, integer, text, uuid, text, text, text, text[]) from public;
grant execute on function public.crear_cuenta_con_unidades(
  uuid, integer, text, uuid, text, text, text, text[]) to authenticated;
