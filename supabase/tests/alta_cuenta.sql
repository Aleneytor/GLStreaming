-- ============================================================================
-- Pruebas de `crear_cuenta_con_unidades` — atomicidad y reglas de negocio
-- ----------------------------------------------------------------------------
-- Se ejecuta en una transacción y se revierte: no deja datos.
-- Cada prueba imprime PASS/FAIL.
-- ============================================================================
begin;

insert into auth.users (id, email) values (gen_random_uuid(), 'admin-alta@test.local') returning id as admin_id \gset
insert into auth.users (id, email) values (gen_random_uuid(), 'rev-alta@test.local')   returning id as rev_id   \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as prod_netflix from public.productos_plataforma where codigo = 'netflix' \gset
select id as prod_youtube from public.productos_plataforma where codigo = 'youtube' \gset
select id as prod_spotify from public.productos_plataforma where codigo = 'spotify-individual' \gset

-- ======================= COMO ADMIN =======================
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

-- 1. Alta válida de Netflix: debe crear cuenta + 5 unidades + credencial
select public.crear_cuenta_con_unidades(
  :'prod_netflix', 5, 'Netflix Prueba', null, 'CIF_LOGIN', 'huella-abc', 'CIF_PASS', null
) as cuenta_creada \gset

select 'Alta crea 5 unidades' as prueba,
       (select count(*) from public.unidades_inventario where cuenta_id = :'cuenta_creada') = 5 as pass
union all select 'Alta crea la credencial cifrada',
       (select count(*) from public.credenciales_cuenta where cuenta_id = :'cuenta_creada') = 1
union all select 'La credencial NO guarda texto plano',
       (select login_cifrado from public.credenciales_cuenta where cuenta_id = :'cuenta_creada') = 'CIF_LOGIN';

-- 2. Capacidad incorrecta para un producto de capacidad fija -> debe FALLAR
do $$
declare ok boolean := false;
begin
  begin
    perform public.crear_cuenta_con_unidades(
      (select id from public.productos_plataforma where codigo = 'netflix'), 3, 'mala', null, null, null, null, null);
  exception when others then ok := true;
  end;
  raise notice 'Rechaza capacidad 3 en producto de capacidad fija 5: %',
    case when ok then 'PASS' else 'FAIL' end;
end $$;

-- 3. Producto propiedad del cliente (YouTube) -> debe FALLAR
do $$
declare ok boolean := false;
begin
  begin
    perform public.crear_cuenta_con_unidades(
      (select id from public.productos_plataforma where codigo = 'youtube'), 1, 'yt', null, null, null, null, null);
  exception when others then ok := true;
  end;
  raise notice 'Rechaza alta directa de producto propiedad del cliente: %',
    case when ok then 'PASS' else 'FAIL' end;
end $$;

-- 4. Mismo correo (huella) en la misma plataforma -> debe FALLAR
do $$
declare ok boolean := false;
begin
  begin
    perform public.crear_cuenta_con_unidades(
      (select id from public.productos_plataforma where codigo = 'netflix'), 5, 'dup', null,
      'CIF_LOGIN', 'huella-abc', 'CIF_PASS', null);
  exception when others then ok := true;
  end;
  raise notice 'Rechaza correo duplicado en la misma plataforma: %',
    case when ok then 'PASS' else 'FAIL' end;
end $$;

-- 5. ATOMICIDAD: un fallo no debe dejar cuentas ni unidades a medias.
--    Tras los 3 fallos anteriores, sigue habiendo exactamente 1 cuenta.
select 'Atomicidad: los fallos no dejaron basura' as prueba,
       (select count(*) from public.cuentas) = 1 as pass
union all select 'Atomicidad: sin unidades huerfanas',
       (select count(*) from public.unidades_inventario) = 5;

-- 6. Recurso indivisible (Spotify individual): 0 unidades hijas
select public.crear_cuenta_con_unidades(
  :'prod_spotify', 1, 'Spotify Ind', null, 'CIF2', 'huella-spot', 'CIF2P', null
) as cuenta_spot \gset
select 'Recurso indivisible no crea unidades' as prueba,
       (select count(*) from public.unidades_inventario where cuenta_id = :'cuenta_spot') = 0 as pass;

-- ======================= COMO REVENDEDOR =======================
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'rev_id', 'role', 'authenticated')::text, true);
set role authenticated;

do $$
declare ok boolean := false;
begin
  begin
    perform public.crear_cuenta_con_unidades(
      (select id from public.productos_plataforma where codigo = 'hbo'), 5, 'hack', null, null, null, null, null);
  exception when others then ok := true;
  end;
  raise notice 'Un revendedor NO puede crear cuentas: %',
    case when ok then 'PASS' else 'FAIL' end;
end $$;

reset role;
rollback;
