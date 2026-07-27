-- Renovación por lote: una fecha de pago, calendarios individuales y costos editables.
begin;

insert into auth.users (id, email)
values (gen_random_uuid(), 'admin-lote@test.local')
returning id as admin_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as prod from public.productos_plataforma where codigo = 'netflix-extra' \gset

insert into public.tasas_cambio (
  tipo, bs_por_usd, fuente, fuente_registro_id,
  observada_fuente_at, revalidada_at, estado
) values (
  'paralela', 50, 'prueba', 'test-lote-paralela', now(), now(), 'vigente'
);

reset role;
select set_config('request.jwt.claims', json_build_object(
  'sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

select public.crear_cuenta_con_unidades(
  p_producto_id => :'prod', p_capacidad => 1, p_alias => 'Lote-A',
  p_login_cifrado => 'a', p_login_fingerprint => 'lote-a',
  p_contrasena_cifrada => 'x', p_proveedor_nombre => 'Proveedor Lote QA'
) as cta_a \gset
select public.crear_cuenta_con_unidades(
  p_producto_id => :'prod', p_capacidad => 1, p_alias => 'Lote-B',
  p_login_cifrado => 'b', p_login_fingerprint => 'lote-b',
  p_contrasena_cifrada => 'x', p_proveedor_nombre => 'Proveedor Lote QA'
) as cta_b \gset

select public.registrar_ciclo_proveedor(:'cta_a', 2.00, '2019-07-29', 29, 'inicial') as ciclo_a \gset
select public.registrar_ciclo_proveedor(:'cta_b', 3.00, '2019-08-03', 3, 'inicial') as ciclo_b \gset

select public.registrar_renovaciones_proveedor_lote(
  jsonb_build_array(
    jsonb_build_object('cuenta_id', :'cta_a', 'costo_usdt', 2.25),
    jsonb_build_object('cuenta_id', :'cta_b', 'costo_usdt', 3.50)
  ),
  '2019-07-27',
  'PAGO-50-EXTRAS'
) as resultado \gset

select 'El lote conserva el pago común del 27/07' as prueba,
       (select count(*)
        from public.pagos_proveedor pp
        join public.ciclos_proveedor cp on cp.id = pp.ciclo_proveedor_id
        where cp.cuenta_id in (:'cta_a', :'cta_b')
          and pp.fecha_pago = '2019-07-27'
          and pp.lote_pago_id = (:'resultado'::jsonb ->> 'lote_id')::uuid) = 2 as pass
union all
select 'La cuenta A empieza en su renovación 29/08, no en la fecha de pago',
       exists (select 1 from public.ciclos_proveedor
               where cuenta_id = :'cta_a' and estado = 'vigente'
                 and inicio = '2019-08-29' and proxima_renovacion = '2019-09-29')
union all
select 'La cuenta B conserva su calendario distinto del 03',
       exists (select 1 from public.ciclos_proveedor
               where cuenta_id = :'cta_b' and estado = 'vigente'
                 and inicio = '2019-09-03' and proxima_renovacion = '2019-10-03')
union all
select 'Los costos editados se guardan por cuenta',
       (select sum(costo_usdt) from public.ciclos_proveedor
        where cuenta_id in (:'cta_a', :'cta_b') and estado = 'vigente') = 5.75
union all
select 'El lote guarda cantidad y total del desembolso',
       exists (select 1 from public.lotes_pago_proveedor
               where id = (:'resultado'::jsonb ->> 'lote_id')::uuid
                 and cantidad_cuentas = 2 and monto_total_usdt = 5.75);

-- No se pueden mezclar contrapartes dentro de un mismo desembolso. La función
-- valida el lote completo antes de crear o reemplazar ningún ciclo.
select public.crear_cuenta_con_unidades(
  p_producto_id => :'prod', p_capacidad => 1, p_alias => 'Lote-Otro',
  p_login_cifrado => 'c', p_login_fingerprint => 'lote-c',
  p_contrasena_cifrada => 'x', p_proveedor_nombre => 'Otro Proveedor Lote QA'
) as cta_c \gset
select public.registrar_ciclo_proveedor(:'cta_c', 4.00, '2019-07-10', 10, 'inicial') as ciclo_c \gset

select set_config('pruebas.lote_cta_a', :'cta_a', true);
select set_config('pruebas.lote_cta_c', :'cta_c', true);

do $$
declare
  v_rechazado boolean := false;
begin
  begin
    perform public.registrar_renovaciones_proveedor_lote(
      jsonb_build_array(
        jsonb_build_object('cuenta_id', current_setting('pruebas.lote_cta_a'), 'costo_usdt', 2.25),
        jsonb_build_object('cuenta_id', current_setting('pruebas.lote_cta_c'), 'costo_usdt', 4.00)
      ),
      '2019-08-01',
      'MEZCLA-INVALIDA'
    );
  exception when others then
    v_rechazado := position('mismo proveedor' in sqlerrm) > 0;
  end;
  raise notice 'Rechaza mezclar proveedores: %', case when v_rechazado then 'PASS' else 'FAIL' end;
end $$;

select 'El rechazo no alteró el ciclo de la otra cuenta' as prueba,
       exists (select 1 from public.ciclos_proveedor
               where id = :'ciclo_c' and estado = 'vigente'
                 and inicio = '2019-07-10' and proxima_renovacion = '2019-08-10') as pass
union all
select 'El rechazo no volvió a renovar la primera cuenta',
       (select count(*) from public.ciclos_proveedor
        where cuenta_id = :'cta_a') = 2;

reset role;
rollback;
