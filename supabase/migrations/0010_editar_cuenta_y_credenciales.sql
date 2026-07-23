-- ============================================================================
-- 0010 — Edición de cuenta y rotación de credenciales
-- ----------------------------------------------------------------------------
-- Completa la U del CRUD de cuentas que pide la Fase 2 (docs/05-roadmap.md).
--
-- Lo que SÍ se puede editar: alias, proveedor operativo, notas y estado.
-- Lo que NO: producto y capacidad. El producto es identidad histórica de la
-- cuenta (DEC-50) y cambiar la capacidad desincronizaría las unidades ya
-- creadas; para eso se archiva la cuenta y se crea otra.
--
-- La rotación de credenciales marca `rotada_at`. En la Fase 3, cuando existan
-- entregas de acceso, ese sello permitirá detectar qué entregas quedaron
-- obsoletas y a qué clientes hay que reenviarles los datos nuevos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- actualizar_cuenta — edita los campos seguros de una cuenta
-- ----------------------------------------------------------------------------
create or replace function public.actualizar_cuenta(
  p_cuenta_id        uuid,
  p_alias            text default null,
  p_proveedor_nombre text default null,
  p_notas            text default null,
  p_estado           text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_proveedor_id uuid;
  v_nombre_prov  text;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede editar cuentas.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.cuentas where id = p_cuenta_id) then
    raise exception 'Cuenta no encontrada.';
  end if;

  if p_estado is not null
     and p_estado not in ('activa', 'mantenimiento', 'suspendida', 'archivada') then
    raise exception 'Estado inválido: %', p_estado;
  end if;

  -- Proveedor por nombre: se reutiliza si existe (sin distinguir mayúsculas),
  -- si no se crea. Vaciar el campo desvincula el proveedor.
  v_nombre_prov := nullif(btrim(coalesce(p_proveedor_nombre, '')), '');
  if v_nombre_prov is not null then
    select id into v_proveedor_id
    from public.proveedores
    where lower(nombre_o_alias) = lower(v_nombre_prov) and activo
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

  update public.cuentas
  set alias                  = nullif(btrim(coalesce(p_alias, '')), ''),
      notas                  = nullif(btrim(coalesce(p_notas, '')), ''),
      proveedor_operativo_id = v_proveedor_id,
      estado                 = coalesce(p_estado, estado),
      archived_at            = case when p_estado = 'archivada' then now() else archived_at end
  where id = p_cuenta_id;
end;
$$;

comment on function public.actualizar_cuenta is
  'Edita alias, proveedor (por nombre), notas y estado. Producto y capacidad '
  'son inmutables: son identidad histórica de la cuenta.';

-- ----------------------------------------------------------------------------
-- rotar_credenciales_cuenta — cambia correo y/o contraseña de la cuenta madre
-- ----------------------------------------------------------------------------
create or replace function public.rotar_credenciales_cuenta(
  p_cuenta_id          uuid,
  p_login_cifrado      text default null,
  p_login_fingerprint  text default null,
  p_contrasena_cifrada text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_plataforma_id uuid;
  v_existe boolean;
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede rotar credenciales.' using errcode = '42501';
  end if;

  if p_login_cifrado is null and p_contrasena_cifrada is null then
    raise exception 'No hay nada que cambiar.';
  end if;

  select pp.plataforma_id into v_plataforma_id
  from public.cuentas c
  join public.productos_plataforma pp on pp.id = c.producto_plataforma_id
  where c.id = p_cuenta_id;

  if v_plataforma_id is null then
    raise exception 'Cuenta no encontrada.';
  end if;

  -- El correo nuevo no puede chocar con OTRA cuenta de la misma plataforma.
  if p_login_fingerprint is not null and exists (
    select 1
    from public.credenciales_cuenta cc
    join public.cuentas c               on c.id = cc.cuenta_id
    join public.productos_plataforma pp on pp.id = c.producto_plataforma_id
    where cc.login_fingerprint = p_login_fingerprint
      and pp.plataforma_id = v_plataforma_id
      and cc.cuenta_id <> p_cuenta_id
      and cc.eliminada_at is null
  ) then
    raise exception 'Otra cuenta de esta plataforma ya usa ese correo.';
  end if;

  select exists (select 1 from public.credenciales_cuenta where cuenta_id = p_cuenta_id)
  into v_existe;

  if v_existe then
    update public.credenciales_cuenta
    set login_cifrado      = coalesce(p_login_cifrado, login_cifrado),
        login_fingerprint  = coalesce(p_login_fingerprint, login_fingerprint),
        contrasena_cifrada = coalesce(p_contrasena_cifrada, contrasena_cifrada),
        rotada_at          = now()
    where cuenta_id = p_cuenta_id;
  else
    insert into public.credenciales_cuenta (
      cuenta_id, login_cifrado, login_fingerprint, contrasena_cifrada, rotada_at
    ) values (
      p_cuenta_id, p_login_cifrado, p_login_fingerprint, p_contrasena_cifrada, now()
    );
  end if;
end;
$$;

comment on function public.rotar_credenciales_cuenta is
  'Cambia correo y/o contraseña de la cuenta madre. Marca `rotada_at` para que '
  'la Fase 3 pueda detectar entregas obsoletas y reenviar a clientes activos.';

revoke execute on function public.actualizar_cuenta(uuid, text, text, text, text) from public;
grant  execute on function public.actualizar_cuenta(uuid, text, text, text, text) to authenticated;
revoke execute on function public.rotar_credenciales_cuenta(uuid, text, text, text) from public;
grant  execute on function public.rotar_credenciales_cuenta(uuid, text, text, text) to authenticated;
