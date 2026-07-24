-- ============================================================================
-- 0026 — Borrar cuentas y clientes (corrección de errores de carga)
-- ----------------------------------------------------------------------------
-- Al migrar es normal equivocarse: una cuenta mal pegada, un cliente duplicado.
-- Hacía falta poder DESHACER eso. No es el flujo normal del negocio (el
-- historial es inmutable), sino una herramienta de corrección admin-only.
--
-- Borrar una cuenta arrastra TODO lo que cuelga de ella. El orden respeta las
-- claves foráneas `restrict` (que si no, bloquean el borrado):
--   pagos_cliente → casos_incidencia → suscripciones (cascade a periodos,
--   asignaciones, historial, entregas…) → pagos_proveedor → ciclos_proveedor →
--   cuenta (cascade a unidades, credenciales, secretos, modalidades…).
-- Los gastos/detalles de cierre que referencian la cuenta quedan con la
-- referencia en null (no se borran: son hechos financieros).
-- ============================================================================

create or replace function public.eliminar_cuenta(p_cuenta_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_suscs uuid[];
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede borrar cuentas.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.cuentas where id = p_cuenta_id) then
    raise exception 'Cuenta no encontrada.';
  end if;

  -- Suscripciones que pasaron por esta cuenta (por sus asignaciones).
  select array_agg(distinct a.suscripcion_id) into v_suscs
  from public.asignaciones_inventario a
  where a.cuenta_id = p_cuenta_id;

  if v_suscs is not null then
    -- Pagos del cliente (restrict sobre periodos): fuera primero.
    delete from public.pagos_cliente
    where periodo_servicio_id in (
      select ps.id from public.periodos_servicio ps
      where ps.suscripcion_id = any(v_suscs));

    -- Casos de incidencia de Spotify (restrict sobre suscripción).
    delete from public.casos_incidencia_spotify
    where suscripcion_id = any(v_suscs);

    -- La suscripción arrastra periodos, asignaciones, historial y entregas.
    delete from public.suscripciones where id = any(v_suscs);
  end if;

  -- Ciclos y pagos al proveedor de la cuenta.
  delete from public.pagos_proveedor
  where ciclo_proveedor_id in (
    select id from public.ciclos_proveedor where cuenta_id = p_cuenta_id);
  delete from public.ciclos_proveedor where cuenta_id = p_cuenta_id;

  -- La cuenta arrastra unidades (y sus secretos), credenciales y modalidades.
  delete from public.cuentas where id = p_cuenta_id;

  insert into public.eventos_auditoria (actor_id, accion, entidad, entidad_id, resultado)
  values (auth.uid(), 'eliminar_cuenta', 'cuentas', p_cuenta_id::text, 'ok');
end;
$$;

comment on function public.eliminar_cuenta is
  'Borra una cuenta y todo su historial (ventas, cobros, ciclos). Herramienta '
  'de corrección admin-only; el flujo normal no borra, agrega filas.';

-- ----------------------------------------------------------------------------
-- eliminar_cliente — solo si ya no tiene servicios (borra primero sus cuentas)
-- ----------------------------------------------------------------------------
create or replace function public.eliminar_cliente(p_cliente_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo un administrador puede borrar clientes.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.clientes where id = p_cliente_id) then
    raise exception 'Cliente no encontrado.';
  end if;

  -- Se protege el borrado accidental: un cliente con servicios no se va sin más.
  if exists (select 1 from public.suscripciones where cliente_id = p_cliente_id) then
    raise exception
      'Este cliente tiene servicios registrados. Borra primero esas cuentas/ventas.';
  end if;
  if exists (
    select 1 from public.cuentas where cliente_propietario_id = p_cliente_id
    union all
    select 1 from public.identidades_spotify where cliente_titular_id = p_cliente_id
  ) then
    raise exception 'Este cliente es titular de recursos: no se puede borrar.';
  end if;

  delete from public.clientes where id = p_cliente_id;

  insert into public.eventos_auditoria (actor_id, accion, entidad, entidad_id, resultado)
  values (auth.uid(), 'eliminar_cliente', 'clientes', p_cliente_id::text, 'ok');
end;
$$;

comment on function public.eliminar_cliente is
  'Borra un cliente que ya no tiene servicios. Si los tiene, exige borrar antes '
  'sus cuentas/ventas (evita perder historial por accidente).';

revoke execute on function public.eliminar_cuenta(uuid) from public;
grant  execute on function public.eliminar_cuenta(uuid) to authenticated;
revoke execute on function public.eliminar_cliente(uuid) from public;
grant  execute on function public.eliminar_cliente(uuid) to authenticated;
