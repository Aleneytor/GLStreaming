-- ============================================================================
-- Pruebas de borrado de cuentas y clientes (corrección de errores de carga).
-- Transacción con rollback: no deja datos.
-- ============================================================================
begin;

insert into auth.users (id, email) values (gen_random_uuid(), 'admin-del@test.local') returning id as admin_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as prod from public.productos_plataforma where codigo = 'netflix' \gset
select plataforma_id as plat from public.productos_plataforma where id = :'prod' \gset
select id as m_perfil from public.modalidades where plataforma_id = :'plat' and tipo_modalidad = 'perfil' \gset

insert into public.tasas_cambio (tipo, bs_por_usd, fecha_vigencia, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, estado)
values ('bcv', 100, current_date, 'prueba', 'del-bcv', now(), now(), 'vigente');
insert into public.tasas_cambio (tipo, bs_por_usd, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, estado)
values ('paralela', 50, 'prueba', 'del-par', now(), now(), 'vigente');

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

-- --- Cuenta con venta, cobro y ciclo de proveedor --------------------------
insert into public.clientes (nombre) values ('Cliente Borrado') returning id as cli \gset
select public.crear_cuenta_con_unidades(:'prod', 5, 'Del-1', null, 'A', 'hdel', 'p', null, null, 'Yo') as cta \gset
select id as u1 from public.unidades_inventario where cuenta_id = :'cta' and numero_slot = 1 \gset

select public.vender_unidad(
  p_cliente_id => :'cli', p_cuenta_id => :'cta', p_modalidad_id => :'m_perfil',
  p_unidad_id => :'u1', p_inicio => '2026-07-01'::date, p_cantidad_periodos => 1,
  p_fecha_venta => '2026-07-01'::date, p_monto_ves => 300
) as susc \gset
select id as periodo from public.periodos_servicio where suscripcion_id = :'susc' \gset
select public.registrar_renovacion_y_pago(:'cta', 2.00, '2026-07-01'::date, null, null, true) as ciclo \gset

select set_config('pruebas.cta', :'cta', true);
select set_config('pruebas.cli', :'cli', true);
select set_config('pruebas.susc', :'susc', true);
select set_config('pruebas.periodo', :'periodo', true);

-- Un cliente con servicios NO se puede borrar.
do $$
declare ok boolean := false;
begin
  begin perform public.eliminar_cliente(current_setting('pruebas.cli')::uuid);
  exception when others then ok := true; end;
  raise notice 'Un cliente con servicios no se borra: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- Se borra la cuenta: debe llevarse venta, cobro, unidades, credenciales y ciclo.
select public.eliminar_cuenta(:'cta') as borrada \gset

select 'La cuenta ya no existe' as prueba,
       not exists (select 1 from public.cuentas where id = current_setting('pruebas.cta')::uuid) as pass
union all select 'No quedan unidades de esa cuenta',
       not exists (select 1 from public.unidades_inventario where cuenta_id = current_setting('pruebas.cta')::uuid)
union all select 'No quedan credenciales de esa cuenta',
       not exists (select 1 from public.credenciales_cuenta where cuenta_id = current_setting('pruebas.cta')::uuid)
union all select 'No queda la suscripcion',
       not exists (select 1 from public.suscripciones where id = current_setting('pruebas.susc')::uuid)
union all select 'No quedan cobros huerfanos del periodo',
       not exists (select 1 from public.pagos_cliente where periodo_servicio_id = current_setting('pruebas.periodo')::uuid)
union all select 'No quedan ciclos de proveedor de esa cuenta',
       not exists (select 1 from public.ciclos_proveedor where cuenta_id = current_setting('pruebas.cta')::uuid);

-- Ya sin servicios, el cliente SÍ se puede borrar.
select public.eliminar_cliente(:'cli') as cli_borrado \gset

select 'El cliente ya sin servicios se borra' as prueba,
       not exists (select 1 from public.clientes where id = current_setting('pruebas.cli')::uuid) as pass;

-- --- Aislamiento: un revendedor no puede borrar ----------------------------
reset role;
insert into auth.users (id, email) values (gen_random_uuid(), 'rev-del@test.local') returning id as rev_id \gset
insert into public.clientes (nombre) values ('Otro') returning id as otro \gset
select set_config('pruebas.otro', :'otro', true);
select set_config('request.jwt.claims', json_build_object('sub', :'rev_id', 'role', 'authenticated')::text, true);
set role authenticated;

do $$
declare ok boolean := false;
begin
  begin perform public.eliminar_cliente(current_setting('pruebas.otro')::uuid);
  exception when others then ok := true; end;
  raise notice 'El revendedor no puede borrar clientes: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

reset role;
rollback;
