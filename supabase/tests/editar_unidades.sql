-- ============================================================================
-- Pruebas de `actualizar_unidades` — nombre de perfil y PIN
-- Se ejecuta en una transacción y se revierte.
-- ============================================================================
begin;

insert into auth.users (id, email) values (gen_random_uuid(), 'admin-u@test.local') returning id as admin_id \gset
insert into auth.users (id, email) values (gen_random_uuid(), 'rev-u@test.local')   returning id as rev_id   \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

select id as prod from public.productos_plataforma where codigo = 'netflix' \gset

reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'admin_id', 'role', 'authenticated')::text, true);
set role authenticated;

select public.crear_cuenta_con_unidades(:'prod', 5, 'A', null, 'C', 'hA', 'P', null, null, 'Yo') as cta_a \gset
select public.crear_cuenta_con_unidades(:'prod', 5, 'B', null, 'C2', 'hB', 'P2', null, null, 'Yo') as cta_b \gset

select id as u1 from public.unidades_inventario where cuenta_id = :'cta_a' and numero_slot = 1 \gset
select id as u2 from public.unidades_inventario where cuenta_id = :'cta_a' and numero_slot = 2 \gset
select id as ajena from public.unidades_inventario where cuenta_id = :'cta_b' and numero_slot = 1 \gset

-- 1. Renombrar y poner PIN
select public.actualizar_unidades(
  :'cta_a',
  array[:'u1', :'u2']::uuid[],
  array['Juan', 'Maria']::text[],
  array['PIN_CIF_1', null]::text[]
) as n \gset

select 'Renombra el perfil 1' as prueba,
       (select nombre_visible from public.unidades_inventario where id = :'u1') = 'Juan' as pass
union all select 'Renombra el perfil 2',
       (select nombre_visible from public.unidades_inventario where id = :'u2') = 'Maria'
union all select 'Guarda el PIN cifrado del perfil 1',
       (select pin_cifrado from public.secretos_unidad where unidad_id = :'u1') = 'PIN_CIF_1'
union all select 'El perfil sin PIN no crea secreto',
       (select count(*) from public.secretos_unidad where unidad_id = :'u2') = 0;

-- 2. Cambiar el PIN existente lo reemplaza y marca rotada_at
select public.actualizar_unidades(
  :'cta_a', array[:'u1']::uuid[], array['Juan']::text[], array['PIN_CIF_NUEVO']::text[]);

select 'Reemplaza el PIN anterior' as prueba,
       (select pin_cifrado from public.secretos_unidad where unidad_id = :'u1') = 'PIN_CIF_NUEVO' as pass
union all select 'Marca rotada_at',
       (select rotada_at is not null from public.secretos_unidad where unidad_id = :'u1')
union all select 'No duplica el secreto de la unidad',
       (select count(*) from public.secretos_unidad where unidad_id = :'u1') = 1;

-- 3. PIN vacío (null) no borra el que ya existe
select public.actualizar_unidades(
  :'cta_a', array[:'u1']::uuid[], array['Juan Perez']::text[], array[null]::text[]);
select 'PIN nulo conserva el guardado' as prueba,
       (select pin_cifrado from public.secretos_unidad where unidad_id = :'u1') = 'PIN_CIF_NUEVO' as pass
union all select 'Pero si actualiza el nombre',
       (select nombre_visible from public.unidades_inventario where id = :'u1') = 'Juan Perez';

-- 4. Un nombre vacío es una orden explícita de borrado
select public.actualizar_unidades(
  :'cta_a', array[:'u1']::uuid[], array['   ']::text[], array[null]::text[]);
select 'Nombre vacío limpia nombre_visible' as prueba,
       (select nombre_visible is null from public.unidades_inventario where id = :'u1') as pass
union all select 'Limpiar el nombre no borra el PIN sin pedirlo',
       (select pin_cifrado from public.secretos_unidad where unidad_id = :'u1') = 'PIN_CIF_NUEVO';

-- 5. No se puede editar una unidad de OTRA cuenta
do $$
declare ok boolean := false;
begin
  begin
    perform public.actualizar_unidades(
      (select id from public.cuentas where alias = 'A'),
      array[(select id from public.unidades_inventario
             where cuenta_id = (select id from public.cuentas where alias = 'B')
             and numero_slot = 1)]::uuid[],
      array['intruso']::text[], array[null]::text[]);
  exception when others then ok := true;
  end;
  raise notice 'Rechaza editar una unidad de otra cuenta: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

-- ======================= COMO REVENDEDOR =======================
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'rev_id', 'role', 'authenticated')::text, true);
set role authenticated;

do $$
declare ok boolean := false;
begin
  begin
    perform public.actualizar_unidades(
      (select id from public.cuentas limit 1),
      array[(select id from public.unidades_inventario limit 1)]::uuid[],
      array['hack']::text[], array['X']::text[]);
  exception when others then ok := true;
  end;
  raise notice 'Un revendedor NO puede editar perfiles: %', case when ok then 'PASS' else 'FAIL' end;
end $$;

reset role;
rollback;
