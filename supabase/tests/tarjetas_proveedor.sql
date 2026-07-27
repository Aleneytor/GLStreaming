-- Tarjetas propias cifradas: RLS y ausencia estructural de CVV (0037).
begin;

insert into auth.users (id, email)
values (gen_random_uuid(), 'admin-tarjeta@test.local') returning id as admin_id \gset
insert into auth.users (id, email)
values (gen_random_uuid(), 'rev-tarjeta@test.local') returning id as rev_id \gset
update public.usuarios set rol = 'admin' where id = :'admin_id';

insert into public.proveedores (tipo, nombre_o_alias)
values ('propio', 'Tarjeta QA ···1234') returning id as proveedor_id \gset

reset role;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'admin_id', 'role', 'authenticated')::text,
  true
);
set role authenticated;

insert into public.tarjetas_proveedor_cifradas (proveedor_id, datos_cifrados)
values (:'proveedor_id', 'PAYLOAD_AES_GCM_QA');

select 'ADMIN puede guardar y leer la tarjeta cifrada' as prueba,
       (select count(*) from public.tarjetas_proveedor_cifradas
        where proveedor_id = :'proveedor_id') = 1 as pass
union all
select 'La tabla no tiene columna CVV',
       not exists (
         select 1 from information_schema.columns
         where table_schema = 'public'
           and table_name = 'tarjetas_proveedor_cifradas'
           and column_name ilike '%cvv%'
       );

reset role;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', :'rev_id', 'role', 'authenticated')::text,
  true
);
set role authenticated;

select 'REVENDEDOR no puede leer tarjetas cifradas' as prueba,
       (select count(*) from public.tarjetas_proveedor_cifradas) = 0 as pass;

reset role;
rollback;
