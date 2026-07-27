-- ============================================================================
-- Pruebas de la base de tasa por revendedor (migración 0034).
-- Un revendedor marcado `cobra_en_paralela` cobra a PARALELA; el resto (y las
-- ventas directas) a BCV. Se ejecuta en transacción y se revierte.
--
-- Tasas de la prueba: BCV = 100, paralela = 50 (valores de laboratorio, no
-- realistas). Con esas tasas, un cobro indicado como $5:
--   · revendedor-paralela → Bs = 5 × 50 = 250, y USD = 250 / 50 = 5
--   · revendedor-BCV / directa → Bs = 5 × 100 = 500, y USD = 500 / 100 = 5
-- Ambos derivan a $5 comercial, pero grabando los bolívares de su propia base.
-- ============================================================================
begin;

insert into auth.users (id, email) values (gen_random_uuid(), 'admin-bt@test.local') returning id as admin_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as prod from public.productos_plataforma where codigo = 'netflix' \gset
select plataforma_id as plat from public.productos_plataforma where id = :'prod' \gset
select id as m_perfil from public.modalidades where plataforma_id = :'plat' and tipo_modalidad = 'perfil' \gset

insert into public.tasas_cambio (tipo, bs_por_usd, fecha_vigencia, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, estado)
values ('bcv', 100, current_date, 'prueba', 'bt-bcv-1', now(), now(), 'vigente') returning id as tasa_bcv \gset
insert into public.tasas_cambio (tipo, bs_por_usd, fuente, fuente_registro_id, observada_fuente_at, revalidada_at, estado)
values ('paralela', 50, 'prueba', 'bt-par-1', now(), now(), 'vigente') returning id as tasa_par \gset

-- Dos revendedores: uno cobra a paralela, otro a BCV.
insert into public.vendedores (nombre, activo, cobra_en_paralela)
values ('Rev Paralela QA', true, true) returning id as rev_par \gset
insert into public.vendedores (nombre, activo, cobra_en_paralela)
values ('Rev BCV QA', true, false) returning id as rev_bcv \gset

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

insert into public.clientes (nombre) values ('Cli Base Tasa QA') returning id as cli \gset
select public.crear_cuenta_con_unidades(:'prod', 5, 'BaseTasa-1', null, 'A', 'ha', 'p', null, null, 'Yo') as cta \gset
select id as u1 from public.unidades_inventario where cuenta_id = :'cta' and numero_slot = 1 \gset
select id as u2 from public.unidades_inventario where cuenta_id = :'cta' and numero_slot = 2 \gset
select id as u3 from public.unidades_inventario where cuenta_id = :'cta' and numero_slot = 3 \gset

-- --- 1. Venta por revendedor-PARALELA, indicada como $5 ---
select public.vender_unidad(
  p_cuenta_id => :'cta', p_unidad_id => :'u1', p_modalidad_id => :'m_perfil',
  p_cliente_id => :'cli', p_vendedor_id => :'rev_par', p_monto_usd => 5
) as susc_par \gset
select id as per_par from public.periodos_servicio where suscripcion_id = :'susc_par' \gset

select 'Revendedor-paralela graba Bs a paralela (5 x 50 = 250)' as prueba,
       (select monto_ves from public.pagos_cliente
        where periodo_servicio_id = :'per_par' and tipo = 'cobro') = 250 as pass
union all select 'Revendedor-paralela: USD comercial = Bs / paralela = 5',
       (select precio_comercial_usd from public.periodos_servicio where id = :'per_par') = 5
union all select 'Congela la paralela usada',
       (select tasa_paralela_id from public.periodos_servicio where id = :'per_par') = :'tasa_par';

-- --- 2. Venta por revendedor-BCV, indicada como $5 ---
select public.vender_unidad(
  p_cuenta_id => :'cta', p_unidad_id => :'u2', p_modalidad_id => :'m_perfil',
  p_cliente_id => :'cli', p_vendedor_id => :'rev_bcv', p_monto_usd => 5
) as susc_bcv \gset
select id as per_bcv from public.periodos_servicio where suscripcion_id = :'susc_bcv' \gset

select 'Revendedor-BCV graba Bs a BCV (5 x 100 = 500)' as prueba,
       (select monto_ves from public.pagos_cliente
        where periodo_servicio_id = :'per_bcv' and tipo = 'cobro') = 500 as pass
union all select 'Revendedor-BCV: USD comercial = Bs / BCV = 5',
       (select precio_comercial_usd from public.periodos_servicio where id = :'per_bcv') = 5;

-- --- 3. Venta DIRECTA (sin revendedor), indicada como $5 → BCV ---
select public.vender_unidad(
  p_cuenta_id => :'cta', p_unidad_id => :'u3', p_modalidad_id => :'m_perfil',
  p_cliente_id => :'cli', p_monto_usd => 5
) as susc_dir \gset
select id as per_dir from public.periodos_servicio where suscripcion_id = :'susc_dir' \gset

select 'Venta directa graba Bs a BCV (5 x 100 = 500)' as prueba,
       (select monto_ves from public.pagos_cliente
        where periodo_servicio_id = :'per_dir' and tipo = 'cobro') = 500 as pass
union all select 'Venta directa: USD comercial = Bs / BCV = 5',
       (select precio_comercial_usd from public.periodos_servicio where id = :'per_dir') = 5;

reset role;
rollback;
