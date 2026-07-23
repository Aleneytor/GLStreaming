-- ============================================================================
-- Suite de pruebas RLS — aislamiento entre perfiles
-- ----------------------------------------------------------------------------
-- Verifica que Row Level Security realmente impide que un revendedor lea lo que
-- no debe. Se ejecuta dentro de una transacción y se revierte al final: no deja
-- datos. Cada prueba imprime una columna `pass` que debe ser `t` (true).
--
-- Modelo (aclarado 23/07/2026): el revendedor NO ve stock disponible; su única
-- ventana es v_mis_ventas_revendedor (sus propias ventas). Las credenciales de
-- esas ventas se entregan por una acción de servidor, no por acceso directo.
--
-- Ejecutar:  docker exec -i <db> psql -U postgres -d postgres < rls.sql
-- El rol `postgres` es superusuario y SALTA RLS; por eso cada fase hace
-- `set role authenticated|anon` para que las políticas apliquen de verdad.
-- ============================================================================
begin;

-- --- Usuarios de prueba (el trigger crea su fila en `usuarios` como revendedor)
insert into auth.users (id, email) values (gen_random_uuid(), 'admin@test.local') returning id as admin_id \gset
insert into auth.users (id, email) values (gen_random_uuid(), 'reva@test.local')  returning id as reva_id  \gset
insert into auth.users (id, email) values (gen_random_uuid(), 'revb@test.local')  returning id as revb_id  \gset

update public.usuarios set rol = 'admin' where id = :'admin_id';

insert into public.vendedores (usuario_id, nombre) values (:'reva_id', 'Vendedor A') returning id as vend_a \gset

-- --- Datos base (insertados como postgres, saltando RLS a propósito)
select id as prod from public.productos_plataforma where codigo = 'netflix' \gset
select id as modperfil from public.modalidades
  where plataforma_id = (select plataforma_id from public.productos_plataforma where id = :'prod')
    and tipo_modalidad = 'perfil' \gset

insert into public.clientes (nombre) values ('Cliente X') returning id as cli \gset
insert into public.cuentas (producto_plataforma_id, capacidad, alias, estado, titular_tipo)
  values (:'prod', 5, 'cta1', 'activa', 'negocio') returning id as cta \gset
insert into public.credenciales_cuenta (cuenta_id, login_cifrado, login_fingerprint)
  values (:'cta', 'CIFRADO', 'fp1');
-- Venta del revendedor A
insert into public.suscripciones (cliente_id, producto_plataforma_id, modalidad_id, vendedor_origen_id)
  values (:'cli', :'prod', :'modperfil', :'vend_a');

-- ======================= FASE: REVENDEDOR A =======================
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'reva_id', 'role', 'authenticated')::text, true);
set role authenticated;

select 'REV_A NO ve cuentas (base)'       as prueba, (select count(*) from public.cuentas) = 0 as pass
union all select 'REV_A NO ve credenciales',        (select count(*) from public.credenciales_cuenta) = 0
union all select 'REV_A NO ve suscripciones base',  (select count(*) from public.suscripciones) = 0
union all select 'REV_A NO ve ciclos_proveedor',    (select count(*) from public.ciclos_proveedor) = 0
union all select 'REV_A ve su venta (vista=1)',     (select count(*) from public.v_mis_ventas_revendedor) = 1;

-- ======================= FASE: REVENDEDOR B =======================
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'revb_id', 'role', 'authenticated')::text, true);
set role authenticated;

select 'REV_B NO ve ventas de A (0)'      as prueba, (select count(*) from public.v_mis_ventas_revendedor) = 0 as pass
union all select 'REV_B NO ve credenciales',        (select count(*) from public.credenciales_cuenta) = 0;

-- ======================= FASE: ANONIMO =======================
-- El anon no recibe privilegios de tabla: leer da "permiso denegado". Tanto eso
-- como "0 filas" cuentan como "no ve" (PASS).
reset role;
select set_config('request.jwt.claims', '', true);
set role anon;

do $$
declare n int; ok boolean;
begin
  begin
    select count(*) into n from public.plataformas;
    ok := (n = 0);
  exception when insufficient_privilege then ok := true;
  end;
  raise notice 'ANON NO ve catalogo: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

do $$
declare n int; ok boolean;
begin
  begin
    select count(*) into n from public.cuentas;
    ok := (n = 0);
  exception when insufficient_privilege then ok := true;
  end;
  raise notice 'ANON NO ve cuentas: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ======================= FASE: ADMIN =======================
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

select 'ADMIN SI ve cuentas (>=1)'        as prueba, (select count(*) from public.cuentas) >= 1 as pass
union all select 'ADMIN SI ve credenciales (>=1)',  (select count(*) from public.credenciales_cuenta) >= 1
union all select 'ADMIN SI ve catalogo (15)',       (select count(*) from public.plataformas) = 15;

reset role;
rollback;
