-- ============================================================================
-- Pruebas de `registrar_ciclo_proveedor` — costo y día ancla
-- Se ejecuta en una transacción y se revierte.
-- ============================================================================
begin;

insert into auth.users (id, email) values (gen_random_uuid(), 'admin-ciclo@test.local') returning id as admin_id \gset
insert into auth.users (id, email) values (gen_random_uuid(), 'rev-ciclo@test.local')   returning id as rev_id   \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as prod from public.productos_plataforma where codigo = 'netflix' \gset

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

select public.crear_cuenta_con_unidades(
  :'prod', 5, 'Con ciclo', null, 'C1', 'h1', 'P1', null, null, 'Yo'
) as cta \gset

-- 1. Ancla 31 partiendo del 31/01: la próxima cae en 28/02 (2026 no bisiesto)
select public.registrar_ciclo_proveedor(:'cta', 8.50, '2026-01-31'::date, 31, null) as ciclo1 \gset

select 'Costo guardado' as prueba,
       (select costo_usdt from public.ciclos_proveedor where id = :'ciclo1') = 8.50 as pass
union all select 'Ancla 31 ajusta febrero a 28',
       (select proxima_renovacion from public.ciclos_proveedor where id = :'ciclo1') = '2026-02-28'
union all select 'Guarda el ancla original (31), no el 28',
       (select dia_ancla_proveedor from public.ciclos_proveedor where id = :'ciclo1') = 31
union all select 'Congela la capacidad del momento',
       (select capacidad_fisica_snapshot from public.ciclos_proveedor where id = :'ciclo1') = 5;

-- 2. Desde febrero, el ancla se RECUPERA en marzo (31, no 28)
select public.registrar_ciclo_proveedor(:'cta', 8.50, '2026-02-28'::date, 31, null) as ciclo2 \gset
select 'Ancla 31 se recupera en marzo' as prueba,
       (select proxima_renovacion from public.ciclos_proveedor where id = :'ciclo2') = '2026-03-31' as pass;

-- 3. Solo un ciclo vigente por cuenta: el anterior queda reemplazado
select 'Solo queda un ciclo vigente' as prueba,
       (select count(*) from public.ciclos_proveedor
        where cuenta_id = :'cta' and estado = 'vigente') = 1 as pass
union all select 'El anterior queda como reemplazado',
       (select estado from public.ciclos_proveedor where id = :'ciclo1') = 'reemplazado';

-- 4. Año bisiesto: ancla 31 desde 31/01/2024 -> 29/02
select public.registrar_ciclo_proveedor(:'cta', 5, '2024-01-31'::date, 31, null) as ciclo3 \gset
select 'Bisiesto: ajusta a 29/02' as prueba,
       (select proxima_renovacion from public.ciclos_proveedor where id = :'ciclo3') = '2024-02-29' as pass;

-- 5. Costo cero es válido (proveedor propio sin desembolso)
select public.registrar_ciclo_proveedor(:'cta', 0, '2026-05-10'::date, null, null) as ciclo4 \gset
select 'Costo cero es valido' as prueba,
       (select costo_usdt from public.ciclos_proveedor where id = :'ciclo4') = 0 as pass
union all select 'Sin ancla explicita usa el dia del inicio',
       (select dia_ancla_proveedor from public.ciclos_proveedor where id = :'ciclo4') = 10;

-- 6. Rechaza costo negativo
do $$
declare ok boolean := false;
begin
  begin
    perform public.registrar_ciclo_proveedor(
      (select id from public.cuentas limit 1), -1, current_date, null, null);
  exception when others then ok := true;
  end;
  raise notice 'Rechaza costo negativo: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- 7. Una cuenta sin proveedor no puede tener ciclo
select public.crear_cuenta_con_unidades(
  :'prod', 5, 'Sin proveedor', null, 'C2', 'h2', 'P2', null, null, null
) as cta_sin \gset
do $$
declare ok boolean := false;
begin
  begin
    perform public.registrar_ciclo_proveedor(
      (select id from public.cuentas where alias = 'Sin proveedor'), 5, current_date, null, null);
  exception when others then ok := true;
  end;
  raise notice 'Exige proveedor antes de registrar el ciclo: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ======================= COMO REVENDEDOR =======================
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'rev_id', 'role', 'authenticated')::text, true);
set role authenticated;

do $$
declare ok boolean := false;
begin
  begin
    perform public.registrar_ciclo_proveedor(
      (select id from public.cuentas limit 1), 5, current_date, null, null);
  exception when others then ok := true;
  end;
  raise notice 'Un revendedor NO puede registrar ciclos: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

reset role;
rollback;
